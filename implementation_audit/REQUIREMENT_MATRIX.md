# Requirement Matrix

Traceability of every material requirement in `College-Timetable-System-Project-Doc.docx` (PRD §1–7) and the Database Schema (§0–11) against the repository.

**Evidence legend:** FE = frontend file; BE = backend file; DB = migration/schema. All line refs are current working-tree lines.
**Status:** Complete / Partial / Missing / Broken / Blocked.
**Runtime note:** No automated tests exist and no live DB was used; every row is static evidence unless stated. "Complete" means the code path appears present and internally consistent — not runtime-verified.

---

## AUTH — Authentication, roles, authorization (§4.1, §5, DB §1)

| ID | Brief ref | Expected behaviour | FE evidence | BE evidence | DB evidence | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-001 | §4.1 | Email+password login, redirect by role | `app/(auth)/login/page.tsx` | Supabase Auth; `main.py:79` `/auth/me` | `users` table `init_schema:69` | UNVERIFIED | Partial | Redirect relies on client `role-guards`; middleware checks auth only | Usability | — |
| AUTH-002 | §5 | Role-based page access matrix enforced | `lib/role-guards.ts` (`ROUTE_PERMISSIONS`) | `require_roles` on most routers | RLS partial | UNVERIFIED | Broken | `canAccessRoute` never called in `middleware.ts`; nav filtering only; `activeRole` defaults `superadmin` (`layout.tsx:90`) | Privilege escalation | AUTH-007 |
| AUTH-003 | §4.3 | Superadmin create users (role + dept) | `superadmin/users/page.tsx` | `settings.py:387` POST `/settings/users` | `users` | UNVERIFIED | Partial | Hardcoded default password (`schemas/settings.py:107`); error leakage line 434; FE hardcodes password (`users/page.tsx:248`) | Security | — |
| AUTH-004 | §4.3 | Deactivate / reassign roles | `superadmin/users/page.tsx` | `settings.py:484` PUT role; `UserRoleUpdate` has `is_active` | `users.is_active` | UNVERIFIED | Partial | No dedicated deactivate UX/endpoint beyond role update | Security | — |
| AUTH-005 | §4.2 | Single College TT Coordinator | — | `settings.py:479,518` maps unique-violation | Partial unique index `one_college_tt_coordinator` `init_schema:83` | UNVERIFIED | Complete | No proactive UI guard | Low | — |
| AUTH-006 | §2 | HOD/Dept-coordinator tied to exactly one dept; app-level check | `DepartmentContext.tsx:86` | `core/auth.py` has helpers | `users.department_id` | UNVERIFIED | Partial | No server validation requiring `department_id` for those roles | Data integrity | — |
| AUTH-007 | §5, §10 | Server-side protection of pages + APIs | middleware auth-only | `divisions.py` **no auth**; `generation.py`, `clash_check.py` no auth | RLS partial | UNVERIFIED | Broken | Unauthenticated endpoints; no server page guard | Critical | — |
| AUTH-008 | §10 | Department isolation for HOD/dept-coord | — | `require_department_access` unused (`auth.py:110-153`) | RLS lacks dept policies on most tables | UNVERIFIED | Broken | Cross-dept read/write via caller-supplied ids (`courses.py:125-191`, `rooms.py:39-95`, `electives.py:145-200`, `settings.py:357`, `timetable.py:76-132`) | Cross-tenant leakage | — |
| AUTH-009 | §5 | College-wide access for college-coord/superadmin | `layout.tsx:140` dept picker | — | — | UNVERIFIED | Partial | Dept picker present; not a security control | Low | — |
| AUTH-010 | §5 | Self-only access for student/faculty data | `faculty/timetable`, `student/timetable` | `timetable.py:55-74` accepts arbitrary `faculty_id`/`department_id` | `timetable` | UNVERIFIED | Partial | No server enforcement of self-scope | Privacy | — |
| AUTH-011 | DB §10 | RLS policies enforce matrix | — | service-role client bypasses RLS (`supabase_client.py:21`) | `rls_policies.sql` (45 lines) | UNVERIFIED | Broken | RLS enabled on all tables (`init_schema:324-348`) but only ~6 policies exist; 20+ tables have none | Critical | AUTH-008 |
| AUTH-012 | §8 (audit) | No credential exposure | login page | `auth_dev.py:12,39`; scripts | — | — | Broken | Live service-role key in `scripts/*.py:5`; demo endpoint returns password; weak defaults | Critical | — |
| AUTH-013 | §3.1 audit | No IDOR / privilege escalation | — | `assign-role` trusts `user_id`; `divisions` open | — | UNVERIFIED | Broken | See AUTH-007/008/012 | Critical | — |
| AUTH-014 | §4.1 | Magic-link (optional) | Not present | — | — | — | Missing | Email/password only (acceptable; brief says "or") | Low | — |

## SET — College configuration & master data (§4.2, DB §3)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| SET-001 | §4.2 | Working days + college start/end | `superadmin/settings/page.tsx` | `settings.py:39,59` GET/PUT `/settings/college` | `college_settings` `init_schema:99` | serialization fixed (audit) | Partial | Runtime unverified; `updated_at` fix applied by auditor | Low | — |
| SET-002 | §4.2 | Slot duration → 1h theory / 2h lab | settings page | `settings.py` college | `slot_duration_minutes` | UNVERIFIED | Partial | Duration stored; derivation applied only in generator (broken) | Correctness | GEN |
| SET-003 | §4.2 | Global max faculty weekly hours | settings page | college settings | `max_faculty_weekly_hours` | UNVERIFIED | Complete | Enforced as a soft cap in solver (when solver runs) | Low | GEN |
| SET-004 | §4.2/DB§3 | Lunch breaks dept/year scoped + fallback | settings page | `settings.py:86-174` CRUD | `lunch_breaks` `init_schema:111` | serialization fixed (audit) | Partial | No unique/computed index from DB doc §3; app has no duplicate guard | Data integrity | — |
| SET-005 | §4.2 | Create/manage departments (name, code) | settings page | `settings.py:179-263` | `departments` | UNVERIFIED | Partial | Unique violation surfaced generically | Low | — |
| SET-006 | §4.2/§4.3 | Academic years master | settings page | `settings.py:268-352` | `academic_years` | UNVERIFIED | Complete | — | Low | — |
| SET-007 | DB §2 | Academic terms (one current per dept) | `global-overview`, generate | `settings.py` GET `/settings/academic-terms` | `academic_terms` + index `init_schema:44` | UNVERIFIED | Partial | No create/update term endpoint in `settings.py` (only list found) | Blocker for term setup | — |

## USER — User & role management (§4.3)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| USER-001 | §4.3 | Create accounts with role+dept | `superadmin/users/page.tsx` | `settings.py:387` | `users` | UNVERIFIED | Partial | Hardcoded/weak password | Security | AUTH-003 |
| USER-002 | §4.3 | List users (role/dept filter) | users page, `hod/faculty` | `settings.py:357` | `users` | UNVERIFIED | Broken | No dept scoping; anyone in allowed roles can enumerate all users | Privacy | AUTH-008 |
| USER-003 | §4.3 | Assign role to user | users page | `settings.py:437` POST `/assign-role` | `users` | UNVERIFIED | Partial | No audit log | Security | — |

## MDM-C — MDM course master (§4.4)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| MDM-C-001 | §4.4 | CRUD MDM courses (code, name, credits, type, year) | `superadmin/mdm-courses/page.tsx` | `courses.py:39-123` `/courses/mdm` | `courses` (`is_mdm`) | UNVERIFIED | Complete | Type restricted to theory/lab (`schemas/courses.py:8`) | Low | — |

## MDM-S — MDM slot scheduling (§4.5, DB §7)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| MDM-S-001 | §4.5 | One MDM slot per year; assign courses+faculty+room | `college-tt-coordinator/mdm-slots/page.tsx` | `mdm.py:66` POST; `:108` options | `mdm_slots` UNIQUE(year) `init_schema:247` | UNVERIFIED | Partial | Only create/list/delete options — no update/lock endpoint | Feature gap | — |
| MDM-S-002 | §4.5 | Lock/publish MDM slots | page has lock UI | **No lock endpoint** | `mdm_slots.status` | UNVERIFIED | Missing | Status column exists but never set to `locked` by API | Blocker for generation | — |
| MDM-S-003 | §4.5 | Prevent double-booking in a slot | — | DB uniques (`init_schema:257-259`) | ✔ | UNVERIFIED | Complete | Enforced by DB constraints | Low | — |
| MDM-S-004 | §4.5/A3 | MDM must be set before dept generation | generate preflight (static) | Preflight items `SAMPLE_*` static | — | — | Partial | Preflight checklist is hardcoded, not computed | Correctness | GEN |

## SR — Shared resource pool (§4.6, DB §4)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| SR-001 | §4.6 | Shared rooms/labs (dept_id null) | `college-tt-coordinator/shared-resources/page.tsx` | `rooms.py:16` `?is_shared=true` | `rooms.department_id` null | UNVERIFIED | Partial | `SAMPLE_BOOKINGS` occupied state; room_course_map not exposed | Data | — |

## ROOM — Dept resources / rooms & labs (§4.8, DB §4)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| ROOM-001 | §4.8 | CRUD dept rooms/labs (name, capacity, type) | `dept-tt-coordinator/resources/page.tsx`, `hod/resources` | `rooms.py:39-95` | `rooms` | UNVERIFIED | Partial | No dept scoping | Security | AUTH-008 |
| ROOM-002 | §4.8 | Link lab equipment tags + compatible courses | resources page | `rooms.equipment_tags` only | `room_course_map` table exists | UNVERIFIED | Missing | `room_course_map` is never read/written by any router | Scheduling correctness | GEN |
| ROOM-003 | §4.8 | Generator places lab-courses only in compatible rooms | — | solver ignores compatibility (only room_type) | `room_course_map` | UNVERIFIED | Missing | Capacity/compat not enforced | Correctness | GEN |

## CRS — Course management (§4.9, DB §5)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| CRS-001 | §4.9 | CRUD dept courses (code,name,credits,type,year) | `dept-tt-coordinator/courses/page.tsx`, `hod/courses` | `courses.py:147-191` | `courses` | UNVERIFIED | Partial | No dept scoping; no division linkage; no parent_course_id UI | Feature | AUTH-008 |
| CRS-002 | §4.9 | Credit→slot rule shown inline | page text | — | — | — | Partial | Displayed; not enforced/derived server-side | UX | — |
| CRS-003 | DB §5 | Theory+lab of same course linked via `parent_course_id` | — | never set | `courses.parent_course_id` | — | Missing | Column exists, unused | Model gap | — |

## FAC — Faculty management (§4.10, DB §5)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| FAC-001 | §4.10 | Add faculty (name,email,employee_code) | `hod/faculty/page.tsx` | only `GET /settings/users?role=faculty` | `users` | UNVERIFIED | Partial | No create-faculty path from this page (uses generic user create) | Feature | USER-001 |
| FAC-002 | §4.10 | Map faculty↔courses they can teach | — | no `faculty_course_map` endpoint | `faculty_course_map` | UNVERIFIED | Missing | Table exists but **no API reads/writes it** | Blocker for generator | GEN |
| FAC-003 | §4.10 | Show weekly load vs max | reports page (mock) | — | — | UNVERIFIED | Missing | No real load computation | Feature | RPT-001 |

## DIV — Divisions & batches (§4.11, DB §2)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| DIV-001 | §4.11 | Add divisions per year + student count | `hod/divisions/page.tsx` | `divisions.py:31` POST | `divisions` | UNVERIFIED | Partial | **Router fully unauthenticated** | Critical | AUTH-007 |
| DIV-002 | §4.11 | Configure/split batches (A1..An) + size | divisions page (no batch UI found) | no batch endpoints | `batches` | UNVERIFIED | Missing | Batch CRUD not implemented; batches only come from seed | Blocker for labs | — |

## GEN — Timetable generation (§4.12, DB §8)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| GEN-001 | §4.12 | Pre-flight checklist before Generate | generate pages | hardcoded `SAMPLE_PREFLIGHT_ITEMS` | — | — | Partial | Checklist is static, not computed from config | Correctness | — |
| GEN-002 | §4.12 | Select year+division and run generator | generate pages (direct fetch) | `generation.py:14` `/generate` (no auth) | — | UNVERIFIED | Broken | Endpoint unauthenticated; FE uses wrong env var `NEXT_PUBLIC_API_URL` | Critical | AUTH-007 |
| GEN-003 | §4.12 | No faculty double-booking | — | `solver.py:313-327` | — | fixture | Partial | Constraint coded; solver crashes with labs | Correctness | GEN-010 |
| GEN-004 | §4.12 | No room double-booking | — | `solver.py:333-345` | — | fixture | Partial | Coded | Correctness | GEN-010 |
| GEN-005 | §4.12 | No division/batch double-booking | — | `solver.py:352-379` | — | fixture | Broken | Uses `lab_tasks[t_id]` → **IndexError** | Critical | — |
| GEN-006 | §4.12 | Theory 1h; lab 2h continuous | — | `solver.py:203-226,484-515` | enum only theory/lab | fixture OK (theory) | Partial | Lab path crashes | Critical | — |
| GEN-007 | §4.12 | Max 1 theory/course/day (lab+theory same day allowed) | — | `solver.py:404-415` | — | fixture | Partial | Theory rule coded | Correctness | — |
| GEN-008 | §4.12 | Faculty weekly hours ≤ max | — | `solver.py:384-399` | — | fixture | Complete | — | Low | — |
| GEN-009 | §4.12 | MDM/PE inserted as fixed blocks first | — | `solver.py:115-186` | enum mismatch | fixture | Partial | Emits invalid enum values for DB | Data | GEN-011 |
| GEN-010 | §4.12 | Lunch breaks respected | — | `solver.py:85-113` | `lunch_breaks` | fixture | Partial | Works for division default; per-year ignored | Correctness | — |
| GEN-011 | §4.12/§8 | Persist generated grid (draft) | edit page fetches `/timetable` | `generation.py:32-65` | `timetable` | — | Broken | Wrong columns/enums → insert fails, error swallowed | Critical | — |
| GEN-012 | §4.12 | Batch-specific lab output | — | `GeneratedSlot.batch_id` | `timetable.batch_id` | — | Partial | Crashes before output | Critical | GEN-005 |
| GEN-013 | §4.12 | Unschedulable → explanations, no silent loss | — | `solver.py:516-522` (generic only) | — | — | Partial | No per-course infeasibility reasons | UX | — |
| GEN-014 | §4.12 | Feasibility pre-check / post-validate | — | none | — | — | Missing | No feasibility check or output validation | Correctness | — |
| GEN-015 | §3.4 audit | Scales to realistic sizes | — | nested loops O(tasks×days×slots×rooms×faculty) | — | — | Partial | Quadratic var creation; CP-SAT model may be large | Performance | — |

## EDIT — Timetable editing + clash detection (§4.13, DB §8)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| EDIT-001 | §4.13 | Visual grid + drag-and-drop | `components/timetable/DragDropGrid.tsx`, edit pages | — | — | — | Partial | `dept-tt-coordinator/edit` uses it; `hod/edit` is hardcoded demo | Feature | — |
| EDIT-002 | §4.13 | Add/remove/move sessions | edit page | `timetable.py:76-132` | `timetable` | UNVERIFIED | Partial | No dept scoping; writes literal `now()` | Correctness | AUTH-008 |
| EDIT-003 | §4.13 | Real-time clash check before drop | DragDropGrid calls `/clash-check` | `clash_check.py` + `validator.py` | — | — | Partial | Server IMAGE `existing_slots` passed from FE; DB fetch uses wrong column → `[]` | Correctness | GEN-011 |
| EDIT-004 | §4.13 | Rejection reasons shown | DragDropGrid toast + client fallback | `ClashCheckResponse.reasons` | — | — | Complete | — | Low | — |
| EDIT-005 | §4.13 | Locked MDM/PE not movable | validator checks lock_status | solver emits non-DB lock values | `timetable.is_locked` | — | Partial | Validator compares `LockStatusEnum` values not present in DB | Correctness | GEN-011 |
| EDIT-006 | §4.13/A6 | Edit log (who/what/when, before/after) | logs viewer `hod/approve` | `log_edit` in `timetable.py` | `timetable_edit_log` | UNVERIFIED | Partial | Works only if inserts succeed; literal `now()` elsewhere | Audit trail | — |

## APPR — Approval & publish (§4.14, DB §8)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| APPR-001 | §4.14 | Submit draft → pending approval | edit page | `timetable.py:134` `/approvals/submit` | `timetable_approvals` | UNVERIFIED | Partial | Writes literal `now()` | Correctness | — |
| APPR-002 | §4.14 | HOD approve/reject with comments | `hod/approve/page.tsx` | `timetable.py:160` `/approvals/action` | `timetable_approvals` | UNVERIFIED | Partial | Literal `now()`; no dept scoping | Correctness | AUTH-008 |
| APPR-003 | §4.14 | College coord/superadmin direct publish + override | `college-tt-coordinator/global-overview` | `timetable.py:160` | — | UNVERIFIED | Partial | Same as APPR-002 | Correctness | — |
| APPR-004 | §4.14 | Published visible to faculty/students | faculty/student pages | `timetable.py:55` GET | RLS policy | UNVERIFIED | Partial | GET returns any dept; not status-filtered in BE | Privacy | AUTH-010 |
| APPR-005 | §4.13 audit | Dept/coord `approve` page functional | `dept-tt-coordinator/approve/page.tsx` | — | — | — | Broken | **Hardcoded `SAMPLE_AUDIT_LOGS`, no API** | Feature | — |

## FTT — Faculty timetable view (§4.15)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| FTT-001 | §4.15 | Read-only personal weekly grid | `faculty/timetable/page.tsx` | `timetable.py:55` `?faculty_id=` | `timetable` | UNVERIFIED | Partial | No self-scope enforcement | Privacy | AUTH-010 |
| FTT-002 | §4.15 | Weekly load vs max | — | — | — | — | Missing | Not computed | Feature | RPT-001 |

## STT — Student timetable view (§4.16)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| STT-001 | §4.16 | Own division theory + own batch lab | `student/timetable/page.tsx` | `timetable.py:55` `?division_id=` | `users.division_id/batch_id` | UNVERIFIED | Partial | FE hardcodes "first division"; batch filter mocked (`page.tsx:15,41`) | Privacy | — |
| STT-002 | §4.16 | Show PE sessions per selection | — | — | — | — | Missing | PE never generated | Feature | PE |

## RPT — Reports & analytics (§4.17)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| RPT-001 | §4.17 | Room utilization % | `hod/reports/page.tsx` | — | — | — | Broken | **Mocked** (`roomUtilization:85`) | Misleading | — |
| RPT-002 | §4.17 | Faculty load distribution | reports page | — | — | — | Broken | **Mocked** `facultyLoad` | Misleading | — |
| RPT-003 | §4.17 | Unfilled/clashing slots | reports page | — | — | — | Broken | **Mocked** `clashingSlots:0` | Misleading | — |

## PE — Program Electives (§4.18–4.20, DB §6)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| PE-001 | §4.18 | CRUD elective courses (theory/lab credits) | `dept-tt-coordinator/electives`, `hod/electives` | `electives.py:87` | `elective_courses` | UNVERIFIED | Partial | Create/delete only; no edit | Feature | — |
| PE-002 | §4.18 | Options offered per term + capacity + faculty | electives page | `electives.py:145` | `elective_options` | UNVERIFIED | Partial | No dept ownership check | Security | AUTH-008 |
| PE-003 | §4.18/A13 | Faculty of same dept | — | not validated | — | — | Missing | No check | Data integrity | — |
| PE-004 | §4.19 | Fixed weekly PE slot per dept+year, lock | electives page | `electives.py:182` | `elective_slots` | UNVERIFIED | Partial | No lock endpoint; no clash pre-check vs MDM/lunch/core | Correctness | — |
| PE-005 | §4.20 | Student views options + seats remaining | `student/pe-selection/page.tsx` | `electives.py:116` | — | UNVERIFIED | Partial | Seats remaining not computed | Feature | — |
| PE-006 | §4.20 | Select within window; capacity enforced atomically | pe-selection page | `electives.py:202` upsert | `student_elective_selections` | UNVERIFIED | Broken | **No capacity check**, no lock/transaction; hardcoded term UUID in FE (`page.tsx:75`) | Data integrity | — |
| PE-007 | §4.20/A12 | Finalize enrollments + elective lab batches | — | none | `elective_batches`, `elective_batch_students` | — | Missing | No batch formation logic | Blocker | — |
| PE-008 | §4.12/A11 | PE fixed blocks scheduled by generator | — | solver reads `elective_slots` | enum mismatch | fixture | Partial | Emits invalid enums; not persisted | Feature | GEN-011 |
| PE-009 | §4.19 | PE slot avoids MDM/lunch/core clashes | — | not checked | — | — | Missing | No validation on create | Correctness | — |

## GLO — Global overview (§4.7)

| ID | Brief ref | Expected | FE | BE | DB | Test | Status | Gap | Risk | Deps |
|---|---|---|---|---|---|---|---|---|---|---|
| GLO-001 | §4.7 | Cross-dept calendar + filters | `college-tt-coordinator/global-overview/page.tsx` | `timetable.py:55` | `timetable` | UNVERIFIED | Partial | Filters limited; data largely empty until generation works | Feature | GEN-011 |
| GLO-002 | §4.7 | Approve/override any dept | global-overview | `timetable.py:160` | — | UNVERIFIED | Partial | See APPR-003 | Correctness | — |

## Out-of-scope items the repo contradicts

| ID | Brief ref | Expected | Evidence | Status | Note |
|---|---|---|---|---|---|
| OOS-001 | A8 | Faculty preferences out of scope | `faculty/preferences/page.tsx` present, fake save | Partial | UI exists but non-functional; `build-checklist.md` marks it done |
| OOS-002 | A9 | Notifications out of scope | none | Missing | OK |
| OOS-003 | A17 | Leave/substitutes out of scope | `hod/leaves/page.tsx` static | Partial | Contradicts brief + checklist marks done |
| OOS-004 | A18 | Exams out of scope | `college-tt-coordinator/exams/page.tsx` static | Partial | Contradicts brief + checklist marks done |

---

## Summary counts

| Status | Count |
|---|---|
| Complete | 9 |
| Partial | 24 |
| Broken | 14 |
| Missing | 17 |
| Blocked | 0 |
