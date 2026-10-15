'use client'

import React, { useState } from 'react'
import {
  Sliders,
  Plus,
  Clock,
  Building,
  Users,
  Calendar,
  Lock,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle,
} from 'lucide-react'
import { useDepartment } from '../../../../context/DepartmentContext'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'
import { api, ApiError } from '../../../../lib/api'

interface PeOption {
  id: string
  course_code: string
  course_title: string
  faculty_name: string
  room_code: string
  capacity: number
  enrolled: number
}

interface PeSlot {
  id: string
  name: string
  days: string[]
  time_window: string
  lock_status: 'locked' | 'draft'
  options: PeOption[]
}



export default function DeptElectivesPage() {
  const [academicYears, setAcademicYears] = useState<{id: string, name: string}[]>([])
  const [dbSlots, setDbSlots] = useState<any[]>([])
  const [dbOptions, setDbOptions] = useState<any[]>([])
  const { selectedDepartment } = useDepartment()
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false)
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)

  const [slotForm, setSlotForm] = useState({
    name: '',
    time_window: '11:00 - 12:00',
    days_str: 'Monday, Wednesday, Friday',
  })

  const [optForm, setOptForm] = useState({
    course_code: '',
    course_title: '',
    faculty_name: '',
    room_code: 'R-301',
    capacity: 60,
  })

  React.useEffect(() => {
    if (selectedDepartment) {
      Promise.all([
        api.get<any[]>('/settings/academic-years'),
        api.get<any[]>(`/electives/slots?department_id=${selectedDepartment.id}`),
        api.get<any[]>(`/electives/options`), // Gets all options
        api.get<any[]>(`/electives/courses?department_id=${selectedDepartment.id}`)
      ]).then(([years, slots, options, courses]) => {
        setAcademicYears(years)
        setDbSlots(slots)
        
        // Merge courses into options for easy display
        const mappedOptions = options.map(o => {
          const course = courses.find(c => c.id === o.elective_course_id)
          return {
            ...o,
            course_code: course?.code || o.course_code,
            course_title: course?.name || o.course_name,
            academic_year_id: course?.academic_year_id
          }
        })
        setDbOptions(mappedOptions)
      }).catch(err => console.error(err))
    }
  }, [selectedDepartment])

  // Group slots and options by Academic Year to match the UI concept of a "Basket"
  const groupedSlots = academicYears.map(year => {
    const yearSlots = dbSlots.filter(s => s.academic_year_id === year.id)
    const yearOptions = dbOptions.filter(o => o.academic_year_id === year.id)
    
    if (yearSlots.length === 0 && yearOptions.length === 0) return null
    
    return {
      id: year.id,
      name: `Program Elective Basket - ${year.name}`,
      days: Array.from(new Set(yearSlots.map(s => {
        const d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.day_of_week]
        return d
      }))),
      time_window: yearSlots.length > 0 ? `${yearSlots[0].start_time} - ${yearSlots[0].end_time}` : 'No slots defined',
      lock_status: 'locked_pe',
      options: yearOptions.map(o => ({
        id: o.id,
        course_code: o.course_code,
        course_title: o.course_title,
        faculty_name: o.faculty_name || o.faculty_id,
        room_code: o.theory_room_id || 'TBD',
        capacity: o.capacity,
        enrolled: 0
      }))
    }
  }).filter(Boolean) as PeSlot[]

  const slots = groupedSlots

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // In a real app, parse days_str and time_window to create multiple DB slots.
      // For Phase 4 simplification, we just alert that this would insert into elective_slots
      alert("This would parse days and time, and insert into elective_slots for the selected Academic Year.")
      setIsSlotModalOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSlotId) return
    try {
      // 1. Create Course (or find existing). We mock course creation here.
      const course = await api.post<any>('/electives/courses', {
        code: optForm.course_code,
        name: optForm.course_title,
        theory_credits: 3,
        lab_credits: 0,
        academic_year_id: activeSlotId,
        department_id: selectedDepartment?.id
      })
      
      // 2. Create Option. We mock faculty_id/term_id as we don't have dropdowns
      const option = await api.post<any>('/electives/options', {
        elective_course_id: course.id,
        term_id: '00000000-0000-0000-0000-000000000001', // Mock term
        faculty_id: '00000000-0000-0000-0000-000000000001', // Mock faculty
        capacity: Number(optForm.capacity)
      })

      alert("Created PE Course and Option successfully! (using mocked faculty/term IDs for demo)")
      window.location.reload()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error creating PE track. Ensure code is unique.')
    }
  }

  const totalOptions = slots.reduce((a, s) => a + s.options.length, 0)
  const totalEnrolled = slots.reduce(
    (a, s) => a + s.options.reduce((oAcc, o) => oAcc + o.enrolled, 0),
    0
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Program Elective (PE) Basket Manager
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Department:{' '}
              <span className="text-brand-700 font-semibold">
                {selectedDepartment ? selectedDepartment.name : 'Computer Science & Engineering'}
              </span>{' '}
              • AY 2026-27 (Odd Semester)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSlotModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-medium text-sm shadow-lg shadow-charcoal/15 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Define PE Slot Block
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Elective Baskets"
          value={slots.length}
          subtitle="Synchronized parallel slots"
          icon={Sliders}
          iconColor="text-brand-700"
        />
        <StatCard
          title="Parallel Tracks"
          value={totalOptions}
          subtitle="Specialization course choices"
          icon={BookOpen}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Student Registrations"
          value={totalEnrolled}
          subtitle="Confirmed PE enrollments"
          icon={Users}
          iconColor="text-success-700"
        />
        <StatCard
          title="Scheduler Constraint"
          value="Locked (PE Block)"
          subtitle="Strict parallel execution"
          icon={Lock}
          iconColor="text-charcoal"
        />
      </div>

      {/* Policy Box */}
      <div className="p-4 rounded-2xl bg-tint border border-brand/20 text-brand-700 flex items-start gap-3">
        <Lock className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-semibold text-charcoal">Parallel Execution Rule: </span>
          All tracks within a single Program Elective Slot run simultaneously across different classrooms and instructors. The CP-SAT timetable solver pre-locks these slots (<code className="text-brand-700">lock_status = &apos;locked_pe&apos;</code>) to allow seamless student elective choice without schedule clashes.
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-6">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-line bg-sand flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-charcoal tracking-tight">
                    {slot.name}
                  </h2>
                  <Badge variant="purple" dot>
                    Pre-Locked PE Block
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1 font-medium text-muted">
                    <Calendar className="w-3.5 h-3.5 text-brand-700" />
                    {slot.days.join(' • ')}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-muted">
                    <Clock className="w-3.5 h-3.5 text-brand-700" />
                    {slot.time_window}
                  </span>
                  <span>{slot.options.length} Parallel Elective Tracks</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveSlotId(slot.id)
                  setIsOptionModalOpen(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand hover:bg-line text-xs font-semibold text-charcoal border border-line transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Parallel Elective Track
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted">
                <thead className="bg-sand text-[11px] uppercase tracking-wider text-muted border-b border-line">
                  <tr>
                    <th className="px-6 py-3">Code & Elective Title</th>
                    <th className="px-6 py-3">Course Instructor</th>
                    <th className="px-6 py-3">Venue / Classroom</th>
                    <th className="px-6 py-3">Enrollment / Capacity</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {slot.options.map((opt) => (
                    <tr key={opt.id} className="hover:bg-sand/20 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-tint border border-brand/30 text-brand-700">
                            {opt.course_code}
                          </span>
                          <span className="font-semibold text-charcoal text-xs sm:text-sm">
                            {opt.course_title}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-xs text-muted">
                        {opt.faculty_name}
                      </td>

                      <td className="px-6 py-3.5 text-xs">
                        <span className="font-mono px-2 py-0.5 rounded bg-sand border border-line text-muted">
                          {opt.room_code}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-charcoal">
                            {opt.enrolled} / {opt.capacity}
                          </span>
                          <span className="text-[10px] text-muted">
                            ({Math.round((opt.enrolled / opt.capacity) * 100)}%)
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={async () => {
                            if (confirm('Delete this option?')) {
                              await api.delete(`/electives/options/${opt.id}`)
                              window.location.reload()
                            }
                          }}
                          className="p-1.5 rounded-lg text-muted hover:text-danger-700 hover:bg-sand transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Define Slot Modal */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title="Define Program Elective (PE) Slot"
        subtitle="Establish a synchronized time window for multiple parallel elective classes"
      >
        <form onSubmit={handleCreateSlot} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Basket Identifier / Name
            </label>
            <input
              type="text"
              required
              value={slotForm.name}
              onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              placeholder="e.g. Program Elective Track 3"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Days (Comma separated)
            </label>
            <input
              type="text"
              required
              value={slotForm.days_str}
              onChange={(e) => setSlotForm({ ...slotForm, days_str: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              placeholder="Monday, Wednesday, Friday"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Time Interval
            </label>
            <input
              type="text"
              required
              value={slotForm.time_window}
              onChange={(e) => setSlotForm({ ...slotForm, time_window: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              placeholder="11:00 - 12:00"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={() => setIsSlotModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-charcoal hover:bg-sand transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-charcoal text-xs font-semibold shadow-lg shadow-charcoal/15 transition-colors"
            >
              Create PE Basket
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Track Option Modal */}
      <Modal
        isOpen={isOptionModalOpen}
        onClose={() => setIsOptionModalOpen(false)}
        title="Add Parallel Track to PE Basket"
        subtitle="Assign course syllabus, instructor, and classroom venue"
      >
        <form onSubmit={handleAddOption} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Track Code
              </label>
              <input
                type="text"
                required
                value={optForm.course_code}
                onChange={(e) => setOptForm({ ...optForm, course_code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                placeholder="PE-AI"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Intake Capacity
              </label>
              <input
                type="number"
                min={20}
                max={120}
                required
                value={optForm.capacity}
                onChange={(e) => setOptForm({ ...optForm, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Course Title
            </label>
            <input
              type="text"
              required
              value={optForm.course_title}
              onChange={(e) => setOptForm({ ...optForm, course_title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              placeholder="e.g. Deep Learning & Computer Vision"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Instructor
              </label>
              <input
                type="text"
                required
                value={optForm.faculty_name}
                onChange={(e) => setOptForm({ ...optForm, faculty_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                placeholder="Dr. Varun Patel"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Classroom Venue
              </label>
              <input
                type="text"
                required
                value={optForm.room_code}
                onChange={(e) => setOptForm({ ...optForm, room_code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                placeholder="R-302"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={() => setIsOptionModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-charcoal hover:bg-sand transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-charcoal text-xs font-semibold shadow-lg shadow-charcoal/15 transition-colors"
            >
              Add Track
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
