-- Enable RLS on core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 1. Users Table Access
CREATE POLICY "Users can read own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Coordinators and Admins can view department users" 
ON public.users FOR SELECT 
USING (
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator') OR
  (public.auth_user_role() IN ('dept_tt_coordinator', 'hod') AND department_id = public.auth_user_dept())
);

-- 2. Timetable Read & Write Rules
CREATE POLICY "Everyone authenticated can view published timetables" 
ON public.timetable FOR SELECT 
USING (
  status = 'published' OR 
  public.auth_user_role() IN ('superadmin', 'college_tt_coordinator') OR
  (public.auth_user_role() IN ('dept_tt_coordinator', 'hod') AND department_id = public.auth_user_dept())
);

CREATE POLICY "Department Coordinators can edit draft timetables" 
ON public.timetable FOR ALL 
USING (
  public.auth_user_role() = 'dept_tt_coordinator' AND 
  department_id = public.auth_user_dept()
);

-- 3. Courses Read Policies
CREATE POLICY "Authenticated users can read courses" 
ON public.courses FOR SELECT 
TO authenticated 
USING (true);

-- 4. Rooms Read Policies
CREATE POLICY "Authenticated users can read rooms" 
ON public.rooms FOR SELECT 
TO authenticated 
USING (true);