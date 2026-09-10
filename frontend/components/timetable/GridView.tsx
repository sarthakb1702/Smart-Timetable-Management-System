'use client'

import React, { useState, useMemo } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Lock,
  Filter,
  Printer,
  Download,
  BookOpen,
} from 'lucide-react'

export interface GridSlotItem {
  id: string
  day_of_week: number // 1=Mon .. 6=Sat
  start_time: string
  end_time: string
  session_type: 'theory' | 'lab' | 'tutorial' | 'mdm' | 'elective'
  course_code?: string
  course_name?: string
  faculty_name?: string
  room_code?: string
  division_name?: string
  batch_name?: string
  lock_status?: string
}

interface GridViewProps {
  slots: GridSlotItem[]
  title?: string
  subtitle?: string
  showFilters?: boolean
}

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
]

const TIME_SLOTS = [
  { start: '08:00:00', end: '09:00:00', label: '08:00 - 09:00' },
  { start: '09:00:00', end: '10:00:00', label: '09:00 - 10:00' },
  { start: '10:00:00', end: '11:00:00', label: '10:00 - 11:00' },
  { start: '11:00:00', end: '12:00:00', label: '11:00 - 12:00' },
  { start: '12:00:00', end: '13:00:00', label: '12:00 - 13:00 (Lunch)' },
  { start: '13:00:00', end: '14:00:00', label: '13:00 - 14:00' },
  { start: '14:00:00', end: '15:00:00', label: '14:00 - 15:00' },
  { start: '15:00:00', end: '16:00:00', label: '15:00 - 16:00' },
  { start: '16:00:00', end: '17:00:00', label: '16:00 - 17:00' },
]

export function GridView({
  slots,
  title = 'Weekly Master Timetable',
  subtitle = 'Academic Year 2026-2027 • Approved Schedule',
  showFilters = true,
}: GridViewProps) {
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all')
  const [selectedRoom, setSelectedRoom] = useState<string>('all')

  // Extract unique filters
  const faculties = useMemo(() => {
    const list = Array.from(new Set(slots.map((s) => s.faculty_name).filter(Boolean)))
    return list.sort() as string[]
  }, [slots])

  const rooms = useMemo(() => {
    const list = Array.from(new Set(slots.map((s) => s.room_code).filter(Boolean)))
    return list.sort() as string[]
  }, [slots])

  // Filter slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (selectedFaculty !== 'all' && slot.faculty_name !== selectedFaculty) return false
      if (selectedRoom !== 'all' && slot.room_code !== selectedRoom) return false
      return true
    })
  }, [slots, selectedFaculty, selectedRoom])

  const getSlotColor = (type: string) => {
    switch (type) {
      case 'theory':
        return 'bg-blue-950/40 border-blue-500/40 text-blue-200 hover:border-blue-400'
      case 'lab':
        return 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 hover:border-emerald-400'
      case 'mdm':
        return 'bg-purple-950/40 border-purple-500/40 text-purple-200 hover:border-purple-400'
      case 'elective':
        return 'bg-amber-950/40 border-amber-500/40 text-amber-200 hover:border-amber-400'
      case 'tutorial':
        return 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200 hover:border-cyan-400'
      default:
        return 'bg-slate-800 border-slate-700 text-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Filtering bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showFilters && (
            <>
              {/* Faculty Filter */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs"
                >
                  <option value="all" className="bg-slate-900">All Faculty</option>
                  {faculties.map((f) => (
                    <option key={f} value={f} className="bg-slate-900">{f}</option>
                  ))}
                </select>
              </div>

              {/* Room Filter */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs"
                >
                  <option value="all" className="bg-slate-900">All Rooms/Labs</option>
                  {rooms.map((r) => (
                    <option key={r} value={r} className="bg-slate-900">{r}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Print Button */}
          <button
            onClick={() => typeof window !== 'undefined' && window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-2xl bg-slate-900/60 backdrop-blur-sm">
        <table className="w-full border-collapse text-left min-w-[950px]">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800">
              <th className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 text-center border-r border-slate-800/60">
                Time
              </th>
              {DAYS.map((day) => (
                <th
                  key={day.id}
                  className="p-3 text-xs font-bold text-slate-200 tracking-wide border-r border-slate-800/60 last:border-none text-center"
                >
                  {day.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {TIME_SLOTS.map((tSlot) => {
              const isLunch = tSlot.start === '12:00:00'

              return (
                <tr key={tSlot.start} className="hover:bg-slate-800/20 transition-colors">
                  {/* Time label */}
                  <td className="p-2.5 text-center text-[11px] font-mono font-medium text-slate-400 bg-slate-900/40 border-r border-slate-800/60 whitespace-nowrap">
                    {tSlot.label}
                  </td>

                  {/* Day cells */}
                  {DAYS.map((day) => {
                    if (isLunch) {
                      return (
                        <td
                          key={day.id}
                          className="p-2 text-center bg-slate-900/80 border-r border-slate-800/60 last:border-none"
                        >
                          <div className="py-2.5 rounded-lg bg-slate-800/40 border border-dashed border-slate-700/60 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                            Lunch Break
                          </div>
                        </td>
                      )
                    }

                    // Find matching slot(s) for this day and time window
                    const cellSlots = filteredSlots.filter(
                      (s) =>
                        s.day_of_week === day.id &&
                        s.start_time <= tSlot.start &&
                        s.end_time >= tSlot.end
                    )

                    return (
                      <td
                        key={day.id}
                        className="p-2 align-top border-r border-slate-800/60 last:border-none min-h-[90px]"
                      >
                        {cellSlots.length > 0 ? (
                          <div className="space-y-1.5">
                            {cellSlots.map((slot) => {
                              const isLocked =
                                slot.lock_status && slot.lock_status !== 'unlocked'
                              return (
                                <div
                                  key={slot.id}
                                  className={`p-2.5 rounded-xl border text-xs shadow-sm transition-all ${getSlotColor(
                                    slot.session_type
                                  )}`}
                                >
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <span className="font-bold tracking-tight text-xs">
                                      {slot.course_code || slot.course_name || slot.session_type.toUpperCase()}
                                    </span>
                                    {isLocked && (
                                      <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                    )}
                                  </div>

                                  {slot.course_name && slot.course_code && (
                                    <div className="text-[10px] truncate text-slate-300 font-medium">
                                      {slot.course_name}
                                    </div>
                                  )}

                                  <div className="mt-2 pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                    {slot.faculty_name && (
                                      <span className="truncate max-w-[90px]">
                                        {slot.faculty_name}
                                      </span>
                                    )}
                                    {slot.room_code && (
                                      <span className="font-bold px-1 rounded bg-slate-800/80 text-slate-300">
                                        {slot.room_code}
                                      </span>
                                    )}
                                    {slot.batch_name && (
                                      <span className="font-bold text-emerald-400">
                                        [{slot.batch_name}]
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="h-full min-h-[60px] rounded-lg border border-dashed border-slate-800/40 flex items-center justify-center text-[10px] text-slate-700">
                            Available
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
