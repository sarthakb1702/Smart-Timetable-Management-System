# Technical Findings

Prioritized defects and risks. Priorities: **P0** critical (security/data corruption/fundamentally unusable), **P1** high (core workflow/rule broken), **P2** medium, **P3** low.

Verification method is stated per finding. `UNVERIFIED` = static analysis only.

---

## P0 — Critical

### F-01 — Solver crashes on any lab task (`IndexError`)
- **Category:** Scheduling engine / correctness
- **Evidence:** `backend/app/engine/solver.py:372` (`lab_tasks[t_id]["batch"]`), also `:455` and `:487`. `task_id_counter` (`solver.py:198-226`) is global across theory and lab lists, while `lab_tasks` is indexed by list position. `lab_tasks[t_id]` is out of range whenever `len(theory_tasks) > 0` and lab tasks exist.
- **Verified:** YES — synthetic fixture (1 division, 2 batches, 1 course with 2 theory + 2 lab hrs) raised `IndexError: list index out of range` at `solver.py:372`. Theory-only fixture succeeded (3 slots).
- **Impact:** Timetable generation — the product's core feature — is unusable for any department with lab courses.
- **Recommendation:** Build `dict` task lookups keyed by `task_id`, or store the task on the decision-variable key/object instead of re-indexing lists. Then re-test.

### F-02 — Generated timetable cannot be persisted (schema drift: columns + enums)
- **Category:** Integration / DB mismatch / data integrity
- **Evidence:**
  - `backend/app/routers/generation.py:38-54` inserts `academic_term_id`, `slot_source`, `lock_status`.
  - Actual `timetable` columns are `term_id`, `source_type`, and `is_locked BOOLEAN` (`supabase/migrations/20260910000000_init_schema.sql:263-291`).
  - Enum values differ: code `SlotSourceEnum` = `core_course|mdm_slot|elective_slot` (`schemas/timetable.py:38-42`) vs DB `slot_source = regular|mdm|pe` (`init_schema:12`); code `LockStatusEnum` = `unlocked|locked_mdm|locked_pe|manual_locked` (`schemas/timetable.py:44-48`) vs DB `lock_status = draft|locked` (`init_schema:13`); code `SessionTypeEnum` includes `tutorial|mdm|elective` (`schemas/timetable.py:15-20`) vs DB `session_type = theory|lab` (`init_schema:9`).
  - The MDM fixture emitted `session_type=mdm`, `slot_source=mdm_slot`, `lock_status=locked_mdm` (verified) — all invalid for the DB.
- **Verified:** Static + partial runtime (enum output observed). The insert itself was not executed to avoid mutating the DB, but the mismatch is unambiguous.
- **Impact:** Even after F-01 is fixed, generation returns success while the DB write fails (error is caught and appended to the message, `generation.py:66-68`), so the grid never appears. Silent data loss.
- **Recommendation:** Decide one canonical vocabulary; align Pydantic enums to the DB, or change the DB enums. Replace insert payload keys with `term_id`/`source_type`/`is_locked`. Add an integration test asserting a round-trip.

### F-03 — Live Supabase service-role key committed in plaintext
- **Category:** Security / secrets
- **Evidence:** `backend/scripts/reset_passwords.py:5` and `backend/scripts/update_superadmin_email.py:5` embed a `SUPABASE_SERVICE_ROLE_KEY` JWT (RLS-bypassing) plus `SUPABASE_URL`. `.env` files are untracked, so these scripts are the only plaintext source.
- **Verified:** Static (grep). Value intentionally not reproduced.
- **Impact:** Anyone with repo access gains full DB read/write and auth-admin capability.
- **Recommendation:** Rotate the key immediately; move to env; add secret scanning; restrict `service_role` use.

### F-04 — Mass password reset + exposed demo credentials & PII
- **Category:** Security / auth
- **Evidence:** `backend/scripts/reset_passwords.py:9` resets **all** accounts to `Test@123`. `backend/app/routers/auth_dev.py:12,39,50` exposes `GET /api/v1/auth/demo-accounts` returning every active user's `email`, `full_name`, `role`, department, **and a `password` field**, guarded only by `ENVIRONMENT != "production"` (`auth_dev.py:42-47`) where the default is `development` (`config.py:11`). `backend/app/schemas/settings.py:107` default password `password123`; `frontend/.../superadmin/users/page.tsx:248` hardcodes a password.
- **Verified:** Static.
- **Impact:** Credential disclosure, account takeover of every demo account.
- **Recommendation:** Delete/disable the endpoint outside dev explicitly, never return passwords, purge scripts, enforce strong password policy.

---

## P1 — High

### F-05 — Unauthenticated / unauthorized endpoints
- **Evidence:** `backend/app/routers/divisions.py:26,31,45` — no `Depends`; anonymous list/create/delete of divisions. `backend/app/routers/generation.py:14` — no auth; can trigger solver and, with `save_to_db=true`, delete draft rows and insert (`generation.py:56-65`). `backend/app/routers/clash_check.py:10` — no auth.
- **Verified:** Static.
- **Impact:** Data tampering by anonymous callers; generation abuse; information disclosure.
- **Recommendation:** Add `require_roles(...)` deps and dept scoping; bind `generation`/`clash-check` to authenticated roles.

### F-06 — Department-scoping layer defined but never wired
- **Evidence:** `backend/app/core/auth.py:110-153` defines `require_department_access`, `can_access_department`, `role_level`, `get_optional_user`; `Grep` shows zero references elsewhere. Consequent cross-department operations: `courses.py:125-191`, `rooms.py:39-95`, `electives.py:145-200`, `settings.py:357-384`, `timetable.py:76-132`.
- **Verified:** Static.
- **Impact:** HOD / dept-coordinator can read/write other departments; violates PRD §5/§10 and AUTH-008.
- **Recommendation:** Enforce scope server-side on every dept-scoped route (or rely on RLS with a per-request user JWT instead of the service key).

### F-07 — RLS enabled but not policed; service role bypasses it
- **Evidence:** `init_schema.sql:324-348` enables RLS on ~24 tables; `20260910000001_rls_policies.sql` (45 lines) defines only read policies for `users`, `timetable`, `courses`, `rooms` plus one draft-edit policy. `supabase_client.py:21` prefers `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS.
- **Verified:** Static.
- **Impact:** Direct PostgREST/anon access is inconsistently protected; 20+ tables return deny-all to anon (breaking any intended direct client reads) while the backend bypasses RLS entirely. No defense-in-depth.
- **Recommendation:** Define complete RLS policies per DB §10; use a user-scoped client for user requests; keep service role only for background jobs.

### F-08 — DB-backed clash checks silently return nothing
- **Evidence:** `backend/app/engine/validator.py:223-228` selects `academic_term_id` and `lock_status` from `timetable` (columns are `term_id`/`is_locked`). The query throws, is caught (`validator.py:267-269`), and returns `[]`. The Next route `frontend/app/api/timetable/check-clash/route.ts:9-30` queries by `start_time` equality only (misses overlaps, ignores tabs/labs/lunch).
- **Verified:** Static.
- **Impact:** Authoritative clash validation is effectively disabled; drag-and-drop relies on client-side fallback (`DragDropGrid.tsx:196`) or on the frontend passing `existing_slots` in the request.
- **Recommendation:** Fix column names and use the same time-overlap logic as the solver; add tests.

### F-09 — Literal `"now()"` written to timestamp columns
- **Evidence:** `timetable.py:108,145,172` set `updated_at`/`submitted_at`/`reviewed_at` to the Python string `"now()"`. (Auditor applied the same class of fix in `settings.py` this session.)
- **Verified:** Static.
- **Impact:** PostgREST/Postgres will reject or store the literal, corrupting audit timestamps.
- **Recommendation:** Use `datetime.now(timezone.utc).isoformat()` or omit and let a trigger/default handle it.

### F-10 — Program Electives: capacity not enforced and batching absent
- **Evidence:** `electives.py:202-215` upserts a selection with `on_conflict="student_id, term_id"` and **no capacity check**, no transaction/locking. `elective_batches`/`elective_batch_students` tables (`init_schema:219-234`) have **no API**. `electives.py:151` comment: "omitted for brevity"; `:158-200` no ownership checks.
- **Verified:** Static.
- **Impact:** Over-enrollment, race conditions, inconsistent data; PE lab batches (A12) cannot be produced.
- **Recommendation:** Add atomic capacity enforcement (DB function/RPC), enrollment finalisation, and batch formation; enforce ownership.

### F-11 — Generator persistence error is swallowed as success
- **Evidence:** `generation.py:66-68` catches the DB error, appends a note to `result.message`, and still returns `success=True`.
- **Verified:** Static.
- **Impact:** UI reports success with no stored timetable; hard to diagnose.
- **Recommendation:** Return a non-success outcome (or a distinct persistence error field) when persistence fails.

---

## P2 — Medium

### F-12 — Raw exception text returned to clients
- `settings.py:434` (`detail=str(e)` in create_user), `clash_check.py:24`, `auth.py:93`. Information disclosure / injection-surface smell. Recommend generic messages + server-side logging.

### F-13 — MDM slot locking is not implemented server-side
- `mdm.py` has no lock/update endpoint; `mdm_slots.status` never set to `locked`. PRD 4.5/A3 require locking before dept generation. See MDM-S-002.

### F-14 — Academic-term management incomplete
- `settings.py` exposes `GET /settings/academic-terms` (list) but no create/update; divisions require a `term_id` (`init_schema:52`). Blocks onboard-from-scratch. See SET-007.

### F-15 — Batches have no CRUD; `room_course_map`/`faculty_course_map` never used
- No endpoints touch `batches`, `faculty_course_map`, or `room_course_map`. Verified static. Blocks lab scheduling, faculty eligibility (A4), and lab-room compatibility (4.8). See DIV-002, FAC-002, ROOM-002.

### F-16 — Auth/dev router registered twice
- `main.py:51` and `main.py:58` both include `auth_dev_router`; duplicate route registration. Verified static. Low impact but a code smell.

### F-17 — Frontend env var mismatch
- `lib/api.ts` uses `NEXT_PUBLIC_FASTAPI_BACKEND_URL`; `DragDropGrid.tsx:166` and generate pages use `NEXT_PUBLIC_API_URL` (unset) → silently fall back to hardcoded `http://localhost:8000/api/v1`. Verified static.

### F-18 — Client-side-only role gating with unsafe default
- `middleware.ts` checks auth only; `layout.tsx:90` defaults `activeRole` to `superadmin`; `DepartmentContext.tsx:35-36` initialises `isGlobalUser=true`, `userRole='superadmin'` before load. A logged-in low-privilege user can navigate to privileged URLs; nav visibility is the only barrier. Verified static.

### F-19 — Hardcoded/mock data in "live" pages
- `hod/reports/page.tsx` mocked `roomUtilization:85`, `facultyLoad`, `clashingSlots:0`; `dept-tt-coordinator/approve/page.tsx` `SAMPLE_AUDIT_LOGS` with no API; `hod/edit/page.tsx` `INITIAL_DEMO_SLOTS`; generate preflight `SAMPLE_PREFLIGHT_ITEMS`; `student/timetable` hardcodes first division + mock batch. Verified static. Misleads stakeholders into believing features work.

### F-20 — HOD/dept pages are byte-identical duplicates
- `hod/{courses,electives,resources,generate}` duplicate `dept-tt-coordinator/*`. Verified static. Maintainability risk / drifting fixes.

### F-21 — `NODE_TLS_REJECT_UNAUTHORIZED=0` in dev script
- `frontend/package.json:6`. Disables TLS verification globally for the dev server. Recommend removing.

### F-22 — Malformed `.gitignore`
- Line 1 contains the literal PowerShell `Set-Content -Path .gitignore -Value @"`; line 40 is `"@`. Accidentally partially functional. Recommend rewriting.

### F-23 — Stray root `package.json`
- Declares Next 16 / React 19 while `frontend/package.json` pins Next 14.2.3 / React 18. Verified static. Risk of installing wrong toolchain.

---

## P3 — Low

- **F-24** Committed `__pycache__/*.pyc` artifacts and a throwaway `frontend/inspect.js`.
- **F-25** `console.log` debug statements in `middleware.ts:38,66,72`.
- **F-26** Hardcoded "AY 2026-27 • Term 1 (Odd)" and "OR-Tools Solver Online" strings in `layout.tsx:135,263`.
- **F-27** Duplicated Supabase client modules (`frontend/lib/supabase/*` vs `frontend/utils/supabase/*`) with different placeholder fallbacks.
- **F-28** `build-checklist.md` marks **every** item, including explicitly out-of-scope items (A8/A9/A17/A18), as complete — contradicts the brief and reality.
- **F-29** No CI, Docker, or deployment config; `README.md` is a single heading; `pytest` declared but no tests.

---

## Positive observations (to preserve)
- DB schema (`init_schema.sql`) is faithful to the PRD schema, including constraints (`chk_source`, one-current-term, one-college-coordinator) and clash index triad.
- `core/auth.py` correctly verifies the Supabase JWT and resolves role/active status server-side.
- CP-SAT constraint **formulation** for theory sessions is coherent and solves correctly (theory-only fixture OPTIMAL).
- Frontend builds and typechecks cleanly (34 routes).
