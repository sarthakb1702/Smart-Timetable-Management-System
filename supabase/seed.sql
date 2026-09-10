-- 1. Seed Departments
INSERT INTO public.departments (id, name, code) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Information Technology', 'IT'),
  ('22222222-2222-2222-2222-222222222222', 'Computer Engineering', 'CE')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Academic Years & Terms
INSERT INTO public.academic_years (id, code, name, sequence) VALUES
  ('33333333-3333-3333-3333-333333333333', 'AY-2026-27', 'Academic Year 2026-2027', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academic_terms (id, department_id, name, start_date, end_date, is_current) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Fall 2026 (Sem 5)', '2026-08-01', '2026-12-15', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Rooms
INSERT INTO public.rooms (id, department_id, name, room_type, capacity) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Lab 101', 'lab', 30),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Classroom 302', 'classroom', 60),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Classroom 303', 'classroom', 60)
ON CONFLICT DO NOTHING;

-- 4. Seed Courses (Including academic_year_id, credits, and session_type)
INSERT INTO public.courses (id, department_id, academic_year_id, code, name, credits, session_type) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'IT501', 'Database Management Systems', 4, 'theory'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'IT502', 'Computer Networks Technology', 4, 'theory'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'IT503L', 'DBMS Lab', 2, 'lab')
ON CONFLICT DO NOTHING;