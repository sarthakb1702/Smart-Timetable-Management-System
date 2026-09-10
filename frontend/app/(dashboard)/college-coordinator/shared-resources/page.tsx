'use client'

import React, { useState } from 'react'
import {
  Building,
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Monitor,
  Wifi,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'

interface SharedResource {
  id: string
  name: string
  code: string
  type: 'auditorium' | 'seminar_hall' | 'lab'
  capacity: number
  equipment: string[]
  current_bookings_count: number
  conflicts_count: number
}

interface BookingLog {
  id: string
  room_code: string
  department_name: string
  purpose: string
  day: string
  time_window: string
  status: 'confirmed' | 'pending' | 'clash'
}

const SAMPLE_SHARED_RESOURCES: SharedResource[] = [
  {
    id: 'res-1',
    name: 'Sir C. V. Raman Central Auditorium',
    code: 'AUD-CENTRAL-1',
    type: 'auditorium',
    capacity: 350,
    equipment: ['4K Laser Projection', 'Dual Line-Array Audio', 'Live Stream Rig', 'HVAC'],
    current_bookings_count: 8,
    conflicts_count: 0,
  },
  {
    id: 'res-2',
    name: 'Turing Advanced AI & HPC Computing Lab',
    code: 'LAB-HPC-CENTER',
    type: 'lab',
    capacity: 75,
    equipment: ['NVIDIA H100 Workstations', '10Gbps Fiber Uplink', 'UPS Backup', 'Access Control'],
    current_bookings_count: 14,
    conflicts_count: 0,
  },
  {
    id: 'res-3',
    name: 'Visvesvaraya Seminar Hall Alpha',
    code: 'SEM-HALL-A',
    type: 'seminar_hall',
    capacity: 120,
    equipment: ['Smart Interactive Podium', 'Wireless Microphones', 'Video Conferencing'],
    current_bookings_count: 6,
    conflicts_count: 1,
  },
  {
    id: 'res-4',
    name: 'Kalam Central CAD/CAM Simulation Center',
    code: 'LAB-CAD-CENTRAL',
    type: 'lab',
    capacity: 60,
    equipment: ['3D Printers', 'ANSYS GPU Cluster', 'SolidWorks Licenses'],
    current_bookings_count: 10,
    conflicts_count: 0,
  },
]

const SAMPLE_BOOKINGS: BookingLog[] = [
  {
    id: 'b-1',
    room_code: 'AUD-CENTRAL-1',
    department_name: 'Computer Science & Engineering',
    purpose: 'MDM: Applied Machine Learning (Mass Lecture)',
    day: 'Tuesday',
    time_window: '16:00 - 17:00',
    status: 'confirmed',
  },
  {
    id: 'b-2',
    room_code: 'LAB-HPC-CENTER',
    department_name: 'Information Technology',
    purpose: 'Distributed Systems & Cloud Computing Lab',
    day: 'Wednesday',
    time_window: '13:00 - 15:00',
    status: 'confirmed',
  },
  {
    id: 'b-3',
    room_code: 'SEM-HALL-A',
    department_name: 'Electronics & Telecommunication',
    purpose: 'Guest Lecture: 5G MIMO Architectures',
    day: 'Thursday',
    time_window: '14:00 - 16:00',
    status: 'clash',
  },
  {
    id: 'b-4',
    room_code: 'SEM-HALL-A',
    department_name: 'Mechanical Engineering',
    purpose: 'Industry Seminar: Additive Manufacturing',
    day: 'Thursday',
    time_window: '14:00 - 16:00',
    status: 'clash',
  },
]

export default function SharedResourcesPage() {
  const [resources, setResources] = useState<SharedResource[]>(SAMPLE_SHARED_RESOURCES)
  const [bookings, setBookings] = useState<BookingLog[]>(SAMPLE_BOOKINGS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const [bookingForm, setBookingForm] = useState({
    room_code: 'AUD-CENTRAL-1',
    department_name: 'Computer Science & Engineering',
    purpose: '',
    day: 'Monday',
    time_window: '10:00 - 12:00',
  })

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault()
    const newB: BookingLog = {
      id: `b-${Date.now()}`,
      room_code: bookingForm.room_code,
      department_name: bookingForm.department_name,
      purpose: bookingForm.purpose,
      day: bookingForm.day,
      time_window: bookingForm.time_window,
      status: 'confirmed',
    }
    setBookings([newB, ...bookings])
    setIsModalOpen(false)
  }

  const resolveClash = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'confirmed' } : b))
    )
  }

  const filteredResources = resources.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Shared Labs, Auditoriums & Seminar Halls
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Centrally managed facilities reserved across multiple engineering disciplines.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Reserve Facility
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Shared Venues"
          value={resources.length}
          subtitle="Centrally pooled facilities"
          icon={Building}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Aggregate Capacity"
          value={resources.reduce((a, r) => a + r.capacity, 0)}
          subtitle="Simultaneous student seats"
          icon={Users}
          iconColor="text-sky-400"
        />
        <StatCard
          title="Weekly Bookings"
          value={bookings.length}
          subtitle="Scheduled timetable blocks"
          icon={Calendar}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Detected Clashes"
          value={bookings.filter((b) => b.status === 'clash').length}
          subtitle="Inter-dept scheduling conflicts"
          icon={AlertTriangle}
          iconColor={
            bookings.some((b) => b.status === 'clash') ? 'text-rose-400' : 'text-emerald-400'
          }
        />
      </div>

      {/* Venues Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Monitor className="w-4 h-4 text-indigo-400" />
          Central Shared Facilities Inventory
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredResources.map((res) => (
            <div
              key={res.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30 text-indigo-300">
                    {res.code}
                  </span>
                  <h3 className="text-base font-bold text-white tracking-tight mt-2">
                    {res.name}
                  </h3>
                </div>
                <Badge variant={res.type === 'auditorium' ? 'purple' : res.type === 'lab' ? 'info' : 'amber'}>
                  {res.type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center gap-6 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-4 h-4 text-slate-400" />
                  Capacity: {res.capacity} students
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {res.current_bookings_count} hours / wk booked
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {res.equipment.map((eq) => (
                  <span
                    key={eq}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300"
                  >
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Department Booking Schedule */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Cross-Department Reservation Log & Conflict Monitor
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live reservations with collision prevention across engineering departments.
            </p>
          </div>
          <Badge variant="primary" dot>
            Real-Time Synchronization
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/20 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Venue</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Purpose / Session</th>
                <th className="px-6 py-3.5">Schedule</th>
                <th className="px-6 py-3.5">Clash Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  className={`transition-colors ${
                    b.status === 'clash'
                      ? 'bg-rose-950/20 hover:bg-rose-950/30'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <td className="px-6 py-4 font-mono text-xs font-bold text-white">
                    {b.room_code}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-300">
                    {b.department_name}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-200">
                    {b.purpose}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    <span className="text-white font-medium">{b.day}</span> • {b.time_window}
                  </td>
                  <td className="px-6 py-4">
                    {b.status === 'clash' ? (
                      <Badge variant="danger" dot>
                        Double-Booking Clash
                      </Badge>
                    ) : (
                      <Badge variant="success" dot>
                        Confirmed Booking
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {b.status === 'clash' ? (
                      <button
                        onClick={() => resolveClash(b.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
                      >
                        Resolve Clash
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">Approved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reserve Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Reserve Shared Facility"
        subtitle="Book central auditorium or computing center for departmental session"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Select Venue
            </label>
            <select
              value={bookingForm.room_code}
              onChange={(e) => setBookingForm({ ...bookingForm, room_code: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {resources.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name} ({r.code} - Cap: {r.capacity})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Department
            </label>
            <input
              type="text"
              required
              value={bookingForm.department_name}
              onChange={(e) =>
                setBookingForm({ ...bookingForm, department_name: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Academic Purpose / Session Name
            </label>
            <input
              type="text"
              required
              value={bookingForm.purpose}
              onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Mass Lecture or Joint Workshop"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Day
              </label>
              <select
                value={bookingForm.day}
                onChange={(e) => setBookingForm({ ...bookingForm, day: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Time Interval
              </label>
              <input
                type="text"
                required
                value={bookingForm.time_window}
                onChange={(e) => setBookingForm({ ...bookingForm, time_window: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="10:00 - 12:00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-colors"
            >
              Confirm Reservation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
