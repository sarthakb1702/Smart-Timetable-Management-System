'use client'

import React from 'react'
import { GridView, GridSlotItem } from '../../../../components/timetable/GridView'
import { UserCheck, Clock, BookOpen } from 'lucide-react'

const FACULTY_SCHEDULE_SLOTS: GridSlotItem[] = [
  {
    id: 'f-1',
    day_of_week: 1,
    start_time: '08:00:00',
    end_time: '09:00:00',
    session_type: 'theory',
    course_code: 'CS501',
    course_name: 'Database Management Systems',
    faculty_name: 'Prof. A. Sharma',
    room_code: 'R-301',
    division_name: 'TE-1',
  },
  {
    id: 'f-2',
    day_of_week: 2,
    start_time: '13:00:00',
    end_time: '15:00:00',
    session_type: 'lab',
    course_code: 'CS501L',
    course_name: 'Database Systems Lab',
    faculty_name: 'Prof. A. Sharma',
    room_code: 'L-DB1',
    division_name: 'TE-1',
    batch_name: 'B1',
  },
  {
    id: 'f-3',
    day_of_week: 3,
    start_time: '10:00:00',
    end_time: '11:00:00',
    session_type: 'theory',
    course_code: 'CS501',
    course_name: 'Database Management Systems',
    faculty_name: 'Prof. A. Sharma',
    room_code: 'R-302',
    division_name: 'TE-2',
  },
  {
    id: 'f-4',
    day_of_week: 4,
    start_time: '14:00:00',
    end_time: '16:00:00',
    session_type: 'lab',
    course_code: 'CS501L',
    course_name: 'Database Systems Lab',
    faculty_name: 'Prof. A. Sharma',
    room_code: 'L-DB1',
    division_name: 'TE-2',
    batch_name: 'B2',
  },
  {
    id: 'f-5',
    day_of_week: 5,
    start_time: '09:00:00',
    end_time: '10:00:00',
    session_type: 'theory',
    course_code: 'CS501',
    course_name: 'Database Management Systems',
    faculty_name: 'Prof. A. Sharma',
    room_code: 'R-301',
    division_name: 'TE-1',
  },
]

export default function FacultyTimetablePage() {
  return (
    <div className="space-y-6">
      {/* Faculty Summary Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-bold text-lg text-indigo-400">
            AS
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Prof. A. Sharma — Personal Teaching Schedule
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Department of Computer Engineering • AY 2026-2027 Odd Term
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Weekly Workload</div>
            <div className="text-sm font-bold text-indigo-300 font-mono">11 / 16 Hours</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Total Sessions</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">5 Sessions</div>
          </div>
        </div>
      </div>

      {/* Weekly Grid View */}
      <GridView
        slots={FACULTY_SCHEDULE_SLOTS}
        title="Faculty Weekly Timetable"
        subtitle="Individual assigned theory lectures and laboratory sessions"
        showFilters={false}
      />
    </div>
  )
}
