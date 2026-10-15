'use client'

import React, { useState } from 'react'
import {
  Calendar,
  Clock,
  Building,
  Users,
  BookOpen,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Filter,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  X,
  MapPin,
} from 'lucide-react'
import { Database } from '@/types/supabase'
import { createClient } from '@/utils/supabase/client'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

export type CourseRow = Database['public']['Tables']['courses']['Row']
export type RoomRow = Database['public']['Tables']['rooms']['Row']
export type DivisionRow = Database['public']['Tables']['divisions']['Row']
export type BatchRow = Database['public']['Tables']['batches']['Row']
export type TimetableRow = Database['public']['Tables']['timetable']['Row']
export type UserRow = Database['public']['Tables']['users']['Row']

export interface GridSlotDisplay {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  course_id: string | null
  course_name?: string
  course_code?: string
  room_id: string
  room_name?: string
  room_capacity?: number
  faculty_id: string
  faculty_name?: string
  division_id: string
  batch_id?: string | null
  batch_name?: string | null
  session_type: Database['public']['Enums']['session_type']
  source_type: Database['public']['Enums']['slot_source']
  has_clash?: boolean
  clash_reason?: string
}

interface CoordinatorDashboardProps {
  initialCourses: CourseRow[]
  initialRooms: RoomRow[]
  initialDivisions: DivisionRow[]
  initialBatches: BatchRow[]
  initialFaculty: UserRow[]
  initialTimetable: TimetableRow[]
  termId: string
  departmentId: string
}

const DAYS = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
]

const TIME_WINDOWS = [
  { start: '09:00', end: '10:00', label: '09:00 - 10:00', isLunch: false },
  { start: '10:00', end: '11:00', label: '10:00 - 11:00', isLunch: false },
  { start: '11:00', end: '12:00', label: '11:00 - 12:00', isLunch: false },
  { start: '12:00', end: '13:00', label: '12:00 - 13:00 (Lunch)', isLunch: true },
  { start: '13:00', end: '14:00', label: '13:00 - 14:00', isLunch: false },
  { start: '14:00', end: '15:00', label: '14:00 - 15:00', isLunch: false },
  { start: '15:00', end: '16:00', label: '15:00 - 16:00', isLunch: false },
  { start: '16:00', end: '17:00', label: '16:00 - 17:00', isLunch: false },
]

export function CoordinatorDashboardClient({
  initialCourses,
  initialRooms,
  initialDivisions,
  initialBatches,
  initialFaculty,
  initialTimetable,
  termId,
  departmentId,
}: CoordinatorDashboardProps) {
  const [courses] = useState<CourseRow[]>(initialCourses)
  const [rooms] = useState<RoomRow[]>(initialRooms)
  const [divisions] = useState<DivisionRow[]>(initialDivisions)
  const [batches] = useState<BatchRow[]>(initialBatches)
  const [faculty] = useState<UserRow[]>(initialFaculty)

  // Current division filter
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(
    initialDivisions[0]?.id || ''
  )
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all')

  // Timetable State
  const [slots, setSlots] = useState<GridSlotDisplay[]>(() => {
    return initialTimetable.map((t) => {
      const c = initialCourses.find((x) => x.id === t.course_id)
      const r = initialRooms.find((x) => x.id === t.room_id)
      const f = initialFaculty.find((x) => x.id === t.faculty_id)
      const b = initialBatches.find((x) => x.id === t.batch_id)

      return {
        id: t.id,
        day_of_week: t.day_of_week,
        start_time: t.start_time.slice(0, 5),
        end_time: t.end_time.slice(0, 5),
        course_id: t.course_id,
        course_name: c?.name,
        course_code: c?.code,
        room_id: t.room_id,
        room_name: r?.name,
        room_capacity: r?.capacity,
        faculty_id: t.faculty_id,
        faculty_name: f?.full_name,
        division_id: t.division_id,
        batch_id: t.batch_id,
        batch_name: b?.name,
        session_type: t.session_type,
        source_type: t.source_type,
        has_clash: false,
        clash_reason: undefined,
      }
    })
  })

  // Modal State for Slot Creation & Editing
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<GridSlotDisplay | null>(null)
  const [targetDay, setTargetDay] = useState<number>(1)
  const [targetTime, setTargetTime] = useState<string>('09:00')

  // Form Fields
  const [formData, setFormData] = useState({
    course_id: initialCourses[0]?.id || '',
    faculty_id: initialFaculty[0]?.id || '',
    room_id: initialRooms[0]?.id || '',
    batch_id: '',
    session_type: 'theory' as Database['public']['Enums']['session_type'],
  })

  const [isCheckingClash, setIsCheckingClash] = useState(false)
  const [clashWarning, setClashWarning] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'warning'
    text: string
  } | null>(null)

  // Drag and Drop state
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null)

  // Filter divisions and batches
  const divisionBatches = batches.filter((b) => b.division_id === selectedDivisionId)

  // 1. Calculate Master Overview Counts
  const totalCourses = courses.length
  const totalRoomCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0)
  const totalDivisions = divisions.length

  // Unassigned slots for selected division (6 days * 7 non-lunch periods = 42 total)
  const divisionSlots = slots.filter((s) => s.division_id === selectedDivisionId)
  const scheduledCount = divisionSlots.length
  const totalAvailablePeriods = 6 * 7
  const unassignedCount = Math.max(0, totalAvailablePeriods - scheduledCount)

  // Clashes count
  const totalClashes = slots.filter((s) => s.has_clash).length

  // Open Modal for new or existing cell slot
  const handleCellClick = (day: number, startTime: string) => {
    const existing = slots.find(
      (s) =>
        s.division_id === selectedDivisionId &&
        s.day_of_week === day &&
        s.start_time === startTime
    )

    setTargetDay(day)
    setTargetTime(startTime)
    setClashWarning(null)

    if (existing) {
      setEditingSlot(existing)
      setFormData({
        course_id: existing.course_id || courses[0]?.id || '',
        faculty_id: existing.faculty_id || faculty[0]?.id || '',
        room_id: existing.room_id || rooms[0]?.id || '',
        batch_id: existing.batch_id || '',
        session_type: existing.session_type,
      })
    } else {
      setEditingSlot(null)
      setFormData({
        course_id: courses[0]?.id || '',
        faculty_id: faculty[0]?.id || '',
        room_id: rooms[0]?.id || '',
        batch_id: '',
        session_type: 'theory',
      })
    }
    setIsModalOpen(true)
  }

  // 3. Clash Detection Integration & Slot Save Handler
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCheckingClash(true)
    setClashWarning(null)

    const startTime = targetTime
    const startHour = parseInt(startTime.split(':')[0], 10)
    const duration = formData.session_type === 'lab' ? 2 : 1
    const endHour = startHour + duration
    const endTime = `${endHour.toString().padStart(2, '0')}:00`

    try {
      // Perform POST request to `/api/timetable/check-clash`
      const clashRes = await fetch('/api/timetable/check-clash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_id: formData.faculty_id,
          room_id: formData.room_id,
          day_of_week: targetDay,
          start_time: `${startTime}:00`,
          term_id: termId,
        }),
      })

      const clashData = await clashRes.json()

      const c = courses.find((x) => x.id === formData.course_id)
      const r = rooms.find((x) => x.id === formData.room_id)
      const f = faculty.find((x) => x.id === formData.faculty_id)
      const b = batches.find((x) => x.id === formData.batch_id)

      if (clashRes.status === 409 || clashData.clash) {
        const reason = clashData.reason || 'Scheduling collision detected.'
        setClashWarning(reason)
        setToastMessage({
          type: 'error',
          text: `Scheduling Clash: ${reason}`,
        })

        // Flag the slot with has_clash=true so visual warning badge is displayed directly on the UI grid cell!
        const conflictedSlot: GridSlotDisplay = {
          id: editingSlot?.id || `slot-clash-${Date.now()}`,
          day_of_week: targetDay,
          start_time: startTime,
          end_time: endTime,
          course_id: formData.course_id,
          course_name: c?.name,
          course_code: c?.code,
          room_id: formData.room_id,
          room_name: r?.name,
          room_capacity: r?.capacity,
          faculty_id: formData.faculty_id,
          faculty_name: f?.full_name,
          division_id: selectedDivisionId,
          batch_id: formData.batch_id || null,
          batch_name: b?.name,
          session_type: formData.session_type,
          source_type: 'regular',
          has_clash: true,
          clash_reason: reason,
        }

        setSlots((prev) => {
          const filtered = prev.filter((s) => s.id !== conflictedSlot.id)
          return [...filtered, conflictedSlot]
        })
        setIsModalOpen(false)
        return
      }

      // No clash detected: clear clash flags and commit slot
      const committedSlot: GridSlotDisplay = {
        id: editingSlot?.id || `slot-${Date.now()}`,
        day_of_week: targetDay,
        start_time: startTime,
        end_time: endTime,
        course_id: formData.course_id,
        course_name: c?.name,
        course_code: c?.code,
        room_id: formData.room_id,
        room_name: r?.name,
        room_capacity: r?.capacity,
        faculty_id: formData.faculty_id,
        faculty_name: f?.full_name,
        division_id: selectedDivisionId,
        batch_id: formData.batch_id || null,
        batch_name: b?.name,
        session_type: formData.session_type,
        source_type: 'regular',
        has_clash: false,
        clash_reason: undefined,
      }

      setSlots((prev) => {
        const filtered = prev.filter((s) => s.id !== committedSlot.id)
        return [...filtered, committedSlot]
      })

      // Update Supabase if live credentials are active
      try {
        const supabase = createClient()
        await (supabase as any).from('timetable').upsert({
          id: committedSlot.id.startsWith('slot-') ? undefined : committedSlot.id,
          term_id: termId,
          department_id: departmentId,
          academic_year_id: c?.academic_year_id || '00000000-0000-0000-0000-000000000000',
          division_id: selectedDivisionId,
          batch_id: formData.batch_id || null,
          course_id: formData.course_id,
          faculty_id: formData.faculty_id,
          room_id: formData.room_id,
          day_of_week: targetDay,
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          session_type: formData.session_type,
          source_type: 'regular',
          status: 'draft',
          is_locked: false,
        })
      } catch (dbErr) {
        // Fallback local memory state
      }

      setToastMessage({
        type: 'success',
        text: `Slot successfully assigned to ${c?.code} without conflicts.`,
      })
      setIsModalOpen(false)
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Error occurred during clash verification.',
      })
    } finally {
      setIsCheckingClash(false)
      setTimeout(() => setToastMessage(null), 5000)
    }
  }

  // Delete Slot
  const handleDeleteSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSlots((prev) => prev.filter((s) => s.id !== id))
    setToastMessage({ type: 'success', text: 'Slot entry removed from timetable.' })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Drag and drop handlers
  const handleDragStart = (id: string) => {
    setDraggedSlotId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetDayNum: number, targetStartTime: string) => {
    if (!draggedSlotId) return
    const slotToMove = slots.find((s) => s.id === draggedSlotId)
    if (!slotToMove) return

    const startHour = parseInt(targetStartTime.split(':')[0], 10)
    const duration = slotToMove.session_type === 'lab' ? 2 : 1
    const targetEndTime = `${(startHour + duration).toString().padStart(2, '0')}:00`

    // Call clash check endpoint before confirming drop
    try {
      const clashRes = await fetch('/api/timetable/check-clash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_id: slotToMove.faculty_id,
          room_id: slotToMove.room_id,
          day_of_week: targetDayNum,
          start_time: `${targetStartTime}:00`,
          term_id: termId,
        }),
      })

      const clashData = await clashRes.json()

      if (clashRes.status === 409 || clashData.clash) {
        const reason = clashData.reason || 'Conflict detected in moved slot.'
        setToastMessage({
          type: 'error',
          text: `Cannot move slot: ${reason}`,
        })

        // Flag the slot with has_clash=true so visual warning badge is shown in the new cell
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotToMove.id
              ? {
                  ...s,
                  day_of_week: targetDayNum,
                  start_time: targetStartTime,
                  end_time: targetEndTime,
                  has_clash: true,
                  clash_reason: reason,
                }
              : s
          )
        )
      } else {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotToMove.id
              ? {
                  ...s,
                  day_of_week: targetDayNum,
                  start_time: targetStartTime,
                  end_time: targetEndTime,
                  has_clash: false,
                  clash_reason: undefined,
                }
              : s
          )
        )
        setToastMessage({
          type: 'success',
          text: `Moved ${slotToMove.course_code} to ${DAYS[targetDayNum - 1]?.label} ${targetStartTime}.`,
        })
      }
    } catch (err) {
      // Local fallback
    } finally {
      setDraggedSlotId(null)
      setTimeout(() => setToastMessage(null), 4000)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Department Coordinator Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Interactive Timetable Grid, Master Data Overview, and Pre-Commit Collision Protection.
            </p>
          </div>
        </div>

        {/* Division & Batch Selector Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-line rounded-xl px-3 py-1.5">
            <Layers className="w-4 h-4 text-brand-700" />
            <select
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none cursor-pointer"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id} className="bg-white text-charcoal">
                  {d.name} ({d.student_count} Students)
                </option>
              ))}
            </select>
          </div>

          {divisionBatches.length > 0 && (
            <div className="flex items-center gap-2 bg-white border border-line rounded-xl px-3 py-1.5">
              <Filter className="w-4 h-4 text-charcoal" />
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-white text-charcoal">
                  All Batches
                </option>
                {divisionBatches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white text-charcoal">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-success-50 border-success/40 text-success-700'
              : toastMessage.type === 'warning'
              ? 'bg-warning-50 border-warning/40 text-warning-700'
              : 'bg-danger-50 border-danger/40 text-danger-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-success-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-danger-700 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-muted hover:text-charcoal">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Master Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Active Courses"
          value={totalCourses}
          subtitle="Department curriculum units"
          icon={BookOpen}
          iconColor="text-brand-700"
        />
        <StatCard
          title="Room Capacities"
          value={`${totalRoomCapacity} Seats`}
          subtitle={`${rooms.length} Active lecture halls & labs`}
          icon={Building}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Academic Divisions"
          value={totalDivisions}
          subtitle={`${batches.length} Practical lab sub-batches`}
          icon={Layers}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Unassigned Slots"
          value={`${unassignedCount} Slots`}
          subtitle={`${scheduledCount} of ${totalAvailablePeriods} slots scheduled`}
          icon={Clock}
          iconColor={unassignedCount === 0 ? 'text-success-700' : 'text-warning-700'}
        />
      </div>

      {/* Status Bar with Clash Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-2xl bg-sand border border-line text-xs">
        <div className="flex items-center gap-2 text-muted">
          <Sparkles className="w-4 h-4 text-brand-700 shrink-0" />
          <span>
            Click on any empty cell to assign a course, or drag scheduled blocks to new slots. Collision checks run before every commit.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {totalClashes > 0 ? (
            <div className="flex items-center gap-1.5 text-danger-700 font-bold px-2.5 py-1 rounded-lg bg-danger-50 border border-danger/30">
              <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              <span>{totalClashes} Conflict(s) Detected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-success-700 font-semibold px-2.5 py-1 rounded-lg bg-success-50 border border-success/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero Conflicts</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-brand-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-brand" />
            <span>Theory (1h)</span>
          </div>
          <div className="flex items-center gap-1.5 text-charcoal font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-charcoal" />
            <span>Lab (2h)</span>
          </div>
        </div>
      </div>

      {/* 2. Weekly Timetable Grid (Monday–Saturday, 09:00 to 17:00) */}
      <div className="rounded-2xl bg-white border border-line shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[950px]">
            {/* Table Header: Days */}
            <thead className="bg-sand border-b border-line">
              <tr>
                <th className="p-3 text-[11px] font-bold uppercase tracking-wider text-muted w-28 text-center border-r border-line">
                  Time Slot
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day.id}
                    className="p-3 text-xs font-bold uppercase tracking-wider text-charcoal text-center border-r border-line last:border-r-0"
                  >
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Time Slots */}
            <tbody className="divide-y divide-line">
              {TIME_WINDOWS.map((timeWin) => (
                <tr
                  key={timeWin.start}
                  className={timeWin.isLunch ? 'bg-warning-50' : 'hover:bg-sand/20'}
                >
                  {/* Time Label Column */}
                  <td className="p-3 text-center border-r border-line bg-sand text-muted font-mono text-xs font-semibold whitespace-nowrap">
                    {timeWin.label}
                  </td>

                  {/* Day Columns */}
                  {DAYS.map((day) => {
                    if (timeWin.isLunch) {
                      return (
                        <td
                          key={day.id}
                          className="p-2.5 text-center text-[11px] font-semibold text-warning-700/80 uppercase tracking-wider border-r border-line/80 last:border-r-0"
                        >
                          Institutional Lunch Break
                        </td>
                      )
                    }

                    // Matching slot
                    const cellSlot = slots.find(
                      (s) =>
                        s.division_id === selectedDivisionId &&
                        s.day_of_week === day.id &&
                        s.start_time === timeWin.start &&
                        (selectedBatchId === 'all' || !s.batch_id || s.batch_id === selectedBatchId)
                    )

                    return (
                      <td
                        key={day.id}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(day.id, timeWin.start)}
                        onClick={() => handleCellClick(day.id, timeWin.start)}
                        className="p-2 border-r border-line/80 last:border-r-0 h-24 align-top transition-colors hover:bg-sand/30 cursor-pointer relative group"
                      >
                        {cellSlot ? (
                          <div
                            draggable
                            onDragStart={() => handleDragStart(cellSlot.id)}
                            className={`p-2 rounded-xl border transition-all h-full flex flex-col justify-between select-none shadow-md ${
                              cellSlot.has_clash
                                ? 'bg-danger-50 border-danger-200 shadow-charcoal/15 ring-2 ring-danger'
                                : cellSlot.session_type === 'lab'
                                ? 'bg-sand border-charcoal/40 hover:border-charcoal/40'
                                : 'bg-tint border-brand/40 hover:border-brand-600'
                            }`}
                          >
                            <div>
                              {/* 3. Visual Red Alert Conflict Badge */}
                              {cellSlot.has_clash && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-danger px-1.5 py-0.5 rounded-md mb-1 animate-pulse shadow-sm">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {cellSlot.clash_reason || 'Conflict Detected'}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-bold text-xs text-charcoal">
                                  {cellSlot.course_code || 'COURSE'}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sand text-muted font-mono">
                                  {cellSlot.session_type.toUpperCase()}
                                </span>
                              </div>

                              <div className="text-[11px] font-medium text-charcoal line-clamp-1 mt-0.5">
                                {cellSlot.course_name}
                              </div>
                            </div>

                            <div className="pt-1 mt-1 border-t border-line/50 flex items-center justify-between text-[10px] text-muted">
                              <span className="truncate max-w-[85px]">
                                {cellSlot.faculty_name}
                              </span>
                              <span className="font-mono text-brand-700 font-semibold">
                                {cellSlot.room_name?.split(' ')[0] || 'Room'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-lg border border-dashed border-line group-hover:border-muted/60 flex items-center justify-center text-muted group-hover:text-charcoal transition-colors">
                            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Slot Assignment / Edit with Instant Clash Checking */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSlot ? 'Edit Timetable Slot' : 'Assign Timetable Slot'}
        subtitle={`Schedule session on ${DAYS[targetDay - 1]?.label} at ${targetTime}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          {/* Clash Alert inside Modal */}
          {clashWarning && (
            <div className="p-3.5 rounded-xl bg-danger-50 border border-danger/50 text-danger-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-danger-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-danger-700 block">Conflict Warning:</strong>
                <span>{clashWarning}</span>
              </div>
            </div>
          )}

          {/* Select Course */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Select Course
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name} ({c.session_type})
                </option>
              ))}
            </select>
          </div>

          {/* Select Faculty */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Instructor / Faculty Member
            </label>
            <select
              value={formData.faculty_id}
              onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name} ({f.email})
                </option>
              ))}
            </select>
          </div>

          {/* Select Room */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Allocated Room / Laboratory
            </label>
            <select
              value={formData.room_id}
              onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Cap: {r.capacity}, Type: {r.room_type})
                </option>
              ))}
            </select>
          </div>

          {/* Session Type & Batch */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Session Type
              </label>
              <select
                value={formData.session_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    session_type: e.target.value as Database['public']['Enums']['session_type'],
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option value="theory">Theory (1 Hour)</option>
                <option value="lab">Lab (2 Hours)</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Practical Batch (Optional)
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option value="">Whole Division (All Batches)</option>
                {divisionBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.student_count} Students)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-line">
            {editingSlot ? (
              <button
                type="button"
                onClick={(e) => {
                  handleDeleteSlot(editingSlot.id, e)
                  setIsModalOpen(false)
                }}
                className="text-xs font-semibold text-danger-700 hover:text-danger-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Delete Slot
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-charcoal hover:bg-sand transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCheckingClash}
                className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-charcoal text-xs font-semibold shadow-lg shadow-charcoal/15 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCheckingClash ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Checking Clash...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {editingSlot ? 'Update Slot' : 'Assign Slot'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
