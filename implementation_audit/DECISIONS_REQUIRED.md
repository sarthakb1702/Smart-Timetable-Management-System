# Decision Log

Status of product/architecture decisions affecting implementation. All decisions below were **ratified by the product owner on 2026-10-13** and are now binding MVP constraints. The audit originally raised them as `DECISIONS_REQUIRED`; this file records the resolutions.

Legend: **RESOLVED** = decided and binding. **DEFAULT** = low-risk implementation choice that does not need a separate decision. **OPEN** = still needs input.

---

## RESOLVED decisions

### DEC-01 — Source of truth for vocabulary (was D-01)
**Decision:** The **database schema and project brief are the source of truth**. Update application code to match existing DB enums, column names, and status values. Avoid unnecessary migrations.
**Binding implications:**
- Code must use `term_id` (not `academic_term_id`), `source_type` (not `slot_source`), `is_locked` (not `lock_status`) on the `timetable` entity.
- Code enums must match DB: `slot_source = regular|mdm|pe`; `timetable_status = draft|pending_approval|published|rejected`; `session_type = theory|lab` (no `tutorial/mdm/elective` values on the persisted `timetable` row); `lock_status` (slot tables) = `draft|locked`.
- MDM/PE blocks are represented on `timetable` via `source_type='mdm'|'pe'` + the corresponding FK, with `is_locked=true` and `session_type` kept DB-valid.

### DEC-02 — MDM & PE locking (was D-02)
**Decision:** Follow the documented DB design: `draft`/`locked` on `mdm_slots`/`elective_slots`; `is_locked` boolean on `timetable`. **Locked slots must not be accidentally edited** (drag/edit vetoes; reject with reason).

### DEC-03 — Security & RLS (was D-03)
**Decision:** Use **JWT-scoped Supabase clients + proper RLS for user-facing requests**; restrict the service-role key to trusted server-side administrative operations and background jobs; **never expose it to the frontend**.
**Binding implications:** eliminate the app-wide service-role client (`backend/app/core/supabase_client.py`) for user requests; write RLS policies for all tables in use; the service key only in seed/admin jobs.

### DEC-04 — Program Elective enrollment (was D-04)
**Decision:** **FCFS** when seats are limited; **exactly one PE per student per term**; **no minimum-enrollment threshold** in MVP (HOD may cancel an option manually); selections **lock for the current term** and reset each term; **concurrent selections must not exceed capacity** (atomic enforcement).

### DEC-05 — Timetable approval workflow (was D-05)
**Decision:** `draft → pending_approval → published`. HOD approves/rejects (with comments). Authorized College TT Coordinators/Superadmins may publish or override. Post-publication edits go live after successful clash validation, but **every change must be recorded in the edit log**.

### DEC-06 — Academic-term rollover (was D-06)
**Decision:** MVP **configures each new term separately** (no auto-clone). Superadmin manages the current term. Historical/locked terms are read-only.

### DEC-07 — Divisions & batches (was D-07)
**Decision:** HOD configures **number of batches and sizes manually**; names like `A1, A2, A3…`; **not hardcoded to 4**.

### DEC-08 — Out-of-scope features (was D-08)
**Decision:** **Do not implement** faculty preferences, notifications, leave/substitute management, or exam scheduling. **Hide/remove misleading placeholder pages** and **correct checklists** that mark them complete.

### DEC-09 — Auth & demo accounts (was D-09)
**Decision:** Keep **Supabase email/password**. **Remove or securely disable demo-account endpoints in deployed environments**; **never return passwords via API**; never commit credentials.

### DEC-10 — Role enforcement (was D-10)
**Decision:** Enforce auth + roles **on the server**; middleware for initial access checks, server-side checks for sensitive operations; **never default an unauthenticated user to Superadmin**; enforce **department scoping in backend and database**, not just the frontend.

### DEC-11 — Timetable generation (was D-11)
**Decision:** **Keep the existing CP-SAT solver** if suitable. **Max 60s**; on timeout return the **best valid timetable found, if one exists, with explicit status**; **never publish an invalid/clashing timetable**; if none found, return useful diagnostics. **Do not rewrite the solver without evidence it is necessary.**
**Audit note:** the solver formulation is suitable in concept, but it currently **crashes on any lab task** (F-01) and its output **cannot be persisted** (F-02). These are defects to fix, not a rewrite trigger.

### DEC-12 — Faculty eligibility (was D-12)
**Decision:** Regular courses follow the **faculty department restriction**; **MDM eligibility is additive** (eligible faculty may teach MDM outside their regular dept course list).

### DEC-13 — Academic-term lifecycle (was D-13)
**Decision:** **Superadmin selects the current term**; once historical + locked, its timetable and related records are **read-only**; preserve historical data.

### DEC-14 — Seed data (was D-14)
**Decision:** Maintain a **documented, environment-guarded seed script** for dev/demo data; generate strong credentials safely; never commit secrets; never seed demo accounts into production unintentionally.

---

## DEFAULT (no decision needed — will apply unless you object)

| ID | Choice | Rationale |
|---|---|---|
| DEF-01 | Post-publication edits validated by server `/clash-check`; log via `timetable_edit_log`. | DEC-05 |
| DEF-02 | RLS policies modeled per brief DB §10 using `auth_user_role()`/`auth_user_dept()` helpers. | DEC-03, DEC-10 |
| DEF-03 | On solver timeout, `status="FEASIBLE"`/`"UNKNOWN"` returned with best solution and a flag; publish disabled unless `success` and post-validation clean. | DEC-11 |
| DEF-04 | Demo-account endpoint gated by explicit `ALLOW_DEMO_ACCOUNTS` (default off); returns no password. | DEC-09 |
| DEF-05 | Batch CRUD + auto-split helper (manual override). | DEC-07 |
| DEF-06 | Current-term selection via new `set current` action; locked terms rejected from write paths. | DEC-06, DEC-13 |
| DEF-07 | Seed script refuses to run when `ENVIRONMENT=production` unless `--force`. | DEC-14 |

## OPEN
None at this time. Raise new decisions here if implementation uncovers a material ambiguity.
