'use client'

import React, { useState } from 'react'
import {
  Clock,
  Lock,
  Plus,
  ShieldCheck,
  Building,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  Save,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'

interface MdmSlotOption {
  id: string
  course_name: string
  offering_dept: string
  faculty_name: string
  room_code: string
  capacity: number
}

interface MdmSlot {
  id: string
  name: string
  day_of_week: number
  day_name: string
  start_time: string
  end_time: string
  lock_status: 'locked_mdm'
  options: MdmSlotOption[]
}

const SAMPLE_MDM_SLOTS: MdmSlot[] = [
  {
    id: 'slot-mdm-tue',
    name: 'College MDM Central Block 1 (Tuesday)',
    day_of_week: 2,
    day_name: 'Tuesday',
    start_time: '16:00',
    end_time: '17:00',
    lock_status: 'locked_mdm',
    options: [
      {
        id: 'opt-1',
        course_name: 'Applied Machine Learning Foundations',
        offering_dept: 'Computer Science & Engineering',
        faculty_name: 'Dr. Varun Patel',
        room_code: 'Auditorium-1',
        capacity: 80,
      },
      {
        id: 'opt-2',
        course_name: 'Financial Technology & Algorithmic Trading',
        offering_dept: 'Management Studies',
        faculty_name: 'Prof. Ananya Sen',
        room_code: 'Seminar Hall B',
        capacity: 65,
      },
      {
        id: 'opt-3',
        course_name: 'Industrial Robotics & Cyber-Physical Systems',
        offering_dept: 'Mechanical Engineering',
        faculty_name: 'Dr. Suresh Nair',
        room_code: 'Mech Seminar Room',
        capacity: 60,
      },
    ],
  },
  {
    id: 'slot-mdm-thu',
    name: 'College MDM Central Block 2 (Thursday)',
    day_of_week: 4,
    day_name: 'Thursday',
    start_time: '16:00',
    end_time: '17:00',
    lock_status: 'locked_mdm',
    options: [
      {
        id: 'opt-4',
        course_name: 'Electric Vehicle Powertrain Architecture',
        offering_dept: 'Electrical Engineering',
        faculty_name: 'Dr. Meena Iyer',
        room_code: 'EE Seminar Hall',
        capacity: 60,
      },
      {
        id: 'opt-5',
        course_name: 'Human-Centered Design Thinking',
        offering_dept: 'Design & Architecture',
        faculty_name: 'Prof. R. Banerjee',
        room_code: 'Studio-3',
        capacity: 75,
      },
      {
        id: 'opt-6',
        course_name: 'Applied Machine Learning Foundations (Track B)',
        offering_dept: 'Computer Science & Engineering',
        faculty_name: 'Prof. Amit Sharma',
        room_code: 'R-301',
        capacity: 70,
      },
    ],
  },
]

export default function CollegeCoordinatorMdmSlotsPage() {
  const [slots, setSlots] = useState<MdmSlot[]>(SAMPLE_MDM_SLOTS)
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false)
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)

  // New Slot Form
  const [newSlotData, setNewSlotData] = useState({
    name: '',
    day_of_week: 3,
    start_time: '16:00',
    end_time: '17:00',
  })

  // New Option Form
  const [newOptionData, setNewOptionData] = useState({
    course_name: '',
    offering_dept: 'Computer Science & Engineering',
    faculty_name: '',
    room_code: 'Auditorium-1',
    capacity: 60,
  })

  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault()
    const newSlot: MdmSlot = {
      id: `slot-mdm-${Date.now()}`,
      name: newSlotData.name,
      day_of_week: Number(newSlotData.day_of_week),
      day_name: dayNames[Number(newSlotData.day_of_week)],
      start_time: newSlotData.start_time,
      end_time: newSlotData.end_time,
      lock_status: 'locked_mdm',
      options: [],
    }
    setSlots([...slots, newSlot])
    setIsSlotModalOpen(false)
  }

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSlotId) return

    const newOpt: MdmSlotOption = {
      id: `opt-${Date.now()}`,
      ...newOptionData,
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

  const handleDeleteOption = (slotId: string, optionId: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              options: s.options.filter((o) => o.id !== optionId),
            }
          : s
      )
    )
  }

  const totalOptions = slots.reduce((acc, s) => acc + s.options.length, 0)
  const totalCapacity = slots.reduce(
    (acc, s) => acc + s.options.reduce((a, o) => a + o.capacity, 0),
    0
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              MDM Central Synchronized Slots
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Centrally locked common timetable blocks reserved institutional-wide for NEP Multidisciplinary Minors.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSlotModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Define Synchronized Slot
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Protected MDM Slots"
          value={slots.length}
          subtitle="Pre-locked college blocks"
          icon={Lock}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Offered Tracks"
          value={totalOptions}
          subtitle="Concurrent minor classes"
          icon={Building}
          iconColor="text-sky-400"
        />
        <StatCard
          title="Simultaneous Capacity"
          value={totalCapacity}
          subtitle="Student desks allocated"
          icon={Users}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Scheduler Lock State"
          value="100% Enforced"
          subtitle="OR-Tools hard constraint"
          icon={ShieldCheck}
          iconColor="text-purple-400"
        />
      </div>

      {/* Policy Banner */}
      <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-indigo-200 flex items-start gap-3">
        <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-semibold text-white">Institutional Hard Constraint: </span>
          All slots defined here are automatically injected with <code className="text-indigo-300">lock_status = &apos;locked_mdm&apos;</code> into each department&apos;s timetable generator. Departmental solvers are mathematically prevented from placing any departmental core or lab sessions during these intervals.
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-6">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden"
          >
            {/* Slot Header Bar */}
            <div className="p-5 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {slot.name}
                  </h2>
                  <Badge variant="primary" dot>
                    Locked MDM Slot
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    {slot.day_name}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    {slot.start_time} - {slot.end_time}
                  </span>
                  <span>{slot.options.length} Course Options Running Concurrently</span>
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
                Add Concurrent Course Option
              </button>
            </div>

            {/* Slot Options Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/30 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Offered Course Option</th>
                    <th className="px-6 py-3">Host Department</th>
                    <th className="px-6 py-3">Assigned Faculty</th>
                    <th className="px-6 py-3">Venue / Room</th>
                    <th className="px-6 py-3">Intake Cap</th>
                    <th className="px-6 py-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {slot.options.map((opt) => (
                    <tr key={opt.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-white text-xs sm:text-sm">
                        {opt.course_name}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-400">
                        {opt.offering_dept}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-300">
                        {opt.faculty_name}
                      </td>
                      <td className="px-6 py-3.5 text-xs">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {opt.room_code}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs font-medium text-slate-300">
                        {opt.capacity} seats
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteOption(slot.id, opt.id)}
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

      {/* Define New Slot Modal */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title="Define Synchronized MDM Slot"
        subtitle="Reserve a college-wide synchronized block across all engineering departments"
      >
        <form onSubmit={handleCreateSlot} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Slot Identifier / Name
            </label>
            <input
              type="text"
              required
              value={newSlotData.name}
              onChange={(e) => setNewSlotData({ ...newSlotData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. College MDM Central Block 3 (Friday)"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Day of the Week
            </label>
            <select
              value={newSlotData.day_of_week}
              onChange={(e) =>
                setNewSlotData({ ...newSlotData, day_of_week: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Start Time
              </label>
              <input
                type="time"
                required
                value={newSlotData.start_time}
                onChange={(e) => setNewSlotData({ ...newSlotData, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                End Time
              </label>
              <input
                type="time"
                required
                value={newSlotData.end_time}
                onChange={(e) => setNewSlotData({ ...newSlotData, end_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
              Create Locked Slot
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Concurrent Course Option Modal */}
      <Modal
        isOpen={isOptionModalOpen}
        onClose={() => setIsOptionModalOpen(false)}
        title="Add Concurrent Course to MDM Slot"
        subtitle="Map a department offering, instructor, and classroom to this central block"
      >
        <form onSubmit={handleAddOption} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Course Offering Title
            </label>
            <input
              type="text"
              required
              value={newOptionData.course_name}
              onChange={(e) => setNewOptionData({ ...newOptionData, course_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Cyber Security & Cryptography"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Offering Department
            </label>
            <input
              type="text"
              required
              value={newOptionData.offering_dept}
              onChange={(e) => setNewOptionData({ ...newOptionData, offering_dept: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Assigned Instructor
              </label>
              <input
                type="text"
                required
                value={newOptionData.faculty_name}
                onChange={(e) =>
                  setNewOptionData({ ...newOptionData, faculty_name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Dr. S. Kulkarni"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Allocated Room
              </label>
              <input
                type="text"
                required
                value={newOptionData.room_code}
                onChange={(e) => setNewOptionData({ ...newOptionData, room_code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Aud-2 or R-304"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Maximum Student Capacity
            </label>
            <input
              type="number"
              min={20}
              max={150}
              required
              value={newOptionData.capacity}
              onChange={(e) =>
                setNewOptionData({ ...newOptionData, capacity: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
              Add Course Track
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
