# Implementation Audit — College Timetable Management System

**Audit date:** 2026-10-13
**Auditor:** opencode (senior architect / full-stack / DB / QA review)
**Scope:** Read-only audit of the repository against `College-Timetable-System-Project-Doc.docx` (sections 1–7 and the Database Schema).
**Application code was not modified.** Only this `implementation_audit/` directory was created.

---

## 1. Repository architecture summary

| Layer | Technology | Location | Notes |
|---|---|---|---|
| Frontend | Next.js 14.2.3 (App Router), React 18, TypeScript strict, Tailwind | `frontend/` | Supabase SSR auth; role-scoped dashboard pages |
| Backend | FastAPI + Pydantic v2 | `backend/app/` | 10 routers, 63 route handlers under `/api/v1` |
| Scheduler | Google OR-Tools CP-SAT | `backend/app/engine/solver.py` | Constraint model; **currently crashes on any lab task** |
| Validator | Custom Python | `backend/app/engine/validator.py` | Clash checks for drag-and-drop |
| Database | Supabase Postgres | `supabase/migrations/*.sql` | Schema + a partial RLS file |
| Auth | Supabase Auth (JWT) + app role table | `frontend/middleware.ts`, `backend/app/core/auth.py` | Token verified server-side; roles resolved from `public.users` |

**Two Node manifests exist:** `frontend/package.json` (Next 14.2.3 / React 18) and a stray root `package.json` (Next 16 / React 19). The root manifest is almost certainly erroneous and must not be used.

**Git state:** only 80 files are tracked; the working tree holds 151. New backend routers/schemas/scripts and the `hod/`, `dept-tt-coordinator/`, `college-tt-coordinator/` page trees are **untracked**; a large set of older `dept/*` and `college-coordinator/*` pages are **deleted** in the working tree. Much of the "completed" system is uncommitted.

### Conventions used in this audit
- **Status** ∈ Complete / Partial / Missing / Broken / Blocked (per the audit brief).
- Because the repository contains **zero automated tests** and no live Supabase instance was reachable during the audit, almost every claim is **static evidence** (code/build/typecheck). Where behaviour was not executed against a real DB, the Test Evidence column records **UNVERIFIED**.
- Even items marked **Complete** should be read as "implementation appears present and internally consistent"; no item is runtime-verified end-to-end.

---

## 2. Overall implementation status

**Partially implemented, with a broken core.**

- The **UI shell, master-data CRUD pages, and role/API scaffolding are substantially present** (34 buildable pages, 63 backend routes).
- The **core value chain is broken**: the timetable **generator crashes** whenever a lab exists, and even a successful in-memory solve **cannot be persisted** because the persistence payload uses column/enum names that do not exist in the database.
- **Authorization is not reliably enforced**: the entire `/divisions` router, `/generate`, and `/clash-check` are unauthenticated; the department-scoping helpers are written but never wired; RLS is enabled on nearly all tables but policies exist for only 5.
- **No automated tests exist anywhere** (pytest declared but unused; no jest/vitest/playwright).

| Status | Count (of ~64 requirements) |
|---|---|
| Complete | 9 |
| Partial | 24 |
| Broken | 14 |
| Missing | 17 |
| Blocked | 0 |

> Counts are derived from `REQUIREMENT_MATRIX.md`. "Complete" = code path present and consistent; runtime unverified.

---

## 3. Five most important gaps (with evidence)

1. **Generation engine crashes on any lab** — `backend/app/engine/solver.py:372` indexes `lab_tasks[t_id]` with a global task id, raising `IndexError` whenever `theory_tasks` is non-empty and lab tasks exist. Reproduced locally: `SOLVER_EXCEPTION: IndexError list index out of range` (theory-only fixture succeeds → 3 slots). The same bug is repeated in extraction loops at `solver.py:455` and `solver.py:487`.
2. **Generated timetables cannot be saved (schema drift)** — `backend/app/routers/generation.py:38-54` writes `academic_term_id`, `slot_source`, and `lock_status`, but the `timetable` table defines `term_id`, `source_type`, and `is_locked` (boolean) — `supabase/migrations/20260910000000_init_schema.sql:263-291`. Additionally `SlotSourceEnum`/`LockStatusEnum`/`SessionTypeEnum` values (`core_course`, `locked_mdm`, `mdm`) do not match the DB enums (`regular`, `locked`, and theory/lab only). Copying the same wrong column names into the validator (`validator.py:223-228`) means **DB-backed clash checks silently return `[]`**.
3. **Authorization holes** — `backend/app/routers/divisions.py:26-47` has **no auth dependency** (anonymous read/create/delete); `backend/app/routers/generation.py:14` and `backend/app/routers/clash_check.py:10` are unauthenticated; `require_department_access`/`can_access_department` in `core/auth.py:110-153` are **never used**, so HOD/dept-coordinator can mutate other departments' courses, rooms, electives, and timetable rows.
4. **Credentials and PII exposure** — a live **service-role key is hardcoded** in `backend/scripts/reset_passwords.py:5` and `backend/scripts/update_superadmin_email.py:5`; `reset_passwords.py` resets **every** account to `Test@123`; `GET /auth/demo-accounts` (`auth_dev.py:50`) returns all active users' emails/roles **and their shared password** with only an `ENVIRONMENT != "production"` guard (default env is `development`, `config.py:11`).
5. **Program Electives workflow incomplete** — options/slots endpoints lack department ownership checks (`electives.py:145-200`); there is no capacity enforcement at selection time (`electives.py:202-215` — upsert ignores `capacity`, no transaction/locking); no elective lab-batch formation or enrollment finalisation anywhere; PE sessions are not generated into the timetable (PRD 4.20/§6).

---

## 4. Critical security & data-integrity issues (P0/P1)

- **P0** Live service-role JWT committed in plaintext (`backend/scripts/*.py:5`) — rotate immediately.
- **P0** Solver `IndexError` makes timetable generation unusable (`solver.py:372`).
- **P0** Generated slots cannot be persisted; wrong columns/enums (`generation.py:38-54` vs schema).
- **P1** Unauthenticated `/divisions`, `/generate`, `/clash-check`.
- **P1** Missing department isolation across `courses`, `rooms`, `electives`, `settings/users`, `timetable`.
- **P1** `auth_dev` demo endpoint leaks credentials/PII; dev-only guard defaults to on.
- **P1** Mass password reset + hardcoded weak default password (`schemas/settings.py:107`).
- **P1** RLS enabled but not policed on 20+ tables; app relies on a service-role key that bypasses RLS.
- **P2** Literal `"now()"` strings written to timestamp columns (`timetable.py:108,145,172`).
- **P2** Raw exception text returned to clients (`settings.py:434`, `clash_check.py:24`, `auth.py:93`).

---

## 5. Verification actually performed

| Command | Location | Result |
|---|---|---|
| `npx tsc --noEmit` | `frontend/` | **PASS** (0 errors) |
| `npm run build` | `frontend/` | **PASS** — compiled, 34 routes generated |
| `python -m pytest -q` | `backend/` | **No tests collected** (exit 5) — `pytest` is declared but no test files exist |
| Solver synthetic fixture (theory+lab) | local probe | **FAIL** — `IndexError` at `solver.py:372` |
| Solver synthetic fixture (theory only) | local probe | **PASS** — 3 slots |
| Solver synthetic fixture (MDM only) | local probe | PASS in memory, but emits `session_type=mdm`, `slot_source=mdm_slot`, `lock_status=locked_mdm` (all invalid for the DB) |

Not run (would mutate state / needs credentials): live SQL migrations, RLS policy tests, end-to-end browser tests, real Supabase API calls.

---

## 6. Unverified items & access needed

- **Live Supabase project** (URL + anon key + a **non-privileged** test user) to verify RLS, login, and end-to-end flows without using the leaked service key.
- **Whether the migrations in `supabase/migrations/` were applied** to the live DB, and whether the live DB matches the migration file (drift is likely given code/DB mismatches).
- Real seed data to run the generator at realistic scale.

**Resolved:** the product/architecture decisions were ratified by the product owner on 2026-10-13 (see `DECISIONS_REQUIRED.md`); the roadmap is aligned to them. `DEC-11` also confirms the CP-SAT solver is to be **kept and fixed, not rewritten**.

---

## 7. Audit documents

- [`README.md`](./README.md) — this file
- [`REQUIREMENT_MATRIX.md`](./REQUIREMENT_MATRIX.md) — requirement-by-requirement traceability
- [`TECHNICAL_FINDINGS.md`](./TECHNICAL_FINDINGS.md) — prioritized defects with evidence
- [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md) — phased, repo-grounded plan aligned to the approved decisions
- [`TEST_PLAN.md`](./TEST_PLAN.md) — unit/integration/security/scheduling/E2E tests
- [`DECISIONS_REQUIRED.md`](./DECISIONS_REQUIRED.md) — decision log (ratified 2026-10-13)
