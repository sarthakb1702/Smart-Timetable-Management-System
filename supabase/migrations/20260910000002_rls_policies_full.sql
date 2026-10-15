-- ============================================================================
-- Full Row Level Security policies (Phase 2)
-- Idempotent: safe to re-run. Applies to all public tables.
-- Uses helper functions public.auth_user_role() / public.auth_user_dept(),
-- which read the caller's row from public.users via auth.uid().
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Reference / org data
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Departments readable by authenticated" ON public.departments;
CREATE POLICY "Departments readable by authenticated"
ON public.departments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage departments" ON public.departments;
CREATE POLICY "Admins manage departments"
ON public.departments FOR ALL
USING (public.auth_user_role() = 'superadmin')
WITH CHECK (public.auth_user_role() = 'superadmin');

DROP POLICY IF EXISTS "Academic years readable by authenticated" ON public.academic_years;
CREATE POLICY "Academic years readable by authenticated"
ON public.academic_years FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage academic years" ON public.academic_years;
CREATE POLICY "Admins manage academic years"
ON public.academic_years FOR ALL
USING (public.auth_user_role() = 'superadmin')
WITH CHECK (public.auth_user_role() = 'superadmin');

-- ---------------------------------------------------------------------------
-- Academic terms (DEC-13: locked/historical terms are read-only)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Terms readable within scope" ON public.academic_terms;
CREATE POLICY "Terms readable within scope"
ON public.academic_terms FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id = public.auth_user_dept()
);

DROP POLICY IF EXISTS "Admins manage terms" ON public.academic_terms;
CREATE POLICY "Admins manage terms"
ON public.academic_terms FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (public.auth_user_role() IN ('hod', 'dept_tt_coordinator') AND department_id = public.auth_user_dept())
)
WITH CHECK (
  (public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
    OR (public.auth_user_role() IN ('hod', 'dept_tt_coordinator') AND department_id = public.auth_user_dept()))
  AND (is_locked = false OR public.auth_user_role() IN ('superadmin', 'college_tt_coordinator'))
);

-- ---------------------------------------------------------------------------
-- Divisions & batches
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Divisions readable within scope" ON public.divisions;
CREATE POLICY "Divisions readable within scope"
ON public.divisions FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id = public.auth_user_dept()
);

DROP POLICY IF EXISTS "Admins manage divisions" ON public.divisions;
CREATE POLICY "Admins manage divisions"
ON public.divisions FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (public.auth_user_role() IN ('hod', 'dept_tt_coordinator') AND department_id = public.auth_user_dept())
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (public.auth_user_role() IN ('hod', 'dept_tt_coordinator') AND department_id = public.auth_user_dept())
);

DROP POLICY IF EXISTS "Batches readable within scope" ON public.batches;
CREATE POLICY "Batches readable within scope"
ON public.batches FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.divisions d
    WHERE d.id = batches.division_id AND d.department_id = public.auth_user_dept()
  )
);

DROP POLICY IF EXISTS "Admins manage batches" ON public.batches;
CREATE POLICY "Admins manage batches"
ON public.batches FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.divisions d
    WHERE d.id = batches.division_id AND d.department_id = public.auth_user_dept()
  )
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.divisions d
    WHERE d.id = batches.division_id AND d.department_id = public.auth_user_dept()
  )
);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Coordinators and Admins can view department users" ON public.users;
CREATE POLICY "Coordinators and Admins can view department users"
ON public.users FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (public.auth_user_role() IN ('dept_tt_coordinator', 'hod') AND department_id = public.auth_user_dept())
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins manage users" ON public.users;
CREATE POLICY "Admins manage users"
ON public.users FOR ALL
USING (public.auth_user_role() = 'superadmin')
WITH CHECK (public.auth_user_role() = 'superadmin');

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "College settings readable by authenticated" ON public.college_settings;
CREATE POLICY "College settings readable by authenticated"
ON public.college_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage college settings" ON public.college_settings;
CREATE POLICY "Admins manage college settings"
ON public.college_settings FOR ALL
USING (public.auth_user_role() = 'superadmin')
WITH CHECK (public.auth_user_role() = 'superadmin');

DROP POLICY IF EXISTS "Lunch breaks readable within scope" ON public.lunch_breaks;
CREATE POLICY "Lunch breaks readable within scope"
ON public.lunch_breaks FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id IS NULL
  OR department_id = public.auth_user_dept()
);

DROP POLICY IF EXISTS "Admins manage lunch breaks" ON public.lunch_breaks;
CREATE POLICY "Admins manage lunch breaks"
ON public.lunch_breaks FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
);

-- ---------------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can read rooms" ON public.rooms;
CREATE POLICY "Rooms readable within scope"
ON public.rooms FOR SELECT TO authenticated
USING (
  department_id IS NULL
  OR public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id = public.auth_user_dept()
);

DROP POLICY IF EXISTS "Admins manage rooms" ON public.rooms;
CREATE POLICY "Admins manage rooms"
ON public.rooms FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
);

-- ---------------------------------------------------------------------------
-- Courses & mappings
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can read courses" ON public.courses;
CREATE POLICY "Courses readable by authenticated"
ON public.courses FOR SELECT TO authenticated
USING (
  is_mdm = true
  OR department_id IS NULL
  OR public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id = public.auth_user_dept()
);

DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses"
ON public.courses FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (is_mdm = false AND department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (is_mdm = false AND department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
);

DROP POLICY IF EXISTS "Faculty-course maps readable" ON public.faculty_course_map;
CREATE POLICY "Faculty-course maps readable"
ON public.faculty_course_map FOR SELECT TO authenticated
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = faculty_course_map.course_id AND c.department_id = public.auth_user_dept()
  )
);

DROP POLICY IF EXISTS "Admins manage faculty-course maps" ON public.faculty_course_map;
CREATE POLICY "Admins manage faculty-course maps"
ON public.faculty_course_map FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = faculty_course_map.course_id AND c.department_id = public.auth_user_dept()
  )
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = faculty_course_map.course_id AND c.department_id = public.auth_user_dept()
  )
);

DROP POLICY IF EXISTS "Room-course maps readable" ON public.room_course_map;
CREATE POLICY "Room-course maps readable"
ON public.room_course_map FOR SELECT TO authenticated
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = room_course_map.course_id AND c.department_id = public.auth_user_dept()
  )
);

DROP POLICY IF EXISTS "Admins manage room-course maps" ON public.room_course_map;
CREATE POLICY "Admins manage room-course maps"
ON public.room_course_map FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = room_course_map.course_id AND c.department_id = public.auth_user_dept()
  )
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = room_course_map.course_id AND c.department_id = public.auth_user_dept()
  )
);

-- ---------------------------------------------------------------------------
-- Electives
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Elective courses readable within scope" ON public.elective_courses;
CREATE POLICY "Elective courses readable within scope"
ON public.elective_courses FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id = public.auth_user_dept()
);

DROP POLICY IF EXISTS "Admins manage elective courses" ON public.elective_courses;
CREATE POLICY "Admins manage elective courses"
ON public.elective_courses FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
);

DROP POLICY IF EXISTS "Elective slots readable within scope" ON public.elective_slots;
CREATE POLICY "Elective slots readable within scope"
ON public.elective_slots FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id = public.auth_user_dept()
);

DROP POLICY IF EXISTS "Admins manage elective slots" ON public.elective_slots;
CREATE POLICY "Admins manage elective slots"
ON public.elective_slots FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (department_id = public.auth_user_dept()
      AND public.auth_user_role() IN ('hod', 'dept_tt_coordinator'))
);

DROP POLICY IF EXISTS "Elective options readable within scope" ON public.elective_options;
CREATE POLICY "Elective options readable within scope"
ON public.elective_options FOR SELECT TO authenticated
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.elective_courses ec
    WHERE ec.id = elective_options.elective_course_id
      AND ec.department_id = public.auth_user_dept()
  )
);

DROP POLICY IF EXISTS "Admins manage elective options" ON public.elective_options;
CREATE POLICY "Admins manage elective options"
ON public.elective_options FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.elective_courses ec
    WHERE ec.id = elective_options.elective_course_id
      AND ec.department_id = public.auth_user_dept()
  )
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR EXISTS (
    SELECT 1 FROM public.elective_courses ec
    WHERE ec.id = elective_options.elective_course_id
      AND ec.department_id = public.auth_user_dept()
  )
);

-- Students: read/insert only their own selections
DROP POLICY IF EXISTS "Students manage own selections" ON public.student_elective_selections;
CREATE POLICY "Students manage own selections"
ON public.student_elective_selections FOR ALL
USING (
  student_id = auth.uid()
  OR public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
)
WITH CHECK (
  student_id = auth.uid()
  OR public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
);

-- ---------------------------------------------------------------------------
-- MDM (college-wide; readable by authenticated, managed by global roles)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "MDM slots readable by authenticated" ON public.mdm_slots;
CREATE POLICY "MDM slots readable by authenticated"
ON public.mdm_slots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage MDM slots" ON public.mdm_slots;
CREATE POLICY "Admins manage MDM slots"
ON public.mdm_slots FOR ALL
USING (public.auth_user_role() IN ('superadmin', 'college_tt_coordinator'))
WITH CHECK (public.auth_user_role() IN ('superadmin', 'college_tt_coordinator'));

DROP POLICY IF EXISTS "MDM options readable by authenticated" ON public.mdm_slot_options;
CREATE POLICY "MDM options readable by authenticated"
ON public.mdm_slot_options FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage MDM options" ON public.mdm_slot_options;
CREATE POLICY "Admins manage MDM options"
ON public.mdm_slot_options FOR ALL
USING (public.auth_user_role() IN ('superadmin', 'college_tt_coordinator'))
WITH CHECK (public.auth_user_role() IN ('superadmin', 'college_tt_coordinator'));

-- ---------------------------------------------------------------------------
-- Timetable, approvals & edit log
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Everyone authenticated can view published timetables" ON public.timetable;
DROP POLICY IF EXISTS "Department Coordinators can edit draft timetables" ON public.timetable;

CREATE POLICY "Timetable readable within scope"
ON public.timetable FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (public.auth_user_role() IN ('hod', 'dept_tt_coordinator') AND department_id = public.auth_user_dept())
  OR (public.auth_user_role() = 'faculty' AND faculty_id = auth.uid())
  OR (public.auth_user_role() = 'student' AND department_id = public.auth_user_dept() AND status = 'published')
);

CREATE POLICY "Admins manage timetable within scope"
ON public.timetable FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (public.auth_user_role() IN ('hod', 'dept_tt_coordinator') AND department_id = public.auth_user_dept())
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (public.auth_user_role() IN ('hod', 'dept_tt_coordinator') AND department_id = public.auth_user_dept())
);

DROP POLICY IF EXISTS "Approvals readable within scope" ON public.timetable_approvals;
CREATE POLICY "Approvals readable within scope"
ON public.timetable_approvals FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id = public.auth_user_dept()
);

DROP POLICY IF EXISTS "Admins manage approvals within scope" ON public.timetable_approvals;
CREATE POLICY "Admins manage approvals within scope"
ON public.timetable_approvals FOR ALL
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (public.auth_user_role() IN ('hod', 'dept_tt_coordinator') AND department_id = public.auth_user_dept())
)
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR (public.auth_user_role() IN ('hod', 'dept_tt_coordinator') AND department_id = public.auth_user_dept())
);

DROP POLICY IF EXISTS "Edit log readable within scope" ON public.timetable_edit_log;
CREATE POLICY "Edit log readable within scope"
ON public.timetable_edit_log FOR SELECT
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id = public.auth_user_dept()
);

DROP POLICY IF EXISTS "Admins write edit log within scope" ON public.timetable_edit_log;
CREATE POLICY "Admins write edit log within scope"
ON public.timetable_edit_log FOR INSERT
WITH CHECK (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator')
  OR department_id = public.auth_user_dept()
);
