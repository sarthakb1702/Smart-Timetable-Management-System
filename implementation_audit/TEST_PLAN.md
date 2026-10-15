# Test Plan

No automated tests currently exist (`pytest` is declared in `backend/requirements.txt:9` but unused; no jest/vitest/playwright). This plan defines the tests needed to validate the requirements and to catch the defects found in the audit.

**Conventions:** each case has an ID, type, setup, action, expected result, and the requirement/finding it verifies. Types: **U** unit, **I** integration, **S** security, **SC** scheduling-constraint, **R** regression, **E2E** end-to-end.

**Environment note:** integration/security tests need a disposable Supabase project or local Postgres with the migrations applied and a non-privileged test user. Do not run them against production or with the leaked service key.

---

## 1. Unit tests — engine primitives

| ID | Type | Setup | Action | Expected | Verifies |
|---|---|---|---|---|---|
| U-01 | U | `constraints.py` | `time_to_minutes("08:30")`/`minutes_to_time` round-trip | Correct values | GEN-006 |
| U-02 | U | `constraints.py` | `is_time_overlapping` for touching/adjacent/overlapping intervals | Adjacent not overlapping; strict overlap true | GEN-003/4/5 |
| U-03 | U | `DaySlotGrid` | `find_slot_indices_for_window("12:00","13:00")` | Returns the lunch slot(s) | GEN-010 |
| U-04 | U | `DaySlotGrid` | slot count for 08:00–17:00 @60min | 9 slots | GEN-015 |

## 2. Scheduling-constraint tests (synthetic fixtures, no DB)

| ID | Type | Setup | Action | Expected | Verifies |
|---|---|---|---|---|---|
| SC-01 | SC | 1 div, 2 batches, course 2 theory + 2 lab hrs | `TimetableSolver.solve()` | No exception; lab + theory slots produced | **F-01/GEN-005** (currently FAILS) |
| SC-02 | SC | Same as SC-01 | Inspect output | No faculty/room/div/batch double-booking at any (day,slot) | GEN-003/4/5 |
| SC-03 | SC | Course 3 theory hrs | Solve | Exactly 3 one-hour theory sessions | GEN-006 |
| SC-04 | SC | Course 2 lab hrs, 2 batches | Solve | Each batch gets one 2-hour continuous lab | GEN-006/012 |
| SC-05 | SC | Course with theory+lab | Solve | Not >1 theory of same course/day/division; lab+theory same day allowed | GEN-007 |
| SC-06 | SC | Faculty max 4 hrs, course needs 6 theory | Solve | Solver returns infeasible, no over-allocation | GEN-008 |
| SC-07 | SC | MDM slot at Wed 10:00 (faculty+room) | Solve | No core session overlaps locked block/faculty/room; MDM emitted as locked | GEN-009/EDIT-005 |
| SC-08 | SC | Lunch 12:00–13:00 | Solve | No session in lunch window | GEN-010 |
| SC-09 | SC | Lab course, only one lab room | Solve | No two labs in same room concurrently | GEN-004 |
| SC-10 | SC | Impossible: 5 divisions, 1 room | Solve | `success=false`, message explains resource shortage | GEN-013/014 |
| SC-11 | SC | Lab course + `room_course_map` allowing only lab L2 | Solve | Labs placed only in L2 | ROOM-003 |
| SC-12 | SC | Division of 70 students, room capacity 60 | Solve | Room with capacity<enrolled not chosen (or flagged) | GEN (capacity) |
| SC-13 | SC | Large realistic fixture (e.g., 4 divisions × 4 batches × 6 courses) | Solve within 60s | Model builds; result feasible or clear reason | GEN-015 |
| SC-14 | SC | Run SC-01 twice | Compare | Deterministic or documented non-determinism | Repeatability |

## 3. Persistence / integration tests

| ID | Type | Setup | Action | Expected | Verifies |
|---|---|---|---|---|---|
| I-01 | I | DB migrated | Insert a payload shaped like `generation.py:38-54` output | Insert succeeds (requires F-02 fixed) | **GEN-011/F-02** (currently FAILS) |
| I-02 | I | Generated grid | POST `/generate` `save_to_db=true` | Rows exist in `timetable` with `term_id`/`source_type`/`is_locked`; response reflects persisted count | GEN-011 |
| I-03 | I | `timetable` rows | GET `/timetable?term_id=…` | Returns rows; no column errors | validator fix |
| I-04 | I | `timetable` rows | POST `/clash-check` with overlapping time | Returns `has_clash=true` with reasons | EDIT-003/F-08 |
| I-05 | I | Valid MDM/PE blocks | POST `/generate` | Blocks persist with `is_locked=true` | GEN-009/PE-008 |
| I-06 | I | approvals table | submit→action(publish) | Status transitions; timestamps are real, not `"now()"` | APPR-001/2/3, F-09 |
| I-07 | I | edits | add/update/delete slot | `timetable_edit_log` rows with actor/before/after | EDIT-006 |
| I-08 | I | capacity 1 option | two students select | Second rejected; counts consistent | PE-006 |
| I-09 | I | elective batches | run batch formation | Batches from enrolled pool; each student ≤1 batch | PE-007 |

## 4. Security tests

| ID | Type | Setup | Action | Expected | Verifies |
|---|---|---|---|---|---|
| S-01 | S | no token | GET"/divisions", POST `/generate`, POST `/clash-check` | 401/403 (currently 200) | **F-05/AUTH-007** |
| S-02 | S | dept-A HOD token | GET courses/rooms/electives/users for dept B | 403 | **F-06/AUTH-008** |
| S-03 | S | student token | GET `/timetable?faculty_id=<other>` | 403/empty (self-only) | AUTH-010 |
| S-04 | S | student token | GET another division's timetable | 403 | STT-001 |
| S-05 | S | any token | GET `/auth/demo-accounts` | 404 in prod; never a `password` field | **F-04/AUTH-012** |
| S-06 | S | anon Supabase key | Direct PostgREST select of `users`/`timetable` | Denied by RLS | AUTH-011 |
| S-07 | S | anon key | Insert into protected tables | Denied | AUTH-011 |
| S-08 | S | repo scan | grep for `service_role`/JWT | None in tracked files | **F-03/AUTH-012** |
| S-09 | S | role assignment | non-superadmin attempts `/settings/users/assign-role` | 403 | USER-003 |
| S-10 | S | deactivate user | deactivated user calls `/auth/me` | 403 | AUTH-004 |

## 5. Validation / master-data tests

| ID | Type | Setup | Action | Expected | Verifies |
|---|---|---|---|---|---|
| V-01 | I | — | POST duplicate department code | 4xx, readable message | SET-005 |
| V-02 | I | — | POST lunch break with `start_time`/`end_time` | 201 (serialization fixed) | **SET-004** |
| V-03 | I | — | POST course `session_type=bogus` | 422 | CRS-001 |
| V-04 | I | — | POST room capacity 0 | 422 | ROOM-001 |
| V-05 | I | — | Assign 2nd college co-ordinator | 4xx (unique) | AUTH-005 |
| V-06 | I | — | Create HOD without department_id | 422 (app-level) | AUTH-006 |

## 6. Regression tests

| ID | Type | Setup | Action | Expected | Verifies |
|---|---|---|---|---|---|
| R-01 | R | repo | `npx tsc --noEmit` | 0 errors | build |
| R-02 | R | repo | `npm run build` | succeeds, 34 routes | build |
| R-03 | R | theory-only fixture | solve | still passes after engine fix | GEN-006 |
| R-04 | R | — | GET `/settings/college`, lunch CRUD | unchanged behaviour | SET-001/004 |

## 7. End-to-end journeys (browser)

| ID | Type | Setup | Action | Expected | Verifies |
|---|---|---|---|---|---|
| E2E-01 | E2E | seeded DB | login as each of the 6 roles | Correct landing/nav; no privileged access by URL | AUTH-001/002 |
| E2E-02 | E2E | superadmin | create dept/year/term, user, lunch break | All persisted and visible | SET/USER |
| E2E-03 | E2E | college-coord | create MDM slot + options, lock | Locked block visible to depts | MDM-S |
| E2E-04 | E2E | dept-coord | configure courses/rooms/faculty/divisions, generate | Grid generated + persisted + rendered | GEN |
| E2E-05 | E2E | dept-coord | drag a lecture to a clashing slot | Rejected with reason; valid move persists + logged | EDIT |
| E2E-06 | E2E | dept-coord→HOD | submit; HOD approve with comment; reject path | Status published/rejected correctly | APPR |
| E2E-07 | E2E | published | faculty and student views | Correct scoped data | FTT/STT |
| E2E-08 | E2E | student | select PE; capacity full; view PE in timetable | Enforced + displayed | PE |

---

## Coverage mapping (minimum bar before release)
- Every hard constraint (SC-01…SC-14) must have a passing automated test.
- Every P0/P1 finding in `TECHNICAL_FINDINGS.md` must have a dedicated regression test.
- CI must run: backend unit+integration (`pytest`), frontend typecheck+lint+build, security suite (S-01…S-10), and E2E smoke.
