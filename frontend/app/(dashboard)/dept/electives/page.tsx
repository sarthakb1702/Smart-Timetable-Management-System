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
  lock_status: 'locked_pe'
  options: PeOption[]
}

const SAMPLE_PE_SLOTS: PeSlot[] = [
  {
    id: 'pe-slot-1',
    name: 'Program Elective Track 1 (Third Year TE)',
    days: ['Monday', 'Wednesday', 'Friday'],
    time_window: '11:00 - 12:00',
    lock_status: 'locked_pe',
    options: [
      {
        id: 'opt-1',
        course_code: 'PE-CLOUD',
        course_title: 'Cloud Architecture & Microservices',
        faculty_name: 'Prof. M. Gupta',
        room_code: 'Auditorium-1',
        capacity: 65,
        enrolled: 58,
      },
      {
        id: 'opt-2',
        course_code: 'PE-SEC',
        course_title: 'Cyber Security & Penetration Testing',
        faculty_name: 'Dr. S. Kulkarni',
        room_code: 'L-SYS2',
        capacity: 40,
        enrolled: 38,
      },
      {
        id: 'opt-3',
        course_code: 'PE-NLP',
        course_title: 'Natural Language Processing with Transformers',
        faculty_name: 'Dr. Varun Patel',
        room_code: 'R-302',
        capacity: 65,
        enrolled: 62,
      },
    ],
  },
  {
    id: 'pe-slot-2',
    name: 'Program Elective Track 2 (Final Year BE)',
    days: ['Tuesday', 'Thursday'],
    time_window: '14:00 - 15:30',
    lock_status: 'locked_pe',
    options: [
      {
        id: 'opt-4',
        course_code: 'PE-BLOCK',
        course_title: 'Blockchain Engineering & Decentralized Apps',
        faculty_name: 'Prof. K. Rao',
        room_code: 'R-301',
        capacity: 60,
        enrolled: 45,
      },
      {
        id: 'opt-5',
        course_code: 'PE-QUANT',
        course_title: 'Quantum Computing Algorithms',
        faculty_name: 'Prof. S. Deshmukh',
        room_code: 'R-303',
        capacity: 50,
        enrolled: 34,
      },
    ],
  },
]

export default function DeptElectivesPage() {
  const { selectedDepartment } = useDepartment()
  const [slots, setSlots] = useState<PeSlot[]>(SAMPLE_PE_SLOTS)
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false)
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)

  // Slot Form
  const [slotForm, setSlotForm] = useState({
    name: '',
    time_window: '11:00 - 12:00',
    days_str: 'Monday, Wednesday, Friday',
  })

  // Option Form
  const [optForm, setOptForm] = useState({
    course_code: '',
    course_title: '',
    faculty_name: '',
    room_code: 'R-301',
    capacity: 60,
  })

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault()
    const newSlot: PeSlot = {
      id: `pe-slot-${Date.now()}`,
      name: slotForm.name,
      days: slotForm.days_str.split(',').map((s) => s.trim()),
      time_window: slotForm.time_window,
      lock_status: 'locked_pe',
      options: [],
    }
    setSlots([...slots, newSlot])
    setIsSlotModalOpen(false)
  }

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSlotId) return

    const newOpt: PeOption = {
      id: `opt-${Date.now()}`,
      course_code: optForm.course_code,
      course_title: optForm.course_title,
      faculty_name: optForm.faculty_name,
      room_code: optForm.room_code,
      capacity: Number(optForm.capacity),
      enrolled: 0,
    }

    setSlots((prev) =>
      prev.map((s) =>
        s.id === activeSlotId
          ? {
              ...s,
              options: [...s.options, newOpt],
            }
          : s
      )
    )
    setIsOptionModalOpen(false)
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
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Program Elective (PE) Basket Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Department:{' '}
              <span className="text-indigo-300 font-semibold">
                {selectedDepartment ? selectedDepartment.name : 'Computer Science & Engineering'}
              </span>{' '}
              • AY 2026-27 (Odd Semester)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSlotModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-colors self-start sm:self-auto"
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
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Parallel Tracks"
          value={totalOptions}
          subtitle="Specialization course choices"
          icon={BookOpen}
          iconColor="text-sky-400"
        />
        <StatCard
          title="Student Registrations"
          value={totalEnrolled}
          subtitle="Confirmed PE enrollments"
          icon={Users}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Scheduler Constraint"
          value="Locked (PE Block)"
          subtitle="Strict parallel execution"
          icon={Lock}
          iconColor="text-purple-400"
        />
      </div>

      {/* Policy Box */}
      <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-200 flex items-start gap-3">
        <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-semibold text-white">Parallel Execution Rule: </span>
          All tracks within a single Program Elective Slot run simultaneously across different classrooms and instructors. The CP-SAT timetable solver pre-locks these slots (<code className="text-indigo-300">lock_status = &apos;locked_pe&apos;</code>) to allow seamless student elective choice without schedule clashes.
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-6">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {slot.name}
                  </h2>
                  <Badge variant="purple" dot>
                    Pre-Locked PE Block
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    {slot.days.join(' • ')}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Parallel Elective Track
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/30 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Code & Elective Title</th>
                    <th className="px-6 py-3">Course Instructor</th>
                    <th className="px-6 py-3">Venue / Classroom</th>
                    <th className="px-6 py-3">Enrollment / Capacity</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {slot.options.map((opt) => (
                    <tr key={opt.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30 text-indigo-300">
                            {opt.course_code}
                          </span>
                          <span className="font-semibold text-white text-xs sm:text-sm">
                            {opt.course_title}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-xs text-slate-300">
                        {opt.faculty_name}
                      </td>

                      <td className="px-6 py-3.5 text-xs">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {opt.room_code}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {opt.enrolled} / {opt.capacity}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({Math.round((opt.enrolled / opt.capacity) * 100)}%)
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSlots((prev) =>
                              prev.map((s) =>
                                s.id === slot.id
                                  ? {
                                      ...s,
                                      options: s.options.filter((o) => o.id !== opt.id),
                                    }
                                  : s
                              )
                            )
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Basket Identifier / Name
            </label>
            <input
              type="text"
              required
              value={slotForm.name}
              onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Program Elective Track 3"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Days (Comma separated)
            </label>
            <input
              type="text"
              required
              value={slotForm.days_str}
              onChange={(e) => setSlotForm({ ...slotForm, days_str: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Monday, Wednesday, Friday"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Time Interval
            </label>
            <input
              type="text"
              required
              value={slotForm.time_window}
              onChange={(e) => setSlotForm({ ...slotForm, time_window: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="11:00 - 12:00"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSlotModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-colors"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Track Code
              </label>
              <input
                type="text"
                required
                value={optForm.course_code}
                onChange={(e) => setOptForm({ ...optForm, course_code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="PE-AI"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Intake Capacity
              </label>
              <input
                type="number"
                min={20}
                max={120}
                required
                value={optForm.capacity}
                onChange={(e) => setOptForm({ ...optForm, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Course Title
            </label>
            <input
              type="text"
              required
              value={optForm.course_title}
              onChange={(e) => setOptForm({ ...optForm, course_title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Deep Learning & Computer Vision"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Instructor
              </label>
              <input
                type="text"
                required
                value={optForm.faculty_name}
                onChange={(e) => setOptForm({ ...optForm, faculty_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Dr. Varun Patel"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Classroom Venue
              </label>
              <input
                type="text"
                required
                value={optForm.room_code}
                onChange={(e) => setOptForm({ ...optForm, room_code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="R-302"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsOptionModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-colors"
            >
              Add Track
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
