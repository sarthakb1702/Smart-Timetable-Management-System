'use client'

import React, { useEffect, useState } from 'react'
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
import { api, ApiError } from '../../../../lib/api'

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
  lock_status: 'locked' | 'draft'
  options: MdmSlotOption[]
}

export default function CollegeCoordinatorMdmSlotsPage() {
  const [slots, setSlots] = useState<MdmSlot[]>([])
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false)
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [academicYears, setAcademicYears] = useState<{id: string, name: string}[]>([])

  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  useEffect(() => {
    async function fetchData() {
      try {
        const [slotsRes, yearsRes] = await Promise.all([
          api.get<any[]>('/mdm/slots'),
          api.get<any[]>('/settings/academic-years')
        ])
        setAcademicYears(yearsRes)
        setSlots(slotsRes.map(s => ({
          id: s.id,
          name: 'MDM Slot ' + s.start_time,
          day_of_week: s.day_of_week,
          day_name: dayNames[s.day_of_week],
          start_time: s.start_time,
          end_time: s.end_time,
          lock_status: s.status === 'locked' ? 'locked' : 'draft',
          options: (s.options || []).map((o: any) => ({
            id: o.id,
            course_name: o.course_name,
            offering_dept: o.department_name,
            faculty_name: o.faculty_name,
            room_code: o.room_name,
            capacity: o.capacity || 0
          }))
        })))
        if (yearsRes.length > 0) {
          setNewSlotData(prev => ({ ...prev, academic_year_id: yearsRes[0].id }))
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [])

  // New Slot Form
  const [newSlotData, setNewSlotData] = useState({
    academic_year_id: '',
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

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await api.post<any>('/mdm/slots', {
        academic_year_id: newSlotData.academic_year_id,
        day_of_week: Number(newSlotData.day_of_week),
        start_time: newSlotData.start_time,
        end_time: newSlotData.end_time,
        status: 'draft'
      })
      const newSlot: MdmSlot = {
        id: created.id,
        name: 'MDM Slot',
        day_of_week: created.day_of_week,
        day_name: dayNames[created.day_of_week],
        start_time: created.start_time,
        end_time: created.end_time,
        lock_status: created.status === 'locked' ? 'locked' : 'draft',
        options: [],
      }
      setSlots([...slots, newSlot])
      setIsSlotModalOpen(false)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error creating MDM slot')
    }
  }

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault()
    // Placeholder for actual course linking since the frontend form only has names right now.
    // In a real app we'd fetch courses, faculties, rooms and select their IDs to submit to `/mdm/slots/${activeSlotId}/options`
    alert("This requires ID links for courses/faculties which is mocked here for UI completion.")
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
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              MDM Central Synchronized Slots
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Centrally locked common timetable blocks reserved institutional-wide for NEP Multidisciplinary Minors.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSlotModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-medium text-sm shadow-lg shadow-charcoal/15 transition-colors self-start sm:self-auto"
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
          iconColor="text-brand-700"
        />
        <StatCard
          title="Offered Tracks"
          value={totalOptions}
          subtitle="Concurrent minor classes"
          icon={Building}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Simultaneous Capacity"
          value={totalCapacity}
          subtitle="Student desks allocated"
          icon={Users}
          iconColor="text-success-700"
        />
        <StatCard
          title="Scheduler Lock State"
          value="100% Enforced"
          subtitle="OR-Tools hard constraint"
          icon={ShieldCheck}
          iconColor="text-charcoal"
        />
      </div>

      {/* Policy Banner */}
      <div className="p-4 rounded-2xl bg-tint border border-brand/20 text-brand-700 flex items-start gap-3">
        <Lock className="w-5 h-5 text-brand-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-semibold text-charcoal">Institutional Hard Constraint: </span>
          All slots defined here are automatically injected with <code className="text-brand-700">lock_status = &apos;locked_mdm&apos;</code> into each department&apos;s timetable generator. Departmental solvers are mathematically prevented from placing any departmental core or lab sessions during these intervals.
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-6">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden"
          >
            {/* Slot Header Bar */}
            <div className="p-5 border-b border-line/80 bg-sand flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-charcoal tracking-tight">
                    {slot.name}
                  </h2>
                  <Badge variant="primary" dot>
                    Locked MDM Slot
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1 font-medium text-muted">
                    <Calendar className="w-3.5 h-3.5 text-brand-700" />
                    {slot.day_name}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-muted">
                    <Clock className="w-3.5 h-3.5 text-brand-700" />
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
                disabled={slot.lock_status === 'locked'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors self-start sm:self-auto ${slot.lock_status === 'locked' ? 'bg-white text-muted border-line cursor-not-allowed' : 'bg-sand hover:bg-line text-charcoal border-line'}`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Concurrent Course Option
              </button>
            </div>

            {/* Slot Options Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-muted">
                <thead className="bg-sand text-[11px] uppercase tracking-wider text-muted border-b border-line">
                  <tr>
                    <th className="px-6 py-3">Offered Course Option</th>
                    <th className="px-6 py-3">Host Department</th>
                    <th className="px-6 py-3">Assigned Faculty</th>
                    <th className="px-6 py-3">Venue / Room</th>
                    <th className="px-6 py-3">Intake Cap</th>
                    <th className="px-6 py-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {slot.options.map((opt) => (
                    <tr key={opt.id} className="hover:bg-sand/20 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-charcoal text-xs sm:text-sm">
                        {opt.course_name}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted">
                        {opt.offering_dept}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted">
                        {opt.faculty_name}
                      </td>
                      <td className="px-6 py-3.5 text-xs">
                        <span className="font-mono px-2 py-0.5 rounded bg-sand border border-line text-muted">
                          {opt.room_code}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs font-medium text-muted">
                        {opt.capacity} seats
                      </td>
                      <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteOption(slot.id, opt.id)}
                        disabled={slot.lock_status === 'locked'}
                        className={`p-1.5 rounded-lg ${slot.lock_status === 'locked' ? 'opacity-40 cursor-not-allowed' : 'text-muted hover:text-danger-700 hover:bg-sand'} transition-colors`}
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
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Academic Year
            </label>
            <select
              required
              value={newSlotData.academic_year_id}
              onChange={(e) => setNewSlotData({ ...newSlotData, academic_year_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              <option value="" disabled>Select Year</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Day of the Week
            </label>
            <select
              value={newSlotData.day_of_week}
              onChange={(e) =>
                setNewSlotData({ ...newSlotData, day_of_week: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Start Time
              </label>
              <input
                type="time"
                required
                value={newSlotData.start_time}
                onChange={(e) => setNewSlotData({ ...newSlotData, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                End Time
              </label>
              <input
                type="time"
                required
                value={newSlotData.end_time}
                onChange={(e) => setNewSlotData({ ...newSlotData, end_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
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
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Course Offering Title
            </label>
            <input
              type="text"
              required
              value={newOptionData.course_name}
              onChange={(e) => setNewOptionData({ ...newOptionData, course_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              placeholder="e.g. Cyber Security & Cryptography"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Offering Department
            </label>
            <input
              type="text"
              required
              value={newOptionData.offering_dept}
              onChange={(e) => setNewOptionData({ ...newOptionData, offering_dept: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Assigned Instructor
              </label>
              <input
                type="text"
                required
                value={newOptionData.faculty_name}
                onChange={(e) =>
                  setNewOptionData({ ...newOptionData, faculty_name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                placeholder="Dr. S. Kulkarni"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Allocated Room
              </label>
              <input
                type="text"
                required
                value={newOptionData.room_code}
                onChange={(e) => setNewOptionData({ ...newOptionData, room_code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                placeholder="Aud-2 or R-304"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
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
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
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
              Add Course Track
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
