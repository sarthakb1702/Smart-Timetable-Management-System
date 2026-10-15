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
  Layers,
  GraduationCap,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react'

export interface GridSlotItem {
  id: string
  day_of_week: number // 1=Mon .. 6=Sat
  start_time: string
  end_time: string
  session_type: 'theory' | 'lab' | 'mdm' | 'elective'
  course_code?: string
  course_name?: string
  faculty_name?: string
  room_code?: string
  division_name?: string
  batch_name?: string
  is_locked?: boolean
}

export interface GridViewProps {
  slots: GridSlotItem[]
  title?: string
  subtitle?: string
  showFilters?: boolean
  institutionName?: string
  departmentName?: string
  academicYear?: string
  semesterName?: string
  className?: string
  classTeacherName?: string
  wefDate?: string
}

const DAYS = [
  { id: 1, name: 'Monday', short: 'MON' },
  { id: 2, name: 'Tuesday', short: 'TUE' },
  { id: 3, name: 'Wednesday', short: 'WED' },
  { id: 4, name: 'Thursday', short: 'THU' },
  { id: 5, name: 'Friday', short: 'FRI' },
  { id: 6, name: 'Saturday', short: 'SAT' },
]

// 1-Hour Time columns (matching academic timetable hours)
const TIME_COLUMNS = [
  { start: '08:00:00', end: '09:00:00', label: '8.00 am to 9.00 am' },
  { start: '09:00:00', end: '10:00:00', label: '9.00 am to 10.00 am' },
  { start: '10:00:00', end: '11:00:00', label: '10.00 am to 11.00 am' },
  { start: '11:00:00', end: '12:00:00', label: '11.00 am to 12.00 pm' },
  { start: '12:00:00', end: '13:00:00', label: '12.00 pm to 1.00 pm', isLunch: true },
  { start: '13:00:00', end: '14:00:00', label: '1.00 pm to 2.00 pm' },
  { start: '14:00:00', end: '15:00:00', label: '2.00 pm to 3.00 pm' },
  { start: '15:00:00', end: '16:00:00', label: '3.00 pm to 4.00 pm' },
  { start: '16:00:00', end: '17:00:00', label: '4.00 pm to 5.00 pm' },
]

// Convert "HH:MM:SS" to total minutes
function timeToMinutes(t: string): number {
  if (!t) return 0
  const parts = t.split(':')
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10)
}

export function GridView({
  slots,
  title = 'Class Time Table',
  subtitle = 'Academic Year 2026-2027 • Approved Schedule',
  showFilters = true,
  institutionName = "Pimpri Chinchwad Education Trust's Pimpri Chinchwad College of Engineering",
  departmentName = 'Information Technology',
  academicYear = '2026 - 2027',
  semesterName = 'Semester - V',
  className = 'TY IT (Div- A)',
  classTeacherName = 'Prof. Sachin Kadam',
  wefDate = '27/07/2026',
}: GridViewProps) {
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all')
  const [selectedRoom, setSelectedRoom] = useState<string>('all')
  const [selectedBatch, setSelectedBatch] = useState<string>('all')

  // Layout mode: 'matrix' (Days as rows, Time as columns - matching attached college format)
  // or 'columns' (Time as rows, Days as columns)
  const [layoutMode, setLayoutMode] = useState<'matrix' | 'columns'>('matrix')

  // Extract unique filters
  const faculties = useMemo(() => {
    const list = Array.from(new Set(slots.map((s) => s.faculty_name).filter(Boolean)))
    return list.sort() as string[]
  }, [slots])

  const rooms = useMemo(() => {
    const list = Array.from(new Set(slots.map((s) => s.room_code).filter(Boolean)))
    return list.sort() as string[]
  }, [slots])

  const batches = useMemo(() => {
    const list = Array.from(new Set(slots.map((s) => s.batch_name).filter(Boolean)))
    return list.sort() as string[]
  }, [slots])

  // Filter slots
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (selectedFaculty !== 'all' && slot.faculty_name !== selectedFaculty) return false
      if (selectedRoom !== 'all' && slot.room_code !== selectedRoom) return false
      if (selectedBatch !== 'all' && slot.session_type === 'lab' && slot.batch_name && slot.batch_name !== selectedBatch) {
        return false
      }
      return true
    })
  }, [slots, selectedFaculty, selectedRoom, selectedBatch])

  // Active days: only include Saturday if slots exist on Saturday
  const activeDays = useMemo(() => {
    const hasSaturday = filteredSlots.some((s) => s.day_of_week === 6)
    return hasSaturday ? DAYS : DAYS.filter((d) => d.id <= 5)
  }, [filteredSlots])

  // Build Course & Faculty Reference Legend Table
  const courseLegend = useMemo(() => {
    const map = new Map<
      string,
      {
        courseCode: string
        courseName: string
        sessionType: 'theory' | 'lab' | 'mdm' | 'elective'
        facultyNames: Set<string>
        rooms: Set<string>
      }
    >()

    for (const slot of filteredSlots) {
      const code = slot.course_code || slot.course_name || 'COURSE'
      const key = `${code}_${slot.session_type}`
      if (!map.has(key)) {
        map.set(key, {
          courseCode: slot.course_code || code,
          courseName: slot.course_name || code,
          sessionType: slot.session_type,
          facultyNames: new Set<string>(),
          rooms: new Set<string>(),
        })
      }
      const entry = map.get(key)!
      if (slot.faculty_name) entry.facultyNames.add(slot.faculty_name)
      if (slot.room_code) entry.rooms.add(slot.room_code)
    }

    const allEntries = Array.from(map.values())
    const theoryEntries = allEntries.filter((e) => e.sessionType === 'theory')
    const labEntries = allEntries.filter((e) => e.sessionType === 'lab')
    const otherEntries = allEntries.filter((e) => e.sessionType !== 'theory' && e.sessionType !== 'lab')

    return {
      theory: theoryEntries,
      practical: [...labEntries, ...otherEntries],
      all: allEntries,
    }
  }, [filteredSlots])

  return (
    <div className="space-y-6">
      {/* Action Controls & Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-line p-4 rounded-2xl shadow-xl print:hidden">
        <div>
          <h2 className="text-base sm:text-lg font-black text-charcoal tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-brand-700" />
            <span>{title}</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {showFilters && (
            <>
              {/* Batch Filter */}
              {batches.length > 0 && (
                <div className="flex items-center gap-1.5 bg-sand border border-line rounded-xl px-2.5 py-1.5 text-xs">
                  <Layers className="w-3.5 h-3.5 text-charcoal" />
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="bg-transparent text-charcoal font-semibold focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="all" className="bg-white">All Batches</option>
                    {batches.map((b) => (
                      <option key={b} value={b} className="bg-white">Batch {b}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Faculty Filter */}
              <div className="flex items-center gap-1.5 bg-sand border border-line rounded-xl px-2.5 py-1.5 text-xs">
                <User className="w-3.5 h-3.5 text-brand-700" />
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="bg-transparent text-charcoal font-semibold focus:outline-none text-xs cursor-pointer max-w-[150px]"
                >
                  <option value="all" className="bg-white">All Faculty</option>
                  {faculties.map((f) => (
                    <option key={f} value={f} className="bg-white">{f}</option>
                  ))}
                </select>
              </div>

              {/* Room Filter */}
              <div className="flex items-center gap-1.5 bg-sand border border-line rounded-xl px-2.5 py-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-success-700" />
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="bg-transparent text-charcoal font-semibold focus:outline-none text-xs cursor-pointer"
                >
                  <option value="all" className="bg-white">All Rooms/Labs</option>
                  {rooms.map((r) => (
                    <option key={r} value={r} className="bg-white">{r}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Toggle Layout Mode Button */}
          <button
            onClick={() => setLayoutMode((m) => (m === 'matrix' ? 'columns' : 'matrix'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sand hover:bg-line text-charcoal text-xs font-semibold border border-line/80 transition-colors shadow-sm"
            title="Toggle between College Matrix format (Days as rows) and Time Flow format (Days as columns)"
          >
            {layoutMode === 'matrix' ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-brand-700" />
                <span>Time Flow View</span>
              </>
            ) : (
              <>
                <TableIcon className="w-3.5 h-3.5 text-brand-700" />
                <span>College Matrix View</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            onClick={() => typeof window !== 'undefined' && window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal text-xs font-bold shadow-md shadow-charcoal/15 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE & DISPLAY CONTAINER: OFFICIAL PCCOE COLLEGE TIMETABLE TEMPLATE
         ========================================================================= */}
      <div className="rounded-2xl border border-line shadow-2xl bg-sand backdrop-blur-md overflow-hidden p-4 sm:p-6 space-y-4 print:border-black print:bg-white print:text-black print:p-2 print:shadow-none">

        {/* 1. Institutional Top Meta Header (Matching Template) */}
        <div className="border border-line rounded-xl overflow-hidden print:border-black">
          {/* Institution Name & Document Record Strip */}
          <div className="bg-sand border-b border-line px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-center sm:text-left print:bg-sand print:text-black">
            <div>
              <div className="text-xs sm:text-sm font-black tracking-tight text-charcoal uppercase print:text-black">
                {institutionName}
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-muted font-mono flex items-center justify-center sm:justify-end gap-3 flex-wrap print:text-black">
              <span><strong>Record No.:</strong> ACAD/R/010A</span>
              <span><strong>Revision:</strong> 00</span>
              <span><strong>Date:</strong> {wefDate || '18/08/2026'}</span>
            </div>
          </div>

          {/* Class Time Table Title Bar */}
          <div className="bg-gradient-to-r from-tint/60 via-sand to-tint/60 py-1.5 text-center border-b border-line text-xs sm:text-sm font-extrabold text-brand-700 tracking-wider uppercase print:bg-sand print:text-black">
            Class Time Table
          </div>

          {/* Details Grid: Department, Academic Year, Term, Class Teacher, Class */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 p-3 text-xs bg-sand print:bg-white print:text-black">
            <div>
              <span className="text-muted font-medium">Department: </span>
              <strong className="text-charcoal font-bold print:text-black">{departmentName}</strong>
            </div>
            <div>
              <span className="text-muted font-medium">Academic Year: </span>
              <strong className="text-charcoal font-bold print:text-black">{academicYear}</strong>
            </div>
            <div>
              <span className="text-muted font-medium">Semester: </span>
              <strong className="text-charcoal font-bold print:text-black">{semesterName}</strong>
            </div>
            <div>
              <span className="text-muted font-medium">W.E.F.: </span>
              <strong className="text-charcoal font-bold print:text-black">{wefDate}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-muted font-medium">Name of the Class Teacher: </span>
              <strong className="text-brand-700 font-bold print:text-black">{classTeacherName}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-muted font-medium">Class: </span>
              <strong className="text-brand-700 font-bold print:text-black">{className}</strong>
            </div>
          </div>
        </div>

        {/* 2. THE TIMETABLE MATRIX TABLE */}
        {layoutMode === 'matrix' ? (
          /* =========================================================
             FORMAT A: DAYS AS ROWS, TIME WINDOWS AS COLUMNS (OFFICIAL COLLEGE TEMPLATE)
             ========================================================= */
          <div className="overflow-x-auto rounded-xl border border-line shadow-xl bg-sand print:border-black">
            <table className="w-full border-collapse text-left min-w-[1050px] print:min-w-0">
              <thead>
                <tr className="bg-sand border-b border-line text-[11px] font-bold text-muted uppercase print:bg-sand print:text-black">
                  <th className="p-2.5 text-center w-20 border-r border-line text-muted bg-sand print:border-black">
                    Time / Day
                  </th>
                  {TIME_COLUMNS.map((col, idx) => {
                    if (col.isLunch) {
                      return (
                        <th
                          key={idx}
                          className="p-2 text-center w-16 border-r border-line bg-warning-50 text-warning-700/90 font-extrabold print:bg-sand print:text-black print:border-black"
                        >
                          <div className="text-[10px] leading-tight">12.00 pm</div>
                          <div className="text-[9px] text-warning-700/80">to 1.00 pm</div>
                        </th>
                      )
                    }
                    return (
                      <th
                        key={idx}
                        className="p-2.5 text-center border-r border-line last:border-none print:border-black"
                      >
                        <div className="text-[11px] font-bold tracking-tight">{col.label}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 print:divide-black">
                {activeDays.map((day) => {
                  // Track columns skipped due to colSpan > 1
                  const skippedColIndices = new Set<number>()

                  return (
                    <tr key={day.id} className="hover:bg-sand/20 transition-colors print:hover:bg-transparent">
                      {/* Day Label Cell (Y-Axis) */}
                      <td className="p-3 text-center font-extrabold text-xs text-charcoal bg-sand border-r border-line font-mono tracking-wider print:bg-sand print:text-black print:border-black">
                        {day.short}
                      </td>

                      {/* Time Slots (X-Axis) */}
                      {TIME_COLUMNS.map((col, colIdx) => {
                        // If this column index was covered by a previous colSpan, skip rendering <td>
                        if (skippedColIndices.has(colIdx)) {
                          return null
                        }

                        // Lunch Break Column
                        if (col.isLunch) {
                          return (
                            <td
                              key={colIdx}
                              className="p-1 text-center bg-warning-50 border-r border-line text-[10px] font-bold text-warning-700/90 select-none print:border-black print:bg-sand print:text-black"
                            >
                              <div className="writing-mode-vertical py-2 tracking-widest text-[10px] uppercase font-mono">
                                Lunch Break
                              </div>
                            </td>
                          )
                        }

                        const colStartMin = timeToMinutes(col.start)
                        const colEndMin = timeToMinutes(col.end)

                        // Find slots for this day that START at this time window
                        // (or span over this window if starting at col.start)
                        const matchingSlots = filteredSlots.filter((s) => {
                          if (s.day_of_week !== day.id) return false
                          const sStartMin = timeToMinutes(s.start_time)
                          return sStartMin === colStartMin
                        })

                        // Check if any matching slot is a 2-hour lab or multi-hour block
                        let span = 1
                        if (matchingSlots.length > 0) {
                          const maxDuration = Math.max(
                            ...matchingSlots.map((s) => timeToMinutes(s.end_time) - timeToMinutes(s.start_time))
                          )
                          // If duration >= 110 minutes (2 hours), colSpan = 2
                          if (maxDuration >= 110) {
                            span = 2
                            // Mark the next column index as skipped
                            skippedColIndices.add(colIdx + 1)
                          }
                        }

                        // If no slot starts at this exact time, check if an ongoing multi-hour slot covers it
                        if (matchingSlots.length === 0) {
                          const ongoingSlot = filteredSlots.find((s) => {
                            if (s.day_of_week !== day.id) return false
                            const sStartMin = timeToMinutes(s.start_time)
                            const sEndMin = timeToMinutes(s.end_time)
                            return sStartMin < colStartMin && sEndMin >= colEndMin
                          })
                          if (ongoingSlot) {
                            // Already handled by colSpan of previous cell
                            return null
                          }
                        }

                        return (
                          <td
                            key={colIdx}
                            colSpan={span}
                            className={`p-2 align-top border-r border-line/80 last:border-none print:border-black ${
                              span > 1
                                ? 'bg-tint'
                                : ''
                            }`}
                          >
                            {matchingSlots.length > 0 ? (
                              <div className="space-y-1.5">
                                {matchingSlots.map((slot) => {
                                  const isLab = slot.session_type === 'lab'
                                  const isMdm = slot.session_type === 'mdm'
                                  const isElective = slot.session_type === 'elective'

                                  return (
                                    <div
                                      key={slot.id}
                                      className={`p-2 rounded-xl border text-xs shadow-sm transition-all ${
                                        isMdm
                                          ? 'bg-sand border-charcoal/40 text-charcoal'
                                          : isElective
                                          ? 'bg-warning-50 border-warning/40 text-warning-700'
                                          : isLab
                                          ? 'bg-success-50 border-success/40 text-success-700'
                                          : 'bg-white border-line/80 text-charcoal'
                                      } print:bg-white print:border-black print:text-black`}
                                    >
                                      {/* Header: Course Abbr + Batch + Lock */}
                                      <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-black text-xs tracking-tight text-charcoal print:text-black">
                                            {slot.course_code || slot.course_name}
                                          </span>
                                          {slot.batch_name && (
                                            <span className="px-1.5 py-0.2 rounded bg-success-50 text-success-700 border border-success/30 font-bold text-[10px] print:border-black print:text-black">
                                              Batch {slot.batch_name}
                                            </span>
                                          )}
                                        </div>

                                        {slot.is_locked && (
                                          <span className="px-1 py-0.5 rounded bg-warning-50 text-warning-700 text-[9px] font-semibold flex items-center gap-0.5">
                                            <Lock className="w-2.5 h-2.5" />
                                            <span>Locked</span>
                                          </span>
                                        )}
                                      </div>

                                      {/* Full Course Name (if distinct from code) */}
                                      {slot.course_name && slot.course_name !== slot.course_code && (
                                        <div className="text-[11px] text-muted font-medium leading-tight print:text-black">
                                          {slot.course_name}
                                        </div>
                                      )}

                                      {/* Footer: FULL FACULTY NAME (As requested) + ROOM */}
                                      <div className="mt-1.5 pt-1 border-t border-line/40 flex items-center justify-between text-[10px] text-muted font-sans gap-1 print:border-black print:text-black">
                                        {/* FULL FACULTY NAME - NO ABBREVIATIONS */}
                                        <div className="flex items-center gap-1 font-semibold text-charcoal print:text-black">
                                          <User className="w-3 h-3 text-brand-700 shrink-0 print:hidden" />
                                          <span className="leading-tight">
                                            {slot.faculty_name || 'Assigned Faculty'}
                                          </span>
                                        </div>

                                        {/* Dedicated Room/Lab Badge */}
                                        {slot.room_code && (
                                          <span className="px-1.5 py-0.5 rounded bg-sand border border-line/60 font-bold text-charcoal text-[10px] shrink-0 print:border-black print:text-black">
                                            {slot.room_code}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="h-full min-h-[48px] rounded-lg border border-dashed border-line/40 flex items-center justify-center text-[10px] text-muted print:hidden">
                                —
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
        ) : (
          /* =========================================================
             FORMAT B: TIME AS ROWS, DAYS AS COLUMNS (TIME FLOW FORMAT)
             ========================================================= */
          <div className="overflow-x-auto rounded-xl border border-line shadow-xl bg-sand print:border-black">
            <table className="w-full border-collapse text-left min-w-[950px]">
              <thead>
                <tr className="bg-sand border-b border-line">
                  <th className="p-3 text-xs font-semibold text-muted uppercase tracking-wider w-28 text-center border-r border-line/60">
                    Time Window
                  </th>
                  {activeDays.map((day) => (
                    <th
                      key={day.id}
                      className="p-3 text-xs font-bold text-charcoal tracking-wide border-r border-line/60 last:border-none text-center"
                    >
                      {day.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {TIME_COLUMNS.map((tSlot, idx) => {
                  const isLunch = tSlot.isLunch

                  return (
                    <tr key={idx} className="hover:bg-sand/20 transition-colors">
                      <td className="p-2.5 text-center text-[11px] font-mono font-medium text-muted bg-sand border-r border-line/60 whitespace-nowrap">
                        {tSlot.label}
                      </td>

                      {activeDays.map((day) => {
                        if (isLunch) {
                          return (
                            <td
                              key={day.id}
                              className="p-2 text-center bg-sand border-r border-line/60 last:border-none"
                            >
                              <div className="py-2 rounded-lg bg-white border border-dashed border-line/60 text-[11px] font-medium text-muted uppercase tracking-wider">
                                Lunch Break
                              </div>
                            </td>
                          )
                        }

                        const cellSlots = filteredSlots.filter(
                          (s) =>
                            s.day_of_week === day.id &&
                            s.start_time <= tSlot.start &&
                            s.end_time >= tSlot.end
                        )

                        return (
                          <td
                            key={day.id}
                            className="p-2 align-top border-r border-line/60 last:border-none min-h-[85px]"
                          >
                            {cellSlots.length > 0 ? (
                              <div className="space-y-1.5">
                                {cellSlots.map((slot) => (
                                  <div
                                    key={slot.id}
                                    className="p-2.5 rounded-xl border border-line bg-white text-xs shadow-sm"
                                  >
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-bold text-charcoal">
                                        {slot.course_code || slot.course_name}
                                      </span>
                                      {slot.batch_name && (
                                        <span className="px-1.5 py-0.2 rounded bg-success-50 text-success-700 text-[10px] font-bold">
                                          Batch {slot.batch_name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted font-medium">
                                      {slot.course_name}
                                    </div>
                                    <div className="mt-1.5 pt-1 border-t border-line/40 flex items-center justify-between text-[10px] text-muted font-sans">
                                      <span className="font-semibold text-charcoal">
                                        {slot.faculty_name || 'Faculty'}
                                      </span>
                                      {slot.room_code && (
                                        <span className="px-1.5 py-0.5 rounded bg-ivory font-bold text-charcoal">
                                          {slot.room_code}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-full min-h-[48px] rounded-lg border border-dashed border-line/40 flex items-center justify-center text-[10px] text-muted">
                                —
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
        )}

        {/* 3. OFFICIAL BOTTOM COURSE & FACULTY REFERENCE LEGEND TABLE (Matching Attached Template) */}
        <div className="border border-line rounded-xl overflow-hidden print:border-black">
          <div className="bg-sand border-b border-line px-4 py-2 text-xs font-bold text-charcoal uppercase tracking-wider flex items-center justify-between print:bg-sand print:text-black">
            <span>Course & Faculty Reference Directory</span>
            <span className="text-[10px] text-muted font-normal">
              Showing full faculty names and assigned classrooms/labs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line print:divide-black">
            {/* Left Column: Theory Courses */}
            <div className="overflow-x-auto">
              <div className="bg-sand px-3 py-1.5 text-[11px] font-bold text-charcoal uppercase tracking-wider border-b border-line print:text-black">
                Theory Courses
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sand border-b border-line/80 text-[10px] font-semibold text-muted uppercase print:bg-sand print:text-black">
                    <th className="p-2 w-10 text-center">SN</th>
                    <th className="p-2 w-24">Subject Abbre.</th>
                    <th className="p-2">Subject Name</th>
                    <th className="p-2">Faculty Name (Full Name)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 print:divide-black">
                  {courseLegend.theory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-sand/20 text-[11px]">
                      <td className="p-2 text-center text-muted font-mono">{idx + 1}</td>
                      <td className="p-2 font-bold text-charcoal font-mono print:text-black">{item.courseCode}</td>
                      <td className="p-2 text-muted print:text-black">{item.courseName}</td>
                      <td className="p-2 font-semibold text-brand-700 print:text-black">
                        {Array.from(item.facultyNames).join(', ') || 'Department Faculty'}
                      </td>
                    </tr>
                  ))}
                  {courseLegend.theory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-muted text-xs">
                        No theory courses scheduled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Right Column: Practical Labs & MDM Minors */}
            <div className="overflow-x-auto">
              <div className="bg-sand px-3 py-1.5 text-[11px] font-bold text-success-700 uppercase tracking-wider border-b border-line print:text-black">
                Practical Labs & Common Minors
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sand border-b border-line/80 text-[10px] font-semibold text-muted uppercase print:bg-sand print:text-black">
                    <th className="p-2 w-10 text-center">SN</th>
                    <th className="p-2 w-24">Subject Abbre.</th>
                    <th className="p-2">Subject Name</th>
                    <th className="p-2">Faculty Name (Full Name)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 print:divide-black">
                  {courseLegend.practical.map((item, idx) => (
                    <tr key={idx} className="hover:bg-sand/20 text-[11px]">
                      <td className="p-2 text-center text-muted font-mono">
                        {courseLegend.theory.length + idx + 1}
                      </td>
                      <td className="p-2 font-bold text-success-700 font-mono print:text-black">{item.courseCode}</td>
                      <td className="p-2 text-muted print:text-black">{item.courseName}</td>
                      <td className="p-2 font-semibold text-success-700 print:text-black">
                        {Array.from(item.facultyNames).join(', ') || 'Laboratory Faculty'}
                      </td>
                    </tr>
                  ))}
                  {courseLegend.practical.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-muted text-xs">
                        No laboratory courses scheduled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Footnote */}
          <div className="bg-sand px-4 py-2 border-t border-line text-[10px] text-muted font-mono flex items-center justify-between flex-wrap gap-2 print:bg-white print:text-black">
            <div>
              <span>* Note: Parallel Practical Batches are conducted simultaneously across dedicated computer labs.</span>
            </div>
            <div>
              <span>Generated via Smart Timetable Management System</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
