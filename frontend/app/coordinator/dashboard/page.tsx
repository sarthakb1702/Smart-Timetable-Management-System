import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/supabase'
import {
  CoordinatorDashboardClient,
  CourseRow,
  RoomRow,
  DivisionRow,
  BatchRow,
  TimetableRow,
  UserRow,
} from '@/components/coordinator/CoordinatorDashboardClient'

// Default fallback data if live database tables are not yet seeded
const FALLBACK_COURSES: CourseRow[] = [
  {
    id: 'c-cs501',
    code: 'CS501',
    name: 'Database Management Systems',
    credits: 4,
    academic_year_id: 'ay-2026-27',
    department_id: 'dept-cs-1',
    is_mdm: false,
    parent_course_id: null,
    session_type: 'theory',
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-cs502',
    code: 'CS502',
    name: 'Operating Systems & Concurrency',
    credits: 4,
    academic_year_id: 'ay-2026-27',
    department_id: 'dept-cs-1',
    is_mdm: false,
    parent_course_id: null,
    session_type: 'theory',
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-cs503',
    code: 'CS503',
    name: 'Design & Analysis of Algorithms',
    credits: 3,
    academic_year_id: 'ay-2026-27',
    department_id: 'dept-cs-1',
    is_mdm: false,
    parent_course_id: null,
    session_type: 'theory',
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-cs504',
    code: 'CS504',
    name: 'Computer Networks & Security',
    credits: 4,
    academic_year_id: 'ay-2026-27',
    department_id: 'dept-cs-1',
    is_mdm: false,
    parent_course_id: null,
    session_type: 'theory',
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-cs501l',
    code: 'CS501L',
    name: 'Database Systems Laboratory',
    credits: 2,
    academic_year_id: 'ay-2026-27',
    department_id: 'dept-cs-1',
    is_mdm: false,
    parent_course_id: 'c-cs501',
    session_type: 'lab',
    created_at: new Date().toISOString(),
  },
]

const FALLBACK_ROOMS: RoomRow[] = [
  {
    id: 'r-301',
    name: 'Room 301 (Smart Classroom)',
    capacity: 70,
    department_id: 'dept-cs-1',
    room_type: 'classroom',
    equipment_tags: ['Smart Board', 'Projector', 'Air Conditioning'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'r-302',
    name: 'Room 302 (Lecture Hall)',
    capacity: 70,
    department_id: 'dept-cs-1',
    room_type: 'classroom',
    equipment_tags: ['Audio System', 'Projector'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'l-db1',
    name: 'Database & Systems Lab 1',
    capacity: 35,
    department_id: 'dept-cs-1',
    room_type: 'lab',
    equipment_tags: ['35 High-Spec Workstations', 'LAN', 'UPS'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'l-sys2',
    name: 'Networking & Systems Lab 2',
    capacity: 35,
    department_id: 'dept-cs-1',
    room_type: 'lab',
    equipment_tags: ['Cisco Routers', 'Switches', 'Wireshark Server'],
    created_at: new Date().toISOString(),
  },
]

const FALLBACK_DIVISIONS: DivisionRow[] = [
  {
    id: 'div-te-1',
    name: 'TE-1 (Third Year Section A)',
    student_count: 60,
    academic_year_id: 'ay-2026-27',
    department_id: 'dept-cs-1',
    term_id: 'term-odd-2026',
    created_at: new Date().toISOString(),
  },
  {
    id: 'div-te-2',
    name: 'TE-2 (Third Year Section B)',
    student_count: 60,
    academic_year_id: 'ay-2026-27',
    department_id: 'dept-cs-1',
    term_id: 'term-odd-2026',
    created_at: new Date().toISOString(),
  },
]

const FALLBACK_BATCHES: BatchRow[] = [
  {
    id: 'b-te1-1',
    division_id: 'div-te-1',
    name: 'Batch B1',
    student_count: 20,
    created_at: new Date().toISOString(),
  },
  {
    id: 'b-te1-2',
    division_id: 'div-te-1',
    name: 'Batch B2',
    student_count: 20,
    created_at: new Date().toISOString(),
  },
  {
    id: 'b-te1-3',
    division_id: 'div-te-1',
    name: 'Batch B3',
    student_count: 20,
    created_at: new Date().toISOString(),
  },
]

const FALLBACK_FACULTY: UserRow[] = [
  {
    id: 'fac-sharma',
    full_name: 'Prof. Amit Sharma',
    email: 'sharma.faculty@smartcollege.edu',
    role: 'faculty',
    department_id: 'dept-cs-1',
    division_id: null,
    batch_id: null,
    employee_code: 'EMP-CS-101',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fac-patel',
    full_name: 'Dr. Varun Patel',
    email: 'patel.faculty@smartcollege.edu',
    role: 'faculty',
    department_id: 'dept-cs-1',
    division_id: null,
    batch_id: null,
    employee_code: 'EMP-CS-102',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fac-deshmukh',
    full_name: 'Prof. S. Deshmukh',
    email: 'deshmukh.faculty@smartcollege.edu',
    role: 'faculty',
    department_id: 'dept-cs-1',
    division_id: null,
    batch_id: null,
    employee_code: 'EMP-CS-103',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fac-rao',
    full_name: 'Dr. K. Rao',
    email: 'rao.faculty@smartcollege.edu',
    role: 'faculty',
    department_id: 'dept-cs-1',
    division_id: null,
    batch_id: null,
    employee_code: 'EMP-CS-104',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const FALLBACK_TIMETABLE: TimetableRow[] = [
  {
    id: 'slot-sample-1',
    term_id: 'term-odd-2026',
    department_id: 'dept-cs-1',
    academic_year_id: 'ay-2026-27',
    division_id: 'div-te-1',
    batch_id: null,
    course_id: 'c-cs501',
    faculty_id: 'fac-sharma',
    room_id: 'r-301',
    day_of_week: 1, // Monday
    start_time: '09:00:00',
    end_time: '10:00:00',
    session_type: 'theory',
    source_type: 'regular',
    status: 'draft',
    is_locked: false,
    mdm_slot_option_id: null,
    elective_option_id: null,
    created_by: null,
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'slot-sample-2',
    term_id: 'term-odd-2026',
    department_id: 'dept-cs-1',
    academic_year_id: 'ay-2026-27',
    division_id: 'div-te-1',
    batch_id: null,
    course_id: 'c-cs502',
    faculty_id: 'fac-patel',
    room_id: 'r-301',
    day_of_week: 1, // Monday
    start_time: '10:00:00',
    end_time: '11:00:00',
    session_type: 'theory',
    source_type: 'regular',
    status: 'draft',
    is_locked: false,
    mdm_slot_option_id: null,
    elective_option_id: null,
    created_by: null,
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'slot-sample-3',
    term_id: 'term-odd-2026',
    department_id: 'dept-cs-1',
    academic_year_id: 'ay-2026-27',
    division_id: 'div-te-1',
    batch_id: 'b-te1-1',
    course_id: 'c-cs501l',
    faculty_id: 'fac-sharma',
    room_id: 'l-db1',
    day_of_week: 2, // Tuesday
    start_time: '13:00:00',
    end_time: '15:00:00',
    session_type: 'lab',
    source_type: 'regular',
    status: 'draft',
    is_locked: false,
    mdm_slot_option_id: null,
    elective_option_id: null,
    created_by: null,
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export default async function CoordinatorDashboardPage() {
  const supabase = await createClient()

  let courses: CourseRow[] = FALLBACK_COURSES
  let rooms: RoomRow[] = FALLBACK_ROOMS
  let divisions: DivisionRow[] = FALLBACK_DIVISIONS
  let batches: BatchRow[] = FALLBACK_BATCHES
  let faculty: UserRow[] = FALLBACK_FACULTY
  let timetable: TimetableRow[] = FALLBACK_TIMETABLE
  let termId = 'term-odd-2026'
  let departmentId = '11111111-1111-1111-1111-111111111111'

  try {
    // 1. Fetch Courses
    const { data: dbCourses } = await supabase.from('courses').select('*')
    if (dbCourses && dbCourses.length > 0) {
      courses = dbCourses
    }

    // 2. Fetch Rooms
    const { data: dbRooms } = await supabase.from('rooms').select('*')
    if (dbRooms && dbRooms.length > 0) {
      rooms = dbRooms
    }

    // 3. Fetch Divisions
    const { data: dbDivisions } = await supabase.from('divisions').select('*')
    if (dbDivisions && dbDivisions.length > 0) {
      divisions = dbDivisions
    }

    // 4. Fetch Batches
    const { data: dbBatches } = await supabase.from('batches').select('*')
    if (dbBatches && dbBatches.length > 0) {
      batches = dbBatches
    }

    // 5. Fetch Faculty Users
    const { data: dbFaculty } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'faculty')
    if (dbFaculty && dbFaculty.length > 0) {
      faculty = dbFaculty
    }

    // 6. Fetch Timetable Entries
    const { data: dbTimetable } = await supabase.from('timetable').select('*')
    if (dbTimetable && dbTimetable.length > 0) {
      timetable = dbTimetable
    }
  } catch (err) {
    // Graceful fallback to initial default datasets
  }

  return (
    <CoordinatorDashboardClient
      initialCourses={courses}
      initialRooms={rooms}
      initialDivisions={divisions}
      initialBatches={batches}
      initialFaculty={faculty}
      initialTimetable={timetable}
      termId="term-odd-2026"
      departmentId="dept-cs-1"
    />
  )
}
