'use client'

import React, { useEffect, useState } from 'react'
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
import { api, ApiError } from '../../../../lib/api'

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
  const [resources, setResources] = useState<SharedResource[]>([])
  const [bookings, setBookings] = useState<BookingLog[]>(SAMPLE_BOOKINGS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get<any[]>('/rooms?is_shared=true').then(res => {
      setResources(res.map(r => ({
        id: r.id,
        name: r.name,
        code: r.name.substring(0, 5).toUpperCase() + '-' + r.capacity,
        type: r.room_type as any,
        capacity: r.capacity,
        equipment: r.equipment_tags || [],
        current_bookings_count: 0,
        conflicts_count: 0
      })))
    }).catch(err => console.error(err))
  }, [])

  const [bookingForm, setBookingForm] = useState({
    room_name: '',
    room_type: 'auditorium',
    capacity: 60,
    equipment: 'Projector, WiFi',
  })

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await api.post<any>('/rooms', {
        name: bookingForm.room_name,
        room_type: bookingForm.room_type === 'lab' ? 'lab' : 'classroom',
        capacity: bookingForm.capacity,
        equipment_tags: bookingForm.equipment.split(',').map(s => s.trim()),
        department_id: null // Shared resource
      })
      setResources(prev => [{
        id: created.id,
        name: created.name,
        code: created.name.substring(0, 5).toUpperCase() + '-' + created.capacity,
        type: created.room_type,
        capacity: created.capacity,
        equipment: created.equipment_tags,
        current_bookings_count: 0,
        conflicts_count: 0
      }, ...prev])
      setIsModalOpen(false)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error creating room')
    }
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
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Shared Labs, Auditoriums & Seminar Halls
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Centrally managed facilities reserved across multiple engineering disciplines.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-medium text-sm shadow-lg shadow-charcoal/15 transition-colors self-start sm:self-auto"
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
          iconColor="text-brand-700"
        />
        <StatCard
          title="Aggregate Capacity"
          value={resources.reduce((a, r) => a + r.capacity, 0)}
          subtitle="Simultaneous student seats"
          icon={Users}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Weekly Bookings"
          value={bookings.length}
          subtitle="Scheduled timetable blocks"
          icon={Calendar}
          iconColor="text-success-700"
        />
        <StatCard
          title="Detected Clashes"
          value={bookings.filter((b) => b.status === 'clash').length}
          subtitle="Inter-dept scheduling conflicts"
          icon={AlertTriangle}
          iconColor={
            bookings.some((b) => b.status === 'clash') ? 'text-danger-700' : 'text-success-700'
          }
        />
      </div>

      {/* Venues Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-charcoal tracking-tight flex items-center gap-2">
          <Monitor className="w-4 h-4 text-brand-700" />
          Central Shared Facilities Inventory
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredResources.map((res) => (
            <div
              key={res.id}
              className="rounded-2xl bg-white border border-line p-5 shadow-xl hover:border-muted/60 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-tint border border-brand/30 text-brand-700">
                    {res.code}
                  </span>
                  <h3 className="text-base font-bold text-charcoal tracking-tight mt-2">
                    {res.name}
                  </h3>
                </div>
                <Badge variant={res.type === 'auditorium' ? 'purple' : res.type === 'lab' ? 'info' : 'amber'}>
                  {res.type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center gap-6 text-xs text-muted">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-4 h-4 text-muted" />
                  Capacity: {res.capacity} students
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted" />
                  {res.current_bookings_count} hours / wk booked
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {res.equipment.map((eq) => (
                  <span
                    key={eq}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-sand/60 border border-line/60 text-muted"
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
      <div className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden space-y-0">
        <div className="p-5 border-b border-line bg-sand flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-charcoal tracking-tight">
              Cross-Department Reservation Log & Conflict Monitor
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Live reservations with collision prevention across engineering departments.
            </p>
          </div>
          <Badge variant="primary" dot>
            Real-Time Synchronization
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-sand text-[11px] uppercase tracking-wider text-muted border-b border-line">
              <tr>
                <th className="px-6 py-3.5">Venue</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Purpose / Session</th>
                <th className="px-6 py-3.5">Schedule</th>
                <th className="px-6 py-3.5">Clash Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  className={`transition-colors ${
                    b.status === 'clash'
                      ? 'bg-danger-50 hover:bg-danger-50'
                      : 'hover:bg-sand/30'
                  }`}
                >
                  <td className="px-6 py-4 font-mono text-xs font-bold text-charcoal">
                    {b.room_code}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-muted">
                    {b.department_name}
                  </td>
                  <td className="px-6 py-4 text-xs text-charcoal">
                    {b.purpose}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted">
                    <span className="text-charcoal font-medium">{b.day}</span> • {b.time_window}
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
                        className="px-2.5 py-1 rounded-lg bg-danger hover:bg-danger-600 text-white font-semibold text-xs transition-colors"
                      >
                        Resolve Clash
                      </button>
                    ) : (
                      <span className="text-xs text-muted font-mono">Approved</span>
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
        title="Add Shared Facility"
        subtitle="Create a new shared auditorium or lab"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Facility Name
            </label>
            <input
              type="text"
              required
              value={bookingForm.room_name}
              onChange={(e) => setBookingForm({ ...bookingForm, room_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              placeholder="e.g. C.V. Raman Auditorium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Type
            </label>
            <select
              value={bookingForm.room_type}
              onChange={(e) => setBookingForm({ ...bookingForm, room_type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              <option value="auditorium">Auditorium / Seminar Hall</option>
              <option value="lab">Computer / Hardware Lab</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Capacity
            </label>
            <input
              type="number"
              required
              value={bookingForm.capacity}
              onChange={(e) => setBookingForm({ ...bookingForm, capacity: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Equipment Tags (comma separated)
            </label>
            <input
              type="text"
              required
              value={bookingForm.equipment}
              onChange={(e) => setBookingForm({ ...bookingForm, equipment: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-charcoal hover:bg-sand transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-charcoal text-xs font-semibold shadow-lg shadow-charcoal/15 transition-colors"
            >
              Add Facility
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
