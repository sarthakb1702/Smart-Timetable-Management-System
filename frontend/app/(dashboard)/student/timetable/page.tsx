'use client'

import React from 'react'
import { GridView, GridSlotItem } from '../../../../components/timetable/GridView'
import { GraduationCap, Users, Calendar } from 'lucide-react'

const STUDENT_CLASS_SLOTS: GridSlotItem[] = [
  // Monday
  {
    id: 's-1',
    day_of_week: 1,
    start_time: '08:00:00',
    end_time: '09:00:00',
    session_type: 'theory',
    course_code: 'CS501',
    course_name: 'Database Management',
    faculty_name: 'Prof. A. Sharma',
    room_code: 'R-301',
    division_name: 'TE-1',
  },
  {
    id: 's-2',
    day_of_week: 1,
    start_time: '09:00:00',
    end_time: '10:00:00',
    session_type: 'theory',
    course_code: 'CS502',
    course_name: 'Operating Systems',
    faculty_name: 'Dr. V. Patel',
    room_code: 'R-301',
    division_name: 'TE-1',
  },
  {
    id: 's-pe-1',
    day_of_week: 1,
    start_time: '11:00:00',
    end_time: '12:00:00',
    session_type: 'elective',
    course_code: 'PE-Cloud',
    course_name: 'Cloud Architecture & DevOps',
    faculty_name: 'Prof. M. Gupta',
    room_code: 'Aud-1',
    lock_status: 'locked_pe',
  },
  // Tuesday
  {
    id: 's-3',
    day_of_week: 2,
    start_time: '10:00:00',
    end_time: '11:00:00',
    session_type: 'theory',
    course_code: 'CS503',
    course_name: 'Design & Analysis of Algorithms',
    faculty_name: 'Prof. S. Deshmukh',
    room_code: 'R-301',
  },
  {
    id: 's-lab-1',
    day_of_week: 2,
    start_time: '13:00:00',
    end_time: '15:00:00',
    session_type: 'lab',
    course_code: 'CS501L',
    course_name: 'Database Systems Lab',
    faculty_name: 'Prof. A. Sharma',
    room_code: 'L-DB1',
    batch_name: 'B1',
  },
  {
    id: 's-mdm-1',
    day_of_week: 2,
    start_time: '16:00:00',
    end_time: '17:00:00',
    session_type: 'mdm',
    course_code: 'MDM-AI',
    course_name: 'Introduction to AI & Ethics',
    faculty_name: 'Dr. S. Kulkarni',
    room_code: 'R-SH1',
    lock_status: 'locked_mdm',
  },
  // Wednesday
  {
    id: 's-4',
    day_of_week: 3,
    start_time: '08:00:00',
    end_time: '09:00:00',
    session_type: 'theory',
    course_code: 'CS504',
    course_name: 'Computer Networks',
    faculty_name: 'Dr. K. Rao',
    room_code: 'R-301',
  },
  {
    id: 's-pe-2',
    day_of_week: 3,
    start_time: '11:00:00',
    end_time: '12:00:00',
    session_type: 'elective',
    course_code: 'PE-Cloud',
    course_name: 'Cloud Architecture & DevOps',
    faculty_name: 'Prof. M. Gupta',
    room_code: 'Aud-1',
    lock_status: 'locked_pe',
  },
  // Thursday
  {
    id: 's-5',
    day_of_week: 4,
    start_time: '09:00:00',
    end_time: '10:00:00',
    session_type: 'theory',
    course_code: 'CS502',
    course_name: 'Operating Systems',
    faculty_name: 'Dr. V. Patel',
    room_code: 'R-301',
  },
  {
    id: 's-lab-2',
    day_of_week: 4,
    start_time: '13:00:00',
    end_time: '15:00:00',
    session_type: 'lab',
    course_code: 'CS502L',
    course_name: 'Operating Systems Lab',
    faculty_name: 'Dr. V. Patel',
    room_code: 'L-SYS2',
    batch_name: 'B1',
  },
  {
    id: 's-mdm-2',
    day_of_week: 4,
    start_time: '16:00:00',
    end_time: '17:00:00',
    session_type: 'mdm',
    course_code: 'MDM-AI',
    course_name: 'Introduction to AI & Ethics',
    faculty_name: 'Dr. S. Kulkarni',
    room_code: 'R-SH1',
    lock_status: 'locked_mdm',
  },
  // Friday
  {
    id: 's-6',
    day_of_week: 5,
    start_time: '09:00:00',
    end_time: '10:00:00',
    session_type: 'theory',
    course_code: 'CS501',
    course_name: 'Database Management',
    faculty_name: 'Prof. A. Sharma',
    room_code: 'R-301',
  },
  {
    id: 's-pe-3',
    day_of_week: 5,
    start_time: '11:00:00',
    end_time: '12:00:00',
    session_type: 'elective',
    course_code: 'PE-Cloud',
    course_name: 'Cloud Architecture & DevOps',
    faculty_name: 'Prof. M. Gupta',
    room_code: 'Aud-1',
    lock_status: 'locked_pe',
  },
]

export default function StudentTimetablePage() {
  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center font-bold text-lg text-emerald-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Division TE-1 (Batch B1) — Student Class Schedule
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Third Year B.Tech Computer Engineering • Term 1 (Odd 2026-2027)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            Status: Officially Published
          </span>
        </div>
      </div>

      {/* Grid View */}
      <GridView
        slots={STUDENT_CLASS_SLOTS}
        title="Class Weekly Timetable"
        subtitle="Includes core lectures, assigned lab batches, MDM minors, and enrolled PE tracks"
        showFilters={true}
      />
    </div>
  )
}
