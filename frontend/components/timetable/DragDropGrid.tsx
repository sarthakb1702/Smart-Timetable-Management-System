'use client'

import React, { useState } from 'react'
import {
  Lock,
  AlertOctagon,
  CheckCircle2,
  X,
  GripVertical,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

export interface DragSlotItem {
  id: string
  academic_term_id: string
  division_id: string
  division_name?: string
  batch_id?: string | null
  batch_name?: string | null
  day_of_week: number // 1=Mon to 6=Sat
  start_time: string
  end_time: string
  session_type: 'theory' | 'lab' | 'tutorial' | 'mdm' | 'elective'
  slot_source?: 'core_course' | 'mdm_slot' | 'elective_slot'
  course_id?: string | null
  course_code?: string
  course_name?: string
  faculty_id?: string | null
  faculty_name?: string
  room_id?: string | null
  room_code?: string
  lock_status: 'unlocked' | 'locked_mdm' | 'locked_pe' | 'manual_locked'
}

interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning'
  title: string
  messages: string[]
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

export function DragDropGrid({
  initialSlots,
  onSlotsUpdated,
}: {
  initialSlots: DragSlotItem[]
  onSlotsUpdated?: (updated: DragSlotItem[]) => void
}) {
  const [slots, setSlots] = useState<DragSlotItem[]>(initialSlots)
  const [draggedSlot, setDraggedSlot] = useState<DragSlotItem | null>(null)
  const [dropTarget, setDropTarget] = useState<{ day: number; start: string } | null>(null)
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    setToasts((prev) => [newToast, ...prev.slice(0, 3)])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 6000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, slot: DragSlotItem) => {
    if (slot.lock_status !== 'unlocked') {
      e.preventDefault()
      addToast({
        type: 'warning',
        title: 'Locked Slot Protected',
        messages: ['MDM and Elective (PE) common slots cannot be moved.'],
      })
      return
    }

    setDraggedSlot(slot)
    e.dataTransfer.setData('text/plain', slot.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, day: number, start: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTarget?.day !== day || dropTarget?.start !== start) {
      setDropTarget({ day, start })
    }
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  // Handle Drop and Real-Time Clash Validation
  const handleDrop = async (
    e: React.DragEvent,
    targetDay: number,
    targetStart: string,
    targetEnd: string
  ) => {
    e.preventDefault()
    setDropTarget(null)

    if (!draggedSlot) return

    // Don't validate if dropped onto the same slot
    if (
      draggedSlot.day_of_week === targetDay &&
      draggedSlot.start_time === targetStart
    ) {
      setDraggedSlot(null)
      return
    }

    // Disallow dropping into lunch break
    if (targetStart === '12:00:00') {
      addToast({
        type: 'error',
        title: 'Invalid Move: Lunch Break Conflict',
        messages: ['Sessions cannot be scheduled during the college lunch break (12:00 - 13:00).'],
      })
      setDraggedSlot(null)
      return
    }

    // Calculate new end time based on duration (Theory = 1 hr, Lab = 2 hrs)
    let calculatedEnd = targetEnd
    if (draggedSlot.session_type === 'lab') {
      const startParts = targetStart.split(':')
      const endHour = parseInt(startParts[0], 10) + 2
      calculatedEnd = `${endHour.toString().padStart(2, '0')}:${startParts[1]}:00`
    }

    setIsValidating(true)

    try {
      // 1. Trigger backend real-time clash check
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

      const clashPayload = {
        academic_term_id: draggedSlot.academic_term_id,
        division_id: draggedSlot.division_id,
        batch_id: draggedSlot.batch_id,
        day_of_week: targetDay,
        start_time: targetStart,
        end_time: calculatedEnd,
        session_type: draggedSlot.session_type,
        course_id: draggedSlot.course_id,
        faculty_id: draggedSlot.faculty_id,
        room_id: draggedSlot.room_id,
        exclude_timetable_id: draggedSlot.id,
        existing_slots: slots,
      }

      let clashResult = { has_clash: false, reasons: [] as string[] }

      try {
        const response = await fetch(`${backendUrl}/clash-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clashPayload),
        })

        if (response.ok) {
          clashResult = await response.json()
        } else {
          // If backend offline, perform client-side fallback validation
          clashResult = performClientSideClashCheck(draggedSlot, targetDay, targetStart, calculatedEnd, slots)
        }
      } catch (networkErr) {
        // Network fallback
        clashResult = performClientSideClashCheck(draggedSlot, targetDay, targetStart, calculatedEnd, slots)
      }

      // 2. Reject drop if clash detected
      if (clashResult.has_clash) {
        addToast({
          type: 'error',
          title: 'Schedule Conflict Detected - Move Rejected',
          messages: clashResult.reasons.length > 0
            ? clashResult.reasons
            : ['Target slot violates timetable constraints.'],
        })
        setDraggedSlot(null)
        setIsValidating(false)
        return
      }

      // 3. Valid move: Optimistic UI update
      const updatedSlots = slots.map((s) => {
        if (s.id === draggedSlot.id) {
          return {
            ...s,
            day_of_week: targetDay,
            start_time: targetStart,
            end_time: calculatedEnd,
          }
        }
        return s
      })

      setSlots(updatedSlots)
      if (onSlotsUpdated) {
        onSlotsUpdated(updatedSlots)
      }

      // 4. Persist to Supabase
      const supabase = createClient()
      try {
        await (supabase as any)
          .from('timetable')
          .update({
            day_of_week: targetDay,
            start_time: targetStart,
            end_time: calculatedEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draggedSlot.id)

        // Log edit action in timetable_edit_log
        await (supabase as any).from('timetable_edit_log').insert({
          timetable_id: draggedSlot.id,
          action: 'drag_drop',
          changed_by: (await supabase.auth.getUser()).data.user?.id,
          old_values: {
            day_of_week: draggedSlot.day_of_week,
            start_time: draggedSlot.start_time,
            end_time: draggedSlot.end_time,
          },
          new_values: {
            day_of_week: targetDay,
            start_time: targetStart,
            end_time: calculatedEnd,
          },
          reason: 'Interactive drag-and-drop reschedule',
        })
      } catch (dbErr) {
        console.warn('Database sync note:', dbErr)
      }

      addToast({
        type: 'success',
        title: 'Slot Reallocated Successfully',
        messages: [
          `Moved ${draggedSlot.course_code || 'Session'} to ${DAYS.find((d) => d.id === targetDay)?.name} at ${targetStart.slice(0, 5)}.`,
        ],
      })
    } finally {
      setDraggedSlot(null)
      setIsValidating(false)
    }
  }

  // Client-side fallback clash validation
  const performClientSideClashCheck = (
    item: DragSlotItem,
    day: number,
    start: string,
    end: string,
    allSlots: DragSlotItem[]
  ) => {
    const reasons: string[] = []

    for (const other of allSlots) {
      if (other.id === item.id) continue
      if (other.day_of_week !== day) continue

      // Time overlap
      if (start < other.end_time && end > other.start_time) {
        if (item.faculty_id && other.faculty_id && item.faculty_id === other.faculty_id) {
          reasons.push(
            `Faculty Conflict: ${other.faculty_name || 'Faculty'} is already teaching ${other.course_code || 'another subject'} at this time.`
          )
        }
        if (item.room_id && other.room_id && item.room_id === other.room_id) {
          reasons.push(
            `Room Conflict: Room ${other.room_code || 'Room'} is already booked for ${other.division_name || 'Division'}.`
          )
        }
        if (item.division_id === other.division_id) {
          if (other.lock_status !== 'unlocked') {
            reasons.push(`Locked Block Conflict: Cannot overwrite locked ${other.session_type.toUpperCase()} block.`)
          } else if (!item.batch_id || !other.batch_id || item.batch_id === other.batch_id) {
            reasons.push(`Division Conflict: Overlaps with ${other.course_code || other.session_type} for this division/batch.`)
          }
        }
      }
    }

    return {
      has_clash: reasons.length > 0,
      reasons,
    }
  }

  return (
    <div className="relative space-y-4">
      {/* Toast Notification Banner System */}
      <div className="fixed top-20 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-4 ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-100'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                {toast.type === 'error' ? (
                  <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : toast.type === 'warning' ? (
                  <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-xs">{toast.title}</div>
                  <ul className="mt-1 text-[11px] opacity-90 space-y-0.5 list-disc pl-3.5">
                    {toast.messages.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Status Header */}
      <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">
              Interactive Timetable Editor
            </div>
            <div className="text-[11px] text-slate-400">
              Drag unlocked cards between cells. Drops trigger instant OR-Tools clash verification.
            </div>
          </div>
        </div>
        {isValidating && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Validating Clashes...</span>
          </div>
        )}
      </div>

      {/* Drag & Drop Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl">
        <table className="w-full border-collapse min-w-[980px]">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800">
              <th className="p-3 text-xs font-bold uppercase tracking-wider text-slate-400 w-28 text-center border-r border-slate-800">
                Time Window
              </th>
              {DAYS.map((day) => (
                <th
                  key={day.id}
                  className="p-3 text-xs font-bold text-slate-200 text-center border-r border-slate-800 last:border-none"
                >
                  {day.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {TIME_SLOTS.map((tSlot) => {
              const isLunch = tSlot.start === '12:00:00'

              return (
                <tr key={tSlot.start}>
                  {/* Time label */}
                  <td className="p-2.5 text-center font-mono text-[11px] text-slate-400 bg-slate-900/40 border-r border-slate-800 whitespace-nowrap">
                    {tSlot.label}
                  </td>

                  {/* Day drop zones */}
                  {DAYS.map((day) => {
                    if (isLunch) {
                      return (
                        <td
                          key={day.id}
                          className="p-2 text-center bg-slate-950/60 border-r border-slate-800 last:border-none"
                        >
                          <div className="py-2.5 rounded-lg border border-dashed border-slate-800 text-[11px] text-slate-600 font-semibold tracking-wider uppercase">
                            Lunch Break
                          </div>
                        </td>
                      )
                    }

                    const isOver =
                      dropTarget?.day === day.id && dropTarget?.start === tSlot.start

                    const cellSlots = slots.filter(
                      (s) =>
                        s.day_of_week === day.id &&
                        s.start_time <= tSlot.start &&
                        s.end_time >= tSlot.end
                    )

                    return (
                      <td
                        key={day.id}
                        onDragOver={(e) => handleDragOver(e, day.id, tSlot.start)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) =>
                          handleDrop(e, day.id, tSlot.start, tSlot.end)
                        }
                        className={`p-2 align-top border-r border-slate-800/60 last:border-none transition-colors min-h-[90px] ${
                          isOver
                            ? 'bg-indigo-950/40 ring-2 ring-indigo-500 ring-inset'
                            : 'hover:bg-slate-800/10'
                        }`}
                      >
                        {cellSlots.length > 0 ? (
                          <div className="space-y-1.5">
                            {cellSlots.map((slot) => {
                              const isLocked = slot.lock_status !== 'unlocked'

                              return (
                                <div
                                  key={slot.id}
                                  draggable={!isLocked}
                                  onDragStart={(e) => handleDragStart(e, slot)}
                                  className={`p-2.5 rounded-xl border text-xs shadow-md transition-all select-none ${
                                    isLocked
                                      ? 'bg-slate-900/80 border-slate-700/60 cursor-not-allowed opacity-90'
                                      : 'bg-indigo-950/30 border-indigo-500/40 hover:border-indigo-400 hover:shadow-indigo-500/10 cursor-grab active:cursor-grabbing'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1">
                                      {!isLocked && (
                                        <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      )}
                                      <span className="font-bold text-slate-100">
                                        {slot.course_code || slot.course_name || slot.session_type.toUpperCase()}
                                      </span>
                                    </div>

                                    {isLocked && (
                                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400">
                                        <Lock className="w-3 h-3" />
                                        <span>Locked</span>
                                      </div>
                                    )}
                                  </div>

                                  {slot.course_name && slot.course_code && (
                                    <div className="text-[10px] text-slate-300 truncate font-medium">
                                      {slot.course_name}
                                    </div>
                                  )}

                                  <div className="mt-2 pt-1.5 border-t border-slate-700/30 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                    <span className="truncate max-w-[85px]">
                                      {slot.faculty_name || 'Faculty'}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
                                      {slot.room_code || 'Room'}
                                    </span>
                                    {slot.batch_name && (
                                      <span className="font-semibold text-emerald-400">
                                        [{slot.batch_name}]
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="h-full min-h-[64px] rounded-lg border border-dashed border-slate-800/40 flex items-center justify-center text-[10px] text-slate-700">
                            Drop Here
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
