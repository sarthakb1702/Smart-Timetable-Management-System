'use client'

import React, { useState } from 'react'
import { DragDropGrid, DragSlotItem } from '../../../../components/timetable/DragDropGrid'
import { useDepartment } from '../../../../context/DepartmentContext'
import { Layers, CheckCircle2, Save, Send } from 'lucide-react'

const INITIAL_DEMO_SLOTS: DragSlotItem[] = [
  // Monday
  {
    id: 'slot-1',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 1,
    start_time: '08:00:00',
    end_time: '09:00:00',
    session_type: 'theory',
    course_code: 'CS501',
    course_name: 'Database Management',
    faculty_name: 'Prof. A. Sharma',
    faculty_id: 'fac-sharma',
    room_code: 'R-301',
    room_id: 'room-301',
    lock_status: 'unlocked',
  },
  {
    id: 'slot-2',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 1,
    start_time: '09:00:00',
    end_time: '10:00:00',
    session_type: 'theory',
    course_code: 'CS502',
    course_name: 'Operating Systems',
    faculty_name: 'Dr. V. Patel',
    faculty_id: 'fac-patel',
    room_code: 'R-301',
    room_id: 'room-301',
    lock_status: 'unlocked',
  },
  {
    id: 'slot-pe-mon',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 1,
    start_time: '11:00:00',
    end_time: '12:00:00',
    session_type: 'elective',
    course_code: 'PE-1',
    course_name: 'Program Elective Slot',
    room_code: 'Aud-1',
    lock_status: 'locked_pe',
  },
  // Tuesday
  {
    id: 'slot-lab-tue',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    batch_name: 'B1',
    day_of_week: 2,
    start_time: '13:00:00',
    end_time: '15:00:00',
    session_type: 'lab',
    course_code: 'CS501L',
    course_name: 'Database Lab',
    faculty_name: 'Prof. A. Sharma',
    faculty_id: 'fac-sharma',
    room_code: 'L-DB1',
    room_id: 'lab-db',
    lock_status: 'unlocked',
  },
  {
    id: 'slot-mdm-tue',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 2,
    start_time: '16:00:00',
    end_time: '17:00:00',
    session_type: 'mdm',
    course_code: 'MDM-1',
    course_name: 'College MDM Common Slot',
    lock_status: 'locked_mdm',
  },
  // Wednesday
  {
    id: 'slot-3',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 3,
    start_time: '08:00:00',
    end_time: '09:00:00',
    session_type: 'theory',
    course_code: 'CS503',
    course_name: 'Algorithms',
    faculty_name: 'Prof. S. Deshmukh',
    faculty_id: 'fac-deshmukh',
    room_code: 'R-301',
    room_id: 'room-301',
    lock_status: 'unlocked',
  },
  {
    id: 'slot-pe-wed',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 3,
    start_time: '11:00:00',
    end_time: '12:00:00',
    session_type: 'elective',
    course_code: 'PE-1',
    course_name: 'Program Elective Slot',
    room_code: 'Aud-1',
    lock_status: 'locked_pe',
  },
  // Thursday
  {
    id: 'slot-4',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 4,
    start_time: '10:00:00',
    end_time: '11:00:00',
    session_type: 'theory',
    course_code: 'CS504',
    course_name: 'Computer Networks',
    faculty_name: 'Dr. K. Rao',
    faculty_id: 'fac-rao',
    room_code: 'R-302',
    room_id: 'room-302',
    lock_status: 'unlocked',
  },
  {
    id: 'slot-mdm-thu',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 4,
    start_time: '16:00:00',
    end_time: '17:00:00',
    session_type: 'mdm',
    course_code: 'MDM-2',
    course_name: 'College MDM Common Slot',
    lock_status: 'locked_mdm',
  },
  // Friday
  {
    id: 'slot-5',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 5,
    start_time: '09:00:00',
    end_time: '10:00:00',
    session_type: 'theory',
    course_code: 'CS501',
    course_name: 'Database Management',
    faculty_name: 'Prof. A. Sharma',
    faculty_id: 'fac-sharma',
    room_code: 'R-301',
    room_id: 'room-301',
    lock_status: 'unlocked',
  },
  {
    id: 'slot-pe-fri',
    academic_term_id: 'term-2026-odd',
    division_id: 'div-te-1',
    division_name: 'TE-1',
    day_of_week: 5,
    start_time: '11:00:00',
    end_time: '12:00:00',
    session_type: 'elective',
    course_code: 'PE-1',
    course_name: 'Program Elective Slot',
    room_code: 'Aud-1',
    lock_status: 'locked_pe',
  },
]

export default function EditTimetablePage() {
  const { selectedDepartment } = useDepartment()
  const [activeDivision, setActiveDivision] = useState('div-te-1')

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Interactive Drag & Drop Timetable Editor
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Department of {selectedDepartment?.name || 'Computer Engineering'} • Division TE-1
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 font-medium">Division:</span>
            <select
              value={activeDivision}
              onChange={(e) => setActiveDivision(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none text-xs"
            >
              <option value="div-te-1" className="bg-slate-900">TE-1 (Third Year A)</option>
              <option value="div-te-2" className="bg-slate-900">TE-2 (Third Year B)</option>
            </select>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-indigo-600/30 transition-all">
            <Send className="w-3.5 h-3.5" />
            <span>Submit for Review</span>
          </button>
        </div>
      </div>

      {/* Interactive Grid Component */}
      <DragDropGrid initialSlots={INITIAL_DEMO_SLOTS} />
    </div>
  )
}
