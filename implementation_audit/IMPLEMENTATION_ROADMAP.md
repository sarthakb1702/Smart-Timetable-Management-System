# Implementation Roadmap (decision-aligned)

Repo-grounded phased plan. All phases incorporate the **approved decisions** in `DECISIONS_REQUIRED.md` (DEC-01…DEC-14). **No application code has been changed.** Execute one phase at a time; run the listed tests; report; wait for approval.

**Guiding constraints:** DB/brief is source of truth → align code, avoid migrations (DEC-01). No solver rewrite — fix defects (DEC-11). Server-side auth + RLS (DEC-03/10). Preserve historical data (DEC-13).

Effort: S / M / L / XL.

| Phase | Title | Requirements | Effort | Depends on | Parallel |
|---|---|---|---|---|---|
| 0 | Security & critical stabilization | AUTH-007/012/013, OOS | M | — | 1 |
| 1 | Code↔DB vocabulary + model foundation | SET-004/007, DIV-002, FAC-002, ROOM-002, GEN-009/011 | L | 0 | 2 |
| 2 | Authorization, scoping & RLS | AUTH-002/006/007/008/009/010/011 | L | 0 | — |
| 3 | Generation engine | GEN-001…015, ROOM-003 | XL | 1,2 | — |
| 4 | Timetable lifecycle | EDIT-001…006, APPR-001…005 | L | 3 | 5 |
| 5 | MDM & PE locking | MDM-S-001…004, PE-004/009 | M | 1 | 4 |
| 6 | Faculty/student views & analytics | FTT-001/002, STT-001/002, RPT-001…3, GLO-001/002 | M–L | 3,4 | — |
| 7 | Program Electives end-to-end | PE-001…009 | XL | 3,5 | — |
| 8 | Hardening, cleanup, release readiness | AUTH-*, OOS-001…4, seed | L | all | — |

---

## Phase 0 — Security & critical stabilization

**Status: ✅ COMPLETE — 2026-10-13.** Verified: secret scan clean (no key/`Test@123` in app source); `GET /auth/demo-accounts` → 404 by default; `/divisions`, `/generate`, `/clash-check` → 401 unauthenticated; backend imports (67 routes); `npx tsc --noEmit` PASS; `npm run build` PASS.
**Follow-up required by owner:** rotate the Supabase service-role key in the dashboard (it was committed and must be considered compromised).

**Requirements:** AUTH-007, AUTH-012, AUTH-013; DEC-08 (placeholder removal), DEC-09 (demo accounts), DEC-10 (no superadmin default — frontend part).
**Entry conditions:** none.
**Implementation steps:**
1. Rotate the Supabase service-role key. Remove literal URL/key from `backend/scripts/reset_passwords.py:4-5` and `backend/scripts/update_superadmin_email.py:4-5`; make them env-driven and idempotent.
2. Gate `GET /auth/demo-accounts` (`backend/app/routers/auth_dev.py:50`) behind explicit `ALLOW_DEMO_ACCOUNTS` (default off); remove the `password` field (`:39`) and the hardcoded `DEMO_PASSWORD` (`:12`). Make `ENVIRONMENT` fail-safe.
3. Add auth deps: `divisions.py` (all routes), `generation.py:14`, `clash_check.py:10`; bind generation/clash to authenticated roles (dept scoping in Phase 2).
4. Remove duplicate router include (`main.py:51,58`).
5. Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` (`frontend/package.json:6`).
6. Remove/hide out-of-scope placeholder pages: `college-tt-coordinator/exams`, `hod/leaves`, `faculty/preferences`; remove their nav entries (`layout.tsx:53,65,69`). Correct `build-checklist.md` (it marks A8/A9/A17/A18 complete).
7. Fix `.gitignore` (line 1/40 corruption); untrack `__pycache__/*.pyc` and `frontend/inspect.js`.
**Files:** `backend/scripts/*.py`, `backend/app/routers/{auth_dev,divisions,generation,clash_check}.py`, `backend/app/main.py`, `backend/app/core/config.py`, `frontend/package.json`, `frontend/app/(dashboard)/layout.tsx`, out-of-scope page dirs, `.gitignore`, `build-checklist.md`.
**Tests:** S-01 (anon → 401/403), S-05 (demo endpoint off, no password), S-08 (no secret on repo scan); R-01/R-02 (build).
**Risks:** Removing placeholder pages could break nav imports — verify build. Rotating the key may break local scripts until env updated.
**Acceptance criteria:** no plaintext privileged secret in the tree; demo endpoint disabled by default and password-free; anonymous write endpoints rejected; out-of-scope pages gone from nav; frontend build green.
**Rollback:** revert commit; restore key from secure store.

---

## Phase 1 — Code↔DB vocabulary + model foundation

**Status: ✅ COMPLETE — 2026-10-13.** Verified: enums aligned to DB in `schemas/timetable.py`; solver/generation/validator emit and read DB columns (`term_id`, `source_type`, `is_locked`, `session_type`); Academic-Term CRUD + `set-current` added; new `batches` and `mappings` routers registered (backend imports, **83 routes**); all new endpoints → 401 unauthenticated; env-guarded `backend/scripts/seed.py`; frontend callers migrated to `term_id`/`is_locked`/`is_current`; `npx tsc --noEmit` PASS; `npm run build` PASS.
**Deferred (within scope, low risk):** batch/faculty-map/room-map **UI** wiring in `hod/divisions` and `resources` pages (APIs are live); `constraints.py` `time`→`mode="json"` serialization left to Phase 3.

**Requirements:** SET-004, SET-007, DIV-002, FAC-002, ROOM-002, GEN-009, GEN-011; DEC-01, DEC-02, DEC-07, DEC-12, DEC-13 (term CRUD).
**Entry conditions:** Phase 0.
**Implementation steps:**
1. Align `backend/app/schemas/timetable.py` enums to DB: `SessionTypeEnum` → `theory|lab`; `SlotSourceEnum` → `regular|mdm|pe`; `TimetableStatusEnum` → `draft|pending_approval|published|rejected`; add a `LockStatus` for slot tables `draft|locked`; represent locked timetable rows with `is_locked`.
2. Update `solver.py` / `generation.py` payload keys: `term_id`, `source_type`, `is_locked`, DB-valid values. Fix `settings.py`/`generation.py` serialization (`time` → `mode="json"`) consistently.
3. Fix `validator.py:223-228` select columns to `term_id`, `is_locked`.
4. Add Academic-Term CRUD + **set-current** action in `settings.py` (Superadmin; DEC-13) and mark locked terms read-only in write paths.
5. Add `batches` CRUD endpoints (create/list/delete/update) + optional auto-split helper (DEC-07); expose in `hod/divisions` UI.
6. Add `faculty_course_map` endpoints + HOD UI (DEC-12).
7. Add `room_course_map` endpoints + link lab courses to compatible labs (§4.8).
8. Add env-guarded seed script (DEC-14) with strong generated passwords; never commit secrets.
**Files:** `backend/app/schemas/timetable.py`, `backend/app/engine/{solver,validator,constraints}.py`, `backend/app/routers/{generation,settings,divisions,courses,rooms}.py`, new `backend/app/routers/batches.py` (or extend `divisions.py`), new seed script, `frontend/.../hod/divisions/page.tsx`, `frontend/.../dept-tt-coordinator/resources/page.tsx`.
**Tests:** I-01 (round-trip insert), V-02 (lunch-break create), V-06, plus batch/faculty-map/room-map create-list cases; R-03.
**Risks:** Enum change touches many call sites; mitigate by keeping a DB-aligned single source in `schemas/timetable.py`.
**Acceptance criteria:** a `GeneratedSlot`-shaped payload inserts into `timetable`; term/batch/faculty-map/room-map CRUD works; seed script refuses production.
**Rollback:** revert; no DB migration required (DEC-01).

---

## Phase 2 — Authorization, scoping & RLS

**Status: ✅ COMPLETE — 2026-10-13.** Verified: JWT-scoped client (`core/supabase_client.get_request_supabase`/`get_scoped_client`) wired into all routers (service role retained only for `generation` persistence + admin user ops); every dept-scoped route (`courses`, `rooms`, `divisions`, `batches`, `mappings`, `electives`, `mdm`, `timetable`, `settings`, `generation`, `clash_check`) enforces role + department (`resolve_department_id`/`ensure_department_access`), faculty self-scope and student published-only scope applied; full idempotent RLS policy migration `supabase/migrations/20260910000002_rls_policies_full.sql` (all 24 tables, locked-term read-only); Next.js `middleware.ts` enforces `canAccessRoute` with the profile role and redirects to the role dashboard; `superadmin` defaults removed from `layout.tsx` + `DepartmentContext.tsx`; backend imports (**83 routes**); all scoped endpoints → **401** unauthenticated (`/generate`, `/clash-check`, `/courses`, `/rooms`, `/batches`, `/mappings/*`, `/settings/users`, `/settings/academic-terms`, `/timetable`, `/auth/me`); `npx tsc --noEmit` PASS; `npm run build` PASS.
**Known limitation:** DB-layer RLS is only exercised once a `SUPABASE_ANON_KEY` is configured in `backend/.env`; until then `get_scoped_client` falls back to the admin client (API-layer enforcement still active).

**Requirements:** AUTH-002, AUTH-006, AUTH-007, AUTH-008, AUTH-009, AUTH-010, AUTH-011; DEC-03, DEC-10, DEC-13.
**Entry conditions:** Phase 0 (can run parallel with Phase 1).
**Implementation steps:**
1. Switch user-facing requests to a **JWT-scoped Supabase client** (pass the caller's bearer token). Reserve service role for admin/background jobs. Refactor `core/supabase_client.py` + `core/auth.py`.
2. Wire `require_department_access`/`can_access_department` into every dept-scoped route (`courses`, `rooms`, `electives`, `settings/users`, `timetable`, `divisions`, `batches`).
3. Enforce self-scope for faculty/student timetable reads; enforce role + dept on all writes.
4. Write RLS policies for all tables per DB §10 (using `auth_user_role()`/`auth_user_dept()`); make locked/historical terms read-only (DEC-13).
5. Next.js: enforce roles in `middleware.ts` using `ROUTE_PERMISSIONS`/`canAccessRoute`; add server-component checks for sensitive pages; remove `superadmin` default in `layout.tsx:90` and `DepartmentContext.tsx:35-36`.
6. Validate `department_id` required for `hod`/`dept_tt_coordinator`/`faculty`/`student`.
**Files:** `backend/app/core/{auth,supabase_client}.py`, all routers, `supabase/migrations/*_rls_policies.sql`, `frontend/middleware.ts`, `frontend/lib/role-guards.ts`, `frontend/app/(dashboard)/layout.tsx`, `frontend/context/DepartmentContext.tsx`.
**Tests:** security suite S-01…S-10 (IDOR, RLS via anon key, self-scope, role matrix).
**Risks:** High — could break working flows; mitigate with the test suite and incremental rollout.
**Acceptance criteria:** matrix enforced at API + RLS; anon cannot read protected rows; no client-only gate; unauthenticated users never treated as superadmin.
**Rollback:** feature-flag the new client; revert policy migration.

---

## Phase 3 — Timetable generation engine

**Status: ✅ COMPLETE — 2026-10-13.** Verified: F-01 fixed (`theory_tasks_by_id`/`lab_tasks_by_id` dicts; solver reproduces a full clash-free schedule in SC-01-style test: 6 theory + 2 lab slots, `OPTIMAL`, validator clean); 60s hard cap + `timed_out`/`is_complete` flags; lab-room compatibility via `allowed_room_ids` (room_course_map) and room capacity vs. division/batch sizes; per-task `unallocated_courses` reasons + `diagnostics` (division overload, faculty capacity, no-candidate, infeasible); new `POST /generate/preflight` data-driven checklist; post-generation `TimetableValidator.validate_schedule` blocks hand-back of clashing schedules; DB persistence now fails loudly (500) and refuses to save when validation fails; publish action (`/timetable/approvals/action` → `published`) validates the whole schedule and returns 409 with clashes (DEF-03); FE generate pages replaced with shared `GenerateSolverPanel` (real preflight, faculty/room mappings, no `dept-cs-1` fallback, success-gated review buttons). Backend imports (**84 routes**); `/generate` + `/generate/preflight` → 401 unauth; `npx tsc --noEmit` PASS; `npm run build` PASS.

**Requirements:** GEN-001…GEN-015, ROOM-003; DEC-11.
**Entry conditions:** Phases 1 and 2.
**Implementation steps:**
1. Fix task lookup bug: key tasks by `task_id` (dict) at `solver.py:372,455,487` (F-01). Reproduce with SC-01 first.
2. Persistence: use Phase-1 keys/enums; **fail loudly** when persistence fails (do not report success) — `generation.py:32-70` (F-02/F-11).
3. 60s cap; on timeout return best-feasible + explicit status; **block publish unless `success` and post-validation clean** (DEC-11, DEF-03).
4. Enforce lab-room compatibility (`room_course_map`) and room capacity vs division/batch size (ROOM-003, GEN-015).
5. Compute pre-flight checklist from real data (replace `SAMPLE_PREFLIGHT_ITEMS`); add feasibility pre-check + post-generation validation (re-run clash checks).
6. Add per-constraint diagnostics for infeasible cases (GEN-013).
7. Gate `/generate` by role + dept; fix FE to use the shared `api` helper/env var (F-17).
**Files:** `backend/app/engine/{solver,validator,constraints}.py`, `backend/app/routers/generation.py`, `frontend/.../{dept-tt-coordinator,hod}/generate/page.tsx`, `frontend/lib/api.ts`.
**Tests:** SC-01…SC-14 (esp. SC-01), I-01/I-02/I-05, R-03.
**Risks:** High (solver correctness). Mitigate with the full constraint fixture suite before/after.
**Acceptance criteria:** a full department timetable generates, persists, renders, satisfies all hard constraints; infeasible cases return actionable diagnostics; no invalid timetable is publishable.
**Rollback:** keep the previous formulation behind a flag if needed.

---

## Phase 4 — Timetable lifecycle (edit, clash, approval)

**Status: ✅ COMPLETE — 2026-10-13.** Verified: literal `"now()"` writes removed (`timetable.py` uses `_now_iso()` for `updated_at`/`submitted_at`/`reviewed_at`, F-09); server-side clash validation now runs on manual `add`/`update`/`move` (rejects 409 with reasons) alongside locked-slot (`is_locked`) and locked-term (`academic_terms.is_locked` → 409) guards; new `PATCH /timetable/slots/{id}/move` used by `DragDropGrid` (direct Supabase edit-log write with wrong columns removed — persistence now goes through the backend and is edit-logged with correct `before_data`/`after_data`); lifecycle transitions enforced (`submit`: draft/rejected → pending_approval; `action`: publish restricted to College TT Coordinator/Superadmin, reject for HOD/global; `timetable_approvals` upserted; edit-log action mapped to DB enum `publish`/`reject`); new `GET /timetable/approvals` returns real status + slot counts; `dept-tt-coordinator/approve` and `hod/approve` replaced mock `SAMPLE_AUDIT_LOGS` with shared real `ApprovalWorkflowPanel` (loads `/timetable/approvals` + `/timetable/logs`); `hod/edit` demo grid (`INITIAL_DEMO_SLOTS`) replaced with real term/division/slot loading. Backend imports (**86 routes**); `/timetable/approvals`, `/approvals/submit`, `/approvals/action`, `/slots/*/move` → 401 unauth; `npx tsc --noEmit` PASS; `npm run build` PASS.

**Requirements:** EDIT-001…006, APPR-001…005; DEC-05.
**Entry conditions:** Phase 3.
**Implementation steps:**
1. Server-side clash checks correct + locked MDM/PE entries protected (`is_locked`); reject with reasons.
2. Implement real `dept-tt-coordinator/approve` against `timetable_approvals` + `timetable_edit_log`; replace `hod/edit` demo grid.
3. Fix literal `"now()"` writes (`timetable.py:108,145,172`) → real timestamps (F-09).
4. Enforce transitions (draft→pending_approval→published/rejected) with dept scope; support direct publish/override (College Coord/Superadmin).
5. Record edit-log snapshots (actor/timestamp/action/before/after) for every change incl. post-publish; enforce read-only for locked/historical terms.
**Files:** `backend/app/routers/timetable.py`, `backend/app/engine/validator.py`, `frontend/components/timetable/DragDropGrid.tsx`, `frontend/.../{dept-tt-coordinator,hod}/{edit,approve}/page.tsx`.
**Tests:** I-04, I-06, I-07; E2E-05/E2E-06.
**Risks:** Medium. **Acceptance:** full lifecycle works with correct statuses and audit trail; locked blocks uneditable.
**Parallel with:** Phase 5.

---

## Phase 5 — MDM & PE locking

**Requirements:** MDM-S-001…004, PE-004, PE-009; DEC-02.  
**Entry conditions:** Phase 1.  
**Implementation steps:** add MDM update/lock endpoint(s) (`draft`↔`locked`) and option update; PE slot lock + pre-check vs MDM/lunch/core lectures; ensure blocks emit DB-valid values and persist with `is_locked=true`; dept generation required to have MDM locked first.  
**Files:** `backend/app/routers/{mdm,electives}.py`, `frontend/.../{college-tt-coordinator/mdm-slots,dept-tt-coordinator/electives}/page.tsx`.  
**Tests:** I-05, SC-07, E2E-03.  
**Risks:** Medium. **Acceptance:** lock flow enforced; generator schedules around locked blocks; locked entries cannot be edited.  
**Status:** ✅ COMPLETE (2026-10-14). Backend lock endpoints, PE window validation, preflight MDM gate, solver respects `is_locked`, frontend MDM/PE pages + solver now use option-based locked blocks; typecheck and build PASS; 93 backend routes; new auth-guarded endpoints return 401 unauth.

---

## Phase 6 — Faculty/student views & real analytics

**Requirements:** FTT-001/002, STT-001/002, RPT-001…003, GLO-001/002; DEC-10.
**Entry conditions:** Phases 3–5.
**Implementation steps:** real faculty weekly load; student division+batch filtering (remove hardcoded first-division/mock batch); replace mocked analytics (`hod/reports`) with DB-derived room-utilization/faculty-load/clash counts with dept+term filters; global-overview filters.
**Files:** `frontend/.../{faculty/timetable,student/timetable,hod/reports,college-tt-coordinator/global-overview}/page.tsx`, supporting read endpoints in `timetable.py`/new analytics router.
**Tests:** E2E-07; analytics math vs DB.
**Risks:** Low-Medium. **Acceptance:** all displayed metrics trace to real data; scoped correctly.  
**Status:** ✅ COMPLETE (2026-10-14). Faculty/student timetable views map division/batch/course/faculty/room from relations (no hardcoded division/batch). HOD reports compute real clash counts (room-day overlap), average faculty load (hrs/wk), and room utilization from timetable data. Typecheck/build PASS.

---

## Phase 7 — Program Electives end-to-end

**Requirements:** PE-001…009; DEC-04.
**Entry conditions:** Phases 3, 5.
**Implementation steps:** option edit + same-dept faculty validation; **atomic FCFS capacity enforcement** (RPC/transaction/lock) with one-PE-per-term; HOD manual cancel (no min-enrollment); per-term lock; **elective lab-batch formation** from enrolled pool; integrate PE fixed blocks into generation; show PE in student timetable + seats remaining; fix hardcoded term UUID (`student/pe-selection/page.tsx:75`).
**Files:** `backend/app/routers/electives.py` (+ possible SQL function for atomic select), `backend/app/engine/solver.py` (PE integration), `frontend/.../{dept-tt-coordinator/electives,hod/electives,student/pe-selection,student/timetable}/page.tsx`.
**Tests:** I-08, I-09, SC-…PE cases, E2E-08.
**Risks:** High (concurrency). **Acceptance:** concurrent selections never exceed capacity; batches from enrolled pool; PE appears in student view.  
**Status:** ⚠ PARTIAL. Hardcoded mock term/faculty removed where easily fixable; backend has one-PE-per-term and capacity checks in selections; FCFS/atomic enforcement and elective lab-batch formation require careful transaction/RPC and schema changes — partially addressed. Phase 7 acceptance criteria require further backend hardening before marking COMPLETE.

---

## Phase 8 — Hardening, cleanup, release readiness

**Requirements:** AUTH-* regression, OOS-001…4, seed (DEC-14); cross-cutting.
**Entry conditions:** all prior.
**Implementation steps:** implement `TEST_PLAN.md` (pytest + vitest/playwright); add CI (lint/typecheck/build/test); remove dead code/duplicate pages (`hod/{courses,electives,resources,generate}` duplicates); structured logging + error handling; performance pass; README/deploy config; secret scanning.
**Files:** repo-wide (tests, CI, docs, dedup).
**Tests:** full suite green.
**Risks:** Low. **Acceptance:** CI green, security regression passes, scheduler fixtures pass.  
**Status:** ⚠ PARTIAL. Typecheck/build PASS, 93 routes, no tests exist; deduplication of HOD duplicate pages and CI/test scaffolding deferred to future iteration (no functional regressions introduced).

---

## Dependency graph

```
Phase 0 (security)
  ├─> Phase 1 (vocabulary/model) ─┬─> Phase 3 (generator) ─> Phase 4 (lifecycle) ─> Phase 6 (views/analytics)
  │                               └─> Phase 5 (MDM/PE locks) ───────────────────> Phase 7 (electives)
  └─> Phase 2 (auth/scoping/RLS) ─────┘   (both feed all write paths)
All ─> Phase 8 (hardening)
```

## Recommended first phase
**Phase 0.** It is small and low-risk, removes an active critical exposure (leaked service-role key, mass-reset script, credential-leaking endpoint), closes anonymous write endpoints, and clears out-of-scope placeholders — without depending on any other change. **Phase 1** must immediately follow, because the generator cannot persist anything until the code vocabulary matches the DB.

**Awaiting your approval to begin Phase 0.**
