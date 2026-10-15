import time
import logging
from typing import List, Dict, Tuple, Optional, Any
from ortools.sat.python import cp_model

from app.schemas.timetable import (
    GenerateTimetableRequest,
    GenerateTimetableResponse,
    GeneratedSlot,
    SessionTypeEnum,
    SlotSourceEnum,
    TimetableStatusEnum,
    RoomTypeEnum,
    MDMSlotInput,
    ElectiveSlotInput,
)
from app.engine.constraints import (
    DaySlotGrid,
    time_to_minutes,
    minutes_to_time,
    is_time_overlapping,
)

logger = logging.getLogger(__name__)


class TimetableSolver:
    """
    Constraint satisfaction scheduler using Google OR-Tools CP-SAT.
    Enforces all 8 hard constraints:
      a. No faculty double-booking
      b. No room/lab double-booking
      c. No division/batch double-booking
      d. Slot durations (1 hr theory, 2 continuous hrs lab)
      e. Pre-locked MDM slots & PE slots
      f. Respect lunch breaks
      g. Faculty weekly workload limit
      h. Max 1 theory session per course per day for a division
    """

    def __init__(self, request: GenerateTimetableRequest):
        self.request = request
        self.model = cp_model.CpModel()

        # Grid configuration
        settings = request.settings
        working_days = settings.working_days if settings else [1, 2, 3, 4, 5, 6]
        day_start = settings.day_start_time if settings else "08:00:00"
        day_end = settings.day_end_time if settings else "17:00:00"
        slot_duration = settings.slot_duration_minutes if settings else 60

        self.grid = DaySlotGrid(
            working_days=working_days,
            day_start_time=day_start,
            day_end_time=day_end,
            slot_duration_minutes=slot_duration,
        )

        self.max_faculty_hours = (
            settings.max_faculty_weekly_hours if settings else 18
        )

        # Lookup structures
        self.faculties_map = {f.id: f for f in request.faculties}
        self.rooms_map = {r.id: r for r in request.rooms}
        self.classrooms = [r for r in request.rooms if r.room_type != RoomTypeEnum.lab]
        self.labs = [r for r in request.rooms if r.room_type == RoomTypeEnum.lab]

        # Fallback if specific room types missing
        if not self.classrooms:
            self.classrooms = request.rooms
        if not self.labs:
            self.labs = request.rooms

        # Lunch slots mapping: (division_id, day) -> set of slot indices
        self.lunch_slots_map: Dict[Tuple[str, int], set] = {}
        self._init_lunch_breaks()

        # Pre-locked slots: (division_id, day, slot_idx) -> locked info
        self.prelocked_slots: List[GeneratedSlot] = []
        self.locked_division_slots: Dict[Tuple[str, int, int], str] = {}
        self.locked_faculty_slots: Dict[Tuple[str, int, int], str] = {}
        self.locked_room_slots: Dict[Tuple[str, int, int], str] = {}
        self._init_prelocked_slots()

    def _init_lunch_breaks(self):
        """Map lunch break slot indices for each division and day."""
        default_lunch_start = (
            self.request.settings.lunch_start_time
            if self.request.settings
            else "12:00:00"
        )
        default_lunch_end = (
            self.request.settings.lunch_end_time
            if self.request.settings
            else "13:00:00"
        )

        for div in self.request.divisions:
            for day in self.grid.working_days:
                # Find specific lunch break or use default
                matched_lunch = None
                for lb in self.request.lunch_breaks:
                    if lb.day_of_week == day and (
                        lb.division_id is None or lb.division_id == div.id
                    ):
                        matched_lunch = lb
                        break

                l_start = matched_lunch.start_time if matched_lunch else default_lunch_start
                l_end = matched_lunch.end_time if matched_lunch else default_lunch_end

                overlap_indices = set(self.grid.find_slot_indices_for_window(l_start, l_end))
                self.lunch_slots_map[(div.id, day)] = overlap_indices

    def _init_prelocked_slots(self):
        """Pre-locks MDM slots and PE slots as fixed non-overlapping blocks.

        Each request entry is an *option* (MDM option / PE option) carrying its own
        faculty and room. Options that share the same day/window form one block; every
        division is reserved the whole window as a hard constraint, and one distinct
        option is emitted per division (round-robin) so persisted locked rows keep
        valid (non-clashing) faculty/room assignments.
        """
        # 1. MDM Slots (only locked blocks constrain the schedule)
        mdm_windows: Dict[Tuple[int, str, str], List[MDMSlotInput]] = {}
        for mdm in self.request.mdm_slots:
            if not mdm.is_locked:
                continue
            window = (mdm.day_of_week, mdm.start_time, mdm.end_time)
            mdm_windows.setdefault(window, []).append(mdm)
            self._reserve_block(
                "MDM", mdm.name, mdm.day_of_week, mdm.start_time, mdm.end_time,
                mdm.faculty_id, mdm.room_id,
            )
        for (day, start, end), options in mdm_windows.items():
            for idx, div in enumerate(self.request.divisions):
                option = options[idx % len(options)]
                self.prelocked_slots.append(
                    self._locked_slot(
                        div, day, start, end, SlotSourceEnum.mdm,
                        mdm_slot_option_id=option.id,
                        faculty_id=option.faculty_id, room_id=option.room_id,
                    )
                )

        # 2. Elective (PE) Slots (only locked blocks constrain the schedule)
        pe_windows: Dict[Tuple[int, str, str], List[ElectiveSlotInput]] = {}
        for pe in self.request.elective_slots:
            if not pe.is_locked:
                continue
            window = (pe.day_of_week, pe.start_time, pe.end_time)
            pe_windows.setdefault(window, []).append(pe)
            self._reserve_block(
                "PE", pe.name, pe.day_of_week, pe.start_time, pe.end_time,
                pe.faculty_id, pe.room_id,
            )
        for (day, start, end), options in pe_windows.items():
            for idx, div in enumerate(self.request.divisions):
                option = options[idx % len(options)]
                self.prelocked_slots.append(
                    self._locked_slot(
                        div, day, start, end, SlotSourceEnum.pe,
                        elective_option_id=option.id,
                        faculty_id=option.faculty_id, room_id=option.room_id,
                    )
                )

    def _reserve_block(self, kind, name, day, start, end, faculty_id, room_id):
        """Reserve a whole window for every division and lock its faculty/room resources."""
        slot_indices = self.grid.find_slot_indices_for_window(start, end)
        for div in self.request.divisions:
            for s_idx in slot_indices:
                self.locked_division_slots[(div.id, day, s_idx)] = f"{kind}: {name}"
        if faculty_id:
            for s_idx in slot_indices:
                self.locked_faculty_slots[(faculty_id, day, s_idx)] = name
        if room_id:
            for s_idx in slot_indices:
                self.locked_room_slots[(room_id, day, s_idx)] = name

    def _locked_slot(self, div, day, start, end, source, mdm_slot_option_id=None,
                     elective_option_id=None, faculty_id=None, room_id=None):
        return GeneratedSlot(
            term_id=self.request.term_id,
            department_id=self.request.department_id,
            academic_year_id=div.academic_year_id,
            division_id=div.id,
            division_name=div.name,
            day_of_week=day,
            start_time=start,
            end_time=end,
            session_type=SessionTypeEnum.theory,
            source_type=source,
            mdm_slot_option_id=mdm_slot_option_id,
            elective_option_id=elective_option_id,
            faculty_id=faculty_id,
            faculty_name=self.faculties_map[faculty_id].name if faculty_id in self.faculties_map else None,
            room_id=room_id,
            room_code=self.rooms_map[room_id].code if room_id in self.rooms_map else None,
            is_locked=True,
            status=TimetableStatusEnum.draft,
        )

    def _preflight_feasibility(self, theory_tasks, lab_tasks) -> None:
        """Lightweight demand-vs-supply checks to surface obvious infeasibility early."""
        total = len(theory_tasks) + len(lab_tasks)
        if total == 0:
            self.diagnostics.append({
                "type": "no_tasks",
                "severity": "error",
                "message": "No theory or lab sessions were requested. Check course weekly hours and division batches.",
            })
            return

        # Per-division demand vs. supply (only counting the division's own timetable).
        for div in self.request.divisions:
            locked = sum(
                1 for (d_id, _day, _s) in self.locked_division_slots if d_id == div.id
            )
            supply = (self.grid.slots_per_day * len(self.grid.working_days)) - locked
            demand = sum(c.weekly_theory_hours for c in self.request.courses)
            if demand > supply:
                self.diagnostics.append({
                    "type": "division_overload",
                    "severity": "warning",
                    "division": div.name,
                    "message": (
                        f"Division {div.name} needs {demand} theory hours but only {supply} "
                        f"non-locked slots are available this week."
                    ),
                })

        # Faculty load sanity: total load vs. combined capacity.
        total_hours = sum(c.weekly_theory_hours for c in self.request.courses) * max(1, len(self.request.divisions))
        total_hours += sum(c.weekly_lab_hours for c in self.request.courses) * max(1, len(self.request.divisions))
        faculty_capacity = sum(
            min(f.max_weekly_hours, self.max_faculty_hours) for f in self.request.faculties
        )
        if total_hours > faculty_capacity:
            self.diagnostics.append({
                "type": "faculty_capacity",
                "severity": "warning",
                "message": (
                    f"Total teaching demand (~{total_hours}h) exceeds combined faculty "
                    f"capacity ({faculty_capacity}h/week)."
                ),
            })

    def solve(self) -> GenerateTimetableResponse:
        start_time_ts = time.time()
        logger.info("Starting TimetableSolver with CP-SAT constraint formulation...")

        # Collect session requests
        # Theory sessions: 1-hour unit
        # Lab sessions: 2-hour continuous unit (Constraint d)
        theory_tasks: List[Dict[str, Any]] = []
        lab_tasks: List[Dict[str, Any]] = []

        task_id_counter = 0

        for div in self.request.divisions:
            for course in self.request.courses:
                # 1. Theory tasks
                for th_idx in range(course.weekly_theory_hours):
                    theory_tasks.append({
                        "task_id": task_id_counter,
                        "division": div,
                        "course": course,
                        "instance_idx": th_idx,
                        "duration_slots": 1,
                    })
                    task_id_counter += 1

                # 2. Lab tasks: 2 continuous slots per batch
                num_lab_blocks = max(1, course.weekly_lab_hours // 2) if course.weekly_lab_hours > 0 else 0
                if num_lab_blocks > 0 and div.batches:
                    for batch in div.batches:
                        for l_idx in range(num_lab_blocks):
                            lab_tasks.append({
                                "task_id": task_id_counter,
                                "division": div,
                                "batch": batch,
                                "course": course,
                                "instance_idx": l_idx,
                                "duration_slots": 2,  # Constraint d: 2 continuous hrs lab
                            })
                            task_id_counter += 1

        # F-01 fix: key tasks by their unique task_id (the id counter is shared
        # between theory and lab tasks, so list indexing by task_id is invalid).
        self.theory_tasks_by_id = {t["task_id"]: t for t in theory_tasks}
        self.lab_tasks_by_id = {t["task_id"]: t for t in lab_tasks}

        self.diagnostics: List[Dict[str, Any]] = []

        logger.info(f"Formulating model: {len(theory_tasks)} theory tasks, {len(lab_tasks)} lab tasks.")
        self._preflight_feasibility(theory_tasks, lab_tasks)

        # Decision Variables
        # X_theory[task_id, day, slot_idx, room_id, faculty_id] in {0, 1}
        # X_lab[task_id, day, start_slot_idx, room_id, faculty_id] in {0, 1}

        x_theory: Dict[Tuple[int, int, int, str, str], cp_model.IntVar] = {}
        x_lab: Dict[Tuple[int, int, int, str, str], cp_model.IntVar] = {}

        # Candidate candidate assignments
        for t in theory_tasks:
            t_id = t["task_id"]
            div = t["division"]
            course = t["course"]
            fac_ids = course.assigned_faculty_ids or [f.id for f in self.request.faculties]
            # ROOM-003: a classroom must seat the whole division.
            cand_rooms = [r for r in self.classrooms if r.capacity >= div.capacity]
            if not cand_rooms:
                cand_rooms = list(self.classrooms)
                t["capacity_relaxed"] = True

            for day in self.grid.working_days:
                lunch_indices = self.lunch_slots_map.get((div.id, day), set())
                for s_idx in range(self.grid.slots_per_day):
                    # Hard Constraint f: Respect lunch breaks
                    if s_idx in lunch_indices:
                        continue
                    # Hard Constraint e: Pre-locked MDM / PE blocks
                    if (div.id, day, s_idx) in self.locked_division_slots:
                        continue

                    for r in cand_rooms:
                        if (r.id, day, s_idx) in self.locked_room_slots:
                            continue
                        for fid in fac_ids:
                            if (fid, day, s_idx) in self.locked_faculty_slots:
                                continue
                            var = self.model.NewBoolVar(f"th_{t_id}_{day}_{s_idx}_{r.id[:4]}_{fid[:4]}")
                            x_theory[(t_id, day, s_idx, r.id, fid)] = var

        for t in lab_tasks:
            t_id = t["task_id"]
            div = t["division"]
            batch = t["batch"]
            course = t["course"]
            fac_ids = course.assigned_faculty_ids or [f.id for f in self.request.faculties]
            # ROOM-003: lab must seat the batch and (if mapped) match room_course_map.
            cand_rooms = list(self.labs)
            if course.allowed_room_ids:
                mapped = [r for r in cand_rooms if r.id in course.allowed_room_ids]
                if mapped:
                    cand_rooms = mapped
                else:
                    t["room_mapping_missing"] = True
            sized = [r for r in cand_rooms if r.capacity >= batch.student_count]
            if sized:
                cand_rooms = sized
            elif cand_rooms:
                t["capacity_relaxed"] = True
            else:
                cand_rooms = list(self.labs)

            for day in self.grid.working_days:
                lunch_indices = self.lunch_slots_map.get((div.id, day), set())
                # Constraint d: 2 continuous hours lab -> start_slot + 1 < slots_per_day
                for s_idx in range(self.grid.slots_per_day - 1):
                    # Hard Constraint f: Respect lunch breaks (neither slot 1 nor slot 2 can be lunch)
                    if s_idx in lunch_indices or (s_idx + 1) in lunch_indices:
                        continue
                    # Hard Constraint e: Pre-locked slots
                    if ((div.id, day, s_idx) in self.locked_division_slots or
                        (div.id, day, s_idx + 1) in self.locked_division_slots):
                        continue

                    for r in cand_rooms:
                        if ((r.id, day, s_idx) in self.locked_room_slots or
                            (r.id, day, s_idx + 1) in self.locked_room_slots):
                            continue
                        for fid in fac_ids:
                            if ((fid, day, s_idx) in self.locked_faculty_slots or
                                (fid, day, s_idx + 1) in self.locked_faculty_slots):
                                continue
                            var = self.model.NewBoolVar(f"lab_{t_id}_{day}_{s_idx}_{r.id[:4]}_{fid[:4]}")
                            x_lab[(t_id, day, s_idx, r.id, fid)] = var

        # --------------------------------------------------------------------------
        # Constraint: Each task scheduled exactly once
        # --------------------------------------------------------------------------
        self.no_candidate_tasks: List[Dict[str, Any]] = []

        for t in theory_tasks:
            t_id = t["task_id"]
            vars_for_task = [v for k, v in x_theory.items() if k[0] == t_id]
            if vars_for_task:
                self.model.Add(cp_model.LinearExpr.Sum(vars_for_task) == 1)
            else:
                self.no_candidate_tasks.append({
                    "type": "theory",
                    "course_code": t["course"].code,
                    "division": t["division"].name,
                    "reason": "No legal slot/room/faculty combination left (all candidate slots are lunch, pre-locked MDM/PE, or conflict with locked resources).",
                })

        for t in lab_tasks:
            t_id = t["task_id"]
            vars_for_task = [v for k, v in x_lab.items() if k[0] == t_id]
            if vars_for_task:
                self.model.Add(cp_model.LinearExpr.Sum(vars_for_task) == 1)
            else:
                self.no_candidate_tasks.append({
                    "type": "lab",
                    "course_code": t["course"].code,
                    "division": t["division"].name,
                    "batch": t["batch"].name,
                    "reason": "No legal 2-hour lab block + suitable lab room could be reserved.",
                })

        # --------------------------------------------------------------------------
        # Hard Constraint a: No faculty double-booking
        # At any (day, s_idx), a faculty can be in at most 1 session
        # --------------------------------------------------------------------------
        for f in self.request.faculties:
            for day in self.grid.working_days:
                for s_idx in range(self.grid.slots_per_day):
                    faculty_slots = []
                    # Theory sessions active at s_idx
                    for (t_id, d, s, r_id, fid), var in x_theory.items():
                        if fid == f.id and d == day and s == s_idx:
                            faculty_slots.append(var)
                    # Lab sessions active at s_idx (covers start_slot and start_slot + 1)
                    for (t_id, d, s, r_id, fid), var in x_lab.items():
                        if fid == f.id and d == day and (s == s_idx or s + 1 == s_idx):
                            faculty_slots.append(var)

                    if faculty_slots:
                        self.model.Add(cp_model.LinearExpr.Sum(faculty_slots) <= 1)

        # --------------------------------------------------------------------------
        # Hard Constraint b: No room/lab double-booking
        # At any (day, s_idx), a room can hold at most 1 session
        # --------------------------------------------------------------------------
        for r in self.request.rooms:
            for day in self.grid.working_days:
                for s_idx in range(self.grid.slots_per_day):
                    room_slots = []
                    for (t_id, d, s, r_id, fid), var in x_theory.items():
                        if r_id == r.id and d == day and s == s_idx:
                            room_slots.append(var)
                    for (t_id, d, s, r_id, fid), var in x_lab.items():
                        if r_id == r.id and d == day and (s == s_idx or s + 1 == s_idx):
                            room_slots.append(var)

                    if room_slots:
                        self.model.Add(cp_model.LinearExpr.Sum(room_slots) <= 1)

        # --------------------------------------------------------------------------
        # Hard Constraint c: No division/batch double-booking
        # - If a division has a theory class at (day, s_idx), no batch can have a lab.
        # - For each batch, at most 1 session at (day, s_idx).
        # --------------------------------------------------------------------------
        for div in self.request.divisions:
            for day in self.grid.working_days:
                for s_idx in range(self.grid.slots_per_day):
                    theory_div_vars = [
                        var
                        for (t_id, d, s, r_id, fid), var in x_theory.items()
                        if self.theory_tasks_by_id[t_id]["division"].id == div.id
                        and d == day
                        and s == s_idx
                    ]

                    # At most 1 theory session for the whole division at (day, s_idx)
                    if theory_div_vars:
                        self.model.Add(cp_model.LinearExpr.Sum(theory_div_vars) <= 1)

                    # For each batch of division:
                    for batch in div.batches:
                        batch_lab_vars = [
                            var
                            for (t_id, d, s, r_id, fid), var in x_lab.items()
                            if self.lab_tasks_by_id[t_id]["batch"].id == batch.id
                            and d == day
                            and (s == s_idx or s + 1 == s_idx)
                        ]
                        # Theory + batch lab <= 1 (if theory occurs, batch lab cannot occur)
                        total_batch_activity = theory_div_vars + batch_lab_vars
                        if total_batch_activity:
                            self.model.Add(cp_model.LinearExpr.Sum(total_batch_activity) <= 1)

        # --------------------------------------------------------------------------
        # Hard Constraint g: Faculty weekly workload limit (max_faculty_weekly_hours)
        # --------------------------------------------------------------------------
        for f in self.request.faculties:
            limit = min(f.max_weekly_hours, self.max_faculty_hours)
            fac_workload_terms = []

            # Theory = 1 hour each
            for (t_id, d, s, r_id, fid), var in x_theory.items():
                if fid == f.id:
                    fac_workload_terms.append(var)

            # Lab = 2 hours each
            for (t_id, d, s, r_id, fid), var in x_lab.items():
                if fid == f.id:
                    fac_workload_terms.append(2 * var)

            if fac_workload_terms:
                self.model.Add(cp_model.LinearExpr.Sum(fac_workload_terms) <= limit)

        # --------------------------------------------------------------------------
        # Hard Constraint h: Max 1 theory session per course per day for a division
        # --------------------------------------------------------------------------
        for div in self.request.divisions:
            for course in self.request.courses:
                for day in self.grid.working_days:
                    course_day_theory = [
                        var
                        for (t_id, d, s, r_id, fid), var in x_theory.items()
                        if self.theory_tasks_by_id[t_id]["division"].id == div.id
                        and self.theory_tasks_by_id[t_id]["course"].id == course.id
                        and d == day
                    ]
                    if course_day_theory:
                        self.model.Add(cp_model.LinearExpr.Sum(course_day_theory) <= 1)

        # --------------------------------------------------------------------------
        # Soft Objectives: Balance schedule across mornings/afternoons and minimize gaps
        # --------------------------------------------------------------------------
        penalty_terms = []
        for (t_id, d, s, r_id, fid), var in x_theory.items():
            # Slight preference for earlier slots (s)
            penalty_terms.append(s * var)

        for (t_id, d, s, r_id, fid), var in x_lab.items():
            penalty_terms.append(s * var)

        if penalty_terms:
            self.model.Minimize(cp_model.LinearExpr.Sum(penalty_terms))

        # Solve Model — DEC-11: hard cap (default 60s); prefer best feasible solution.
        configured_limit = (
            self.request.settings.max_solver_time_seconds
            if self.request.settings
            and getattr(self.request.settings, "max_solver_time_seconds", None)
            else 60
        )
        solver_time_limit = float(max(1, min(int(configured_limit), 60)))
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = solver_time_limit
        solver.parameters.num_search_workers = 4

        solver_status = solver.Solve(self.model)
        solve_duration = time.time() - start_time_ts

        status_name = solver.StatusName(solver_status)
        is_success = solver_status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        timed_out = solver_status == cp_model.UNKNOWN

        logger.info(f"CP-SAT finished in {solve_duration:.2f}s with status {status_name}")

        generated_slots: List[GeneratedSlot] = list(self.prelocked_slots)
        unallocated: List[Dict[str, Any]] = list(self.no_candidate_tasks)
        diagnostics: List[Dict[str, Any]] = list(self.diagnostics)

        if is_success:
            # Extract theory assignments
            for (t_id, d, s, r_id, fid), var in x_theory.items():
                if solver.Value(var) == 1:
                    t = self.theory_tasks_by_id[t_id]
                    start_str, end_str = self.grid.get_slot_interval(s)
                    room = self.rooms_map.get(r_id)
                    fac = self.faculties_map.get(fid)

                    generated_slots.append(
                        GeneratedSlot(
                            term_id=self.request.term_id,
                            department_id=self.request.department_id,
                            academic_year_id=t["division"].academic_year_id,
                            division_id=t["division"].id,
                            division_name=t["division"].name,
                            batch_id=None,
                            batch_name=None,
                            day_of_week=d,
                            start_time=start_str,
                            end_time=end_str,
                            session_type=SessionTypeEnum.theory,
                            source_type=SlotSourceEnum.regular,
                            course_id=t["course"].id,
                            course_code=t["course"].code,
                            course_name=t["course"].name,
                            faculty_id=fid,
                            faculty_name=fac.name if fac else None,
                            room_id=r_id,
                            room_code=room.code if room else None,
                            is_locked=False,
                            status=TimetableStatusEnum.draft,
                        )
                    )

            # Extract lab assignments (spans 2 slots: start_slot to start_slot + 1)
            for (t_id, d, s, r_id, fid), var in x_lab.items():
                if solver.Value(var) == 1:
                    t = self.lab_tasks_by_id[t_id]
                    start_str, _ = self.grid.get_slot_interval(s)
                    _, end_str = self.grid.get_slot_interval(s + 1)
                    room = self.rooms_map.get(r_id)
                    fac = self.faculties_map.get(fid)

                    generated_slots.append(
                        GeneratedSlot(
                            term_id=self.request.term_id,
                            department_id=self.request.department_id,
                            academic_year_id=t["division"].academic_year_id,
                            division_id=t["division"].id,
                            division_name=t["division"].name,
                            batch_id=t["batch"].id,
                            batch_name=t["batch"].name,
                            day_of_week=d,
                            start_time=start_str,
                            end_time=end_str,
                            session_type=SessionTypeEnum.lab,
                            source_type=SlotSourceEnum.regular,
                            course_id=t["course"].id,
                            course_code=t["course"].code,
                            course_name=t["course"].name,
                            faculty_id=fid,
                            faculty_name=fac.name if fac else None,
                            room_id=r_id,
                            room_code=room.code if room else None,
                            is_locked=False,
                            status=TimetableStatusEnum.draft,
                        )
                    )
            is_complete = is_success and not unallocated
        else:
            is_complete = False
            if not unallocated:
                unallocated = [
                    {
                        "type": "solver_infeasible",
                        "reason": f"Solver returned status {status_name}.",
                        "message": (
                            "The hard constraints are unsatisfiable with the current resources. "
                            "Review faculty load limits, room capacity/availability, lab batch sizes, "
                            "and pre-locked MDM/PE slots."
                        ),
                    }
                ]
            diagnostics.append({
                "type": "solver_infeasible",
                "severity": "error",
                "message": f"CP-SAT status: {status_name}.",
            })

        message = (
            f"Timetable generation completed with {len(generated_slots)} slots."
            if is_success
            else (
                f"Timetable generation timed out ({status_name}) before finding a feasible schedule."
                if timed_out
                else f"Timetable generation failed ({status_name}). Adjust faculty hours, room availability or slot constraints."
            )
        )
        if is_success and unallocated:
            message += f" {len(unallocated)} session(s) could not be placed."

        return GenerateTimetableResponse(
            success=is_success,
            status=status_name,
            message=message,
            total_slots_generated=len(generated_slots),
            solver_time_seconds=round(solve_duration, 3),
            slots=generated_slots,
            unallocated_courses=unallocated,
            is_complete=is_complete,
            timed_out=timed_out,
            diagnostics=diagnostics,
        )
