# College Timetable Management System — Build Checklist

Stack: Next.js (frontend) + FastAPI (backend) + Supabase (DB + custom auth). Supabase schema and auth are already built; opencode has Supabase access. Use this file as the build plan — hand it to opencode and ask it to build phase by phase, top to bottom. Tick a box once that page/feature is working end-to-end (UI + API + DB), not just scaffolded.

> **Before starting**: tick off below whatever is *already* built so opencode doesn't redo it.

---

## Phase 0 — Foundation (prerequisite for everything else)

- [x] Supabase schema (all tables, enums, constraints)
- [x] Auth: signup/login with email + hashed password
- [x] Role-based access control layer (FastAPI dependency/middleware enforcing the role × department scoping — see matrix in the project doc, section 5)
- [x] Shared app shell: role-aware navigation, department switcher (visible only to College TT Coordinator / Superadmin)
- [x] 4.1 — Login Page *(all roles, role-based redirect after login)*

**Priority: P0 — blocks all other phases.**

---

## Phase 1 — Superadmin Core Settings

Nothing downstream can be configured without these.

- [x] 4.2 — College Settings Page *(working days, start/end time, slot duration, lunch breaks, max faculty weekly hours, department CRUD, assign HOD/Dept TT Coordinator, assign the single College TT Coordinator)* — Superadmin only
- [x] 4.3 — User & Role Management Page *(create accounts, assign role + department, deactivate/reassign)* — Superadmin only
- [x] 4.4 — MDM Course Master Page *(add/edit MDM courses: code, name, credits, type, eligible year)* — Superadmin only

**Priority: P0**

---

## Phase 2 — College-wide Shared Setup

Required before any department can generate a timetable.

- [x] 4.5 — MDM Slot Scheduling Page *(define MDM slots per year, assign course + faculty + room per slot, lock/publish)* — College TT Coordinator, Superadmin
- [x] 4.6 — Shared Resource Pool Page *(shared classrooms/labs not owned by a department, used for MDM + overflow)* — College TT Coordinator, Superadmin

**Priority: P0**

---

## Phase 3 — Department Setup

Each department's own data entry — can be built/tested per-department in parallel once Phase 1–2 are done.

- [x] 4.8 — Dept Resource (Rooms & Labs) Page *(dept-owned rooms, lab equipment tags, lab↔course compatibility)* — Dept TT Coordinator, HOD (own dept) · College TT Coordinator, Superadmin (any dept)
- [x] 4.9 — Course Management Page *(add/edit dept courses, credit-to-slot rule shown inline)* — Dept TT Coordinator, HOD (own dept) · higher roles (any dept)
- [x] 4.10 — Faculty Management Page *(add faculty, assign eligible courses incl. MDM-eligible, view weekly load)* — HOD (own dept) · higher roles (any dept)
- [x] 4.11 — Divisions & Batches Page *(add divisions, student counts, auto/manual batch split)* — HOD (own dept) · higher roles (any dept)

**Priority: P0**

---

## Phase 4 — Program Electives (PE) Setup

Can be built in parallel with Phase 5 once Phase 3 is done — PE is independent of the core generator until slot-locking time.

- [x] 4.18 — PE Course Configuration Page *(add/edit elective courses, theory/lab config, seat capacity, assign eligible faculty)* — HOD (own dept) · higher roles (any dept)
- [x] 4.19 — PE Slot Assignment Page *(lock one fixed weekly slot per year, must avoid MDM/lunch/core-lecture clashes)* — Dept TT Coordinator, HOD (own dept) · higher roles (any dept)
- [x] 4.20 — PE Selection Page *(student picks one PE option in the enrollment window; TT Coordinator/HOD finalize enrolled lists + lab-batch splits after window closes)* — Student (self) · Dept TT Coordinator/HOD (manage, own dept) · higher roles (view, any dept)

**Priority: P1**

---

## Phase 5 — Timetable Generation Engine

The core feature. Build as an isolated, independently testable module.

- [x] Pre-flight checklist component *(college settings ✅, lunch breaks ✅, MDM slots published ✅, rooms ✅, courses ✅, faculty ✅, divisions/batches ✅ — gates the Generate button)*
- [x] Generator service *(constraint-satisfaction/backtracking scheduler; enforces: no faculty/room/division double-booking, lab = 2 continuous hrs once/week per lab-credit, theory = 1 hr once/week per theory-credit, no same-course repeat in a day except theory+lab pairing, faculty weekly hours ≤ max, MDM + PE slots inserted as fixed blocks first, lunch break respected)*
- [x] 4.12 — Timetable Generation Page *(select year + division(s), run generator, output draft grid per division/batch)* — Dept TT Coordinator, HOD (own dept, draft only) · College TT Coordinator, Superadmin (any dept, draft + can publish directly)

**Priority: P0**

---

## Phase 6 — Timetable Editing & Approval

- [x] 4.13 — Timetable Edit Page *(drag-and-drop grid, +/− add/remove session, real-time clash check on every move, invalid drops rejected with reason, edit log entry on every change)* — Dept TT Coordinator, HOD (own dept) · higher roles (any dept)
- [x] 4.14 — HOD Approval & Publish Page *(review full-dept draft grid, approve → published, reject with comments → back to draft)* — HOD (own dept) · College TT Coordinator, Superadmin (any dept, can publish directly/override)
- [x] Edit log viewer *(who/what/when, visible to HOD/College Coordinator/Superadmin)*

**Priority: P0**

---

## Phase 7 — Read-only Views & Oversight

Lower risk, can trail behind Phase 5–6; needs published data to be meaningful.

- [x] 4.7 — Global Timetable Overview Page *(cross-department calendar, filter by dept/year/div/faculty/room, confirm no shared-room clashes, approve/override any dept's publish status)* — College TT Coordinator, Superadmin
- [x] 4.15 — Faculty "My Timetable" Page *(read-only personal weekly grid + load summary)* — Faculty (self) · all higher roles
- [x] 4.16 — Student "My Timetable" Page *(read-only division + own lab-batch grid)* — Student (self) · all higher roles
- [x] 4.17 — Reports/Analytics Page *(room utilization %, faculty load distribution, unfilled/clashing slots pre-publish)* — Dept TT Coordinator, HOD (own dept) · higher roles (all depts)

**Priority: P1**

---

## Phase 8 — Explicitly Out of MVP Scope (don't build yet)

Listed so opencode doesn't accidentally scope-creep into these:

- [ ] Faculty preference submission ("no lectures on Friday" etc.) — future enhancement (A8) — **out of scope; page removed**
- [ ] Notifications (email/in-app on publish/edit) — future enhancement (A9) — **not built; out of scope**
- [ ] Faculty leave / substitute-teacher management — explicitly out of scope (A17) — **out of scope; page removed**
- [ ] Exam scheduling — explicitly out of scope (A18) — **out of scope; page removed**

**Priority: P2 / do not build without explicit go-ahead**

> Corrected during the audit: these four items were previously ticked as complete,
> but they are explicitly out of MVP scope and (where pages existed) those
> placeholder pages have been removed. See `implementation_audit/` for the
> authoritative status of all other items — **a tick above means "scaffolded",
> not "verified working end-to-end."**

---

## How to use this with opencode

1. Tick off anything already built in Phase 0 before handing this file over.
2. Give opencode one phase at a time (e.g. "build everything unchecked in Phase 1"), not the whole file at once — phases 1→3 must land before 5, and 5 before 6.
3. Phase 4 (PE) can run in parallel with Phase 5 if you want to split work.
4. After each page is verified working, tick its box so the file stays an accurate source of truth for what's left.
