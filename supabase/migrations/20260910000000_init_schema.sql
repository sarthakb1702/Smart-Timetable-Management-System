-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE user_role AS ENUM (
  'student', 'faculty', 'dept_tt_coordinator', 'hod',
  'college_tt_coordinator', 'superadmin'
);
CREATE TYPE session_type AS ENUM ('theory', 'lab');
CREATE TYPE room_type AS ENUM ('classroom', 'lab');
CREATE TYPE timetable_status AS ENUM ('draft', 'pending_approval', 'published', 'rejected');
CREATE TYPE slot_source AS ENUM ('regular', 'mdm', 'pe');
CREATE TYPE lock_status AS ENUM ('draft', 'locked');
CREATE TYPE selection_status AS ENUM ('selected', 'waitlisted', 'cancelled');
CREATE TYPE edit_action AS ENUM ('create', 'update', 'delete', 'publish', 'reject', 'submit');

-- 1. Org & Structure Tables
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sequence SMALLINT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_one_current_term_per_dept 
ON public.academic_terms (department_id) 
WHERE is_current = true;

CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  student_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id, academic_year_id, term_id, name)
);

CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  student_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(division_id, name)
);

-- 2. Users Table
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  employee_code TEXT,
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX one_college_tt_coordinator 
ON public.users(role) 
WHERE role = 'college_tt_coordinator';

-- Helper Functions for RLS Policy Scoping (Defined AFTER public.users)
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.auth_user_dept()
RETURNS UUID AS $$
  SELECT department_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Settings & Rules
CREATE TABLE public.college_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  working_days SMALLINT[] NOT NULL,
  day_start_time TIME NOT NULL,
  day_end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL,
  max_faculty_weekly_hours INT NOT NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_singleton CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

CREATE TABLE public.lunch_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
  day_of_week SMALLINT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  room_type room_type NOT NULL,
  capacity INT NOT NULL,
  equipment_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Courses & Mapping
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  credits INT NOT NULL,
  session_type session_type NOT NULL,
  is_mdm BOOLEAN NOT NULL DEFAULT false,
  parent_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.faculty_course_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(faculty_id, course_id)
);

CREATE TABLE public.room_course_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, course_id)
);

-- 6. Program Electives
CREATE TABLE public.elective_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  theory_credits INT NOT NULL DEFAULT 0,
  lab_credits INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id, academic_year_id, code)
);

CREATE TABLE public.room_elective_course_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  elective_course_id UUID NOT NULL REFERENCES public.elective_courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, elective_course_id)
);

CREATE TABLE public.elective_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  session_type session_type NOT NULL,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status lock_status NOT NULL DEFAULT 'draft',
  locked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id, academic_year_id, session_type)
);

CREATE TABLE public.elective_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elective_course_id UUID NOT NULL REFERENCES public.elective_courses(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  capacity INT NOT NULL,
  theory_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(elective_course_id, term_id)
);

CREATE TABLE public.student_elective_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  elective_option_id UUID NOT NULL REFERENCES public.elective_options(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  status selection_status NOT NULL DEFAULT 'selected',
  selected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, term_id)
);

CREATE TABLE public.elective_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elective_option_id UUID NOT NULL REFERENCES public.elective_options(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lab_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(elective_option_id, name)
);

CREATE TABLE public.elective_batch_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elective_batch_id UUID NOT NULL REFERENCES public.elective_batches(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(elective_batch_id, student_id)
);

-- 7. MDM
CREATE TABLE public.mdm_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status lock_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(academic_year_id)
);

CREATE TABLE public.mdm_slot_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mdm_slot_id UUID NOT NULL REFERENCES public.mdm_slots(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mdm_slot_id, course_id),
  UNIQUE(mdm_slot_id, room_id),
  UNIQUE(mdm_slot_id, faculty_id)
);

-- 8. Timetable
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  source_type slot_source NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  mdm_slot_option_id UUID REFERENCES public.mdm_slot_options(id) ON DELETE CASCADE,
  elective_option_id UUID REFERENCES public.elective_options(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  session_type session_type NOT NULL,
  status timetable_status NOT NULL DEFAULT 'draft',
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_source CHECK (
    (source_type = 'regular' AND course_id IS NOT NULL AND mdm_slot_option_id IS NULL AND elective_option_id IS NULL) OR
    (source_type = 'mdm'     AND mdm_slot_option_id IS NOT NULL AND course_id IS NULL AND elective_option_id IS NULL) OR
    (source_type = 'pe'      AND elective_option_id IS NOT NULL AND course_id IS NULL AND mdm_slot_option_id IS NULL)
  )
);

CREATE INDEX idx_tt_faculty_slot ON public.timetable (faculty_id, term_id, day_of_week, start_time);
CREATE INDEX idx_tt_room_slot    ON public.timetable (room_id, term_id, day_of_week, start_time);
CREATE INDEX idx_tt_division_slot ON public.timetable (division_id, batch_id, term_id, day_of_week, start_time);

CREATE TABLE public.timetable_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  status timetable_status NOT NULL DEFAULT 'draft',
  submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(term_id, department_id)
);

CREATE TABLE public.timetable_edit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_entry_id UUID REFERENCES public.timetable(id) ON DELETE SET NULL,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  action edit_action NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on All Public Tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lunch_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_course_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_course_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elective_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_elective_course_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elective_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elective_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_elective_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elective_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elective_batch_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdm_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdm_slot_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_edit_log ENABLE ROW LEVEL SECURITY;