'use client'

import React, { useState } from 'react'
import {
  Building,
  Plus,
  Search,
  Filter,
  Users,
  CheckCircle,
  XCircle,
  Monitor,
  Edit2,
  Trash2,
  Sliders,
} from 'lucide-react'
import { useDepartment } from '../../../../context/DepartmentContext'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'
import { api, ApiError } from '../../../../lib/api'

interface RoomItem {
  id: string
  name: string
  code: string
  room_type: 'classroom' | 'lab' | 'seminar_hall'
  capacity: number
  is_active: boolean
  mapped_courses_count: number
}

export default function DeptResourcesPage() {
  const { selectedDepartment } = useDepartment()
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    room_type: 'classroom' as 'classroom' | 'lab' | 'seminar_hall',
    capacity: 70,
  })

  React.useEffect(() => {
    if (selectedDepartment) {
      api.get<any[]>(`/rooms?department_id=${selectedDepartment.id}`)
        .then(res => {
          setRooms(res.map(r => ({
            id: r.id,
            name: r.name,
            code: r.name.substring(0, 5),
            room_type: r.room_type as any,
            capacity: r.capacity,
            is_active: true,
            mapped_courses_count: 0
          })))
        })
        .catch(err => console.error(err))
    }
  }, [selectedDepartment])

  const filtered = rooms.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || r.room_type === typeFilter
    return matchesSearch && matchesType
  })

  const openCreateModal = () => {
    setEditingRoom(null)
    setFormData({
      name: '',
      code: '',
      room_type: 'classroom',
      capacity: 70,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (room: RoomItem) => {
    setEditingRoom(room)
    setFormData({
      name: room.name,
      code: room.code,
      room_type: room.room_type,
      capacity: room.capacity,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingRoom) {
        const updated = await api.put<any>(`/rooms/${editingRoom.id}`, {
          name: formData.code + ' ' + formData.name, // quick hack to store code since it's missing in backend schema
          room_type: formData.room_type === 'seminar_hall' ? 'classroom' : formData.room_type,
          capacity: formData.capacity,
          department_id: selectedDepartment?.id,
          equipment_tags: []
        })
        setRooms((prev) =>
          prev.map((r) => (r.id === editingRoom.id ? { ...r, ...formData } : r))
        )
      } else {
        const created = await api.post<any>('/rooms', {
          name: formData.code + ' ' + formData.name,
          room_type: formData.room_type === 'seminar_hall' ? 'classroom' : formData.room_type,
          capacity: formData.capacity,
          department_id: selectedDepartment?.id,
          equipment_tags: []
        })
        const newRoom: RoomItem = {
          id: created.id,
          ...formData,
          is_active: true,
          mapped_courses_count: 0,
        }
        setRooms([...rooms, newRoom])
      }
      setIsModalOpen(false)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error saving room')
    }
  }

  const toggleStatus = (id: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
    )
  }

  const classroomCount = rooms.filter((r) => r.room_type === 'classroom').length
  const labCount = rooms.filter((r) => r.room_type === 'lab').length

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Department Rooms & Specialized Labs
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Department:{' '}
              <span className="text-brand-700 font-semibold">
                {selectedDepartment ? selectedDepartment.name : 'Computer Science & Engineering'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-medium text-sm shadow-lg shadow-charcoal/15 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Room / Lab
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Venues"
          value={rooms.length}
          subtitle="Department managed spaces"
          icon={Building}
          iconColor="text-brand-700"
        />
        <StatCard
          title="Classrooms"
          value={classroomCount}
          subtitle="Theory lecture halls"
          icon={Monitor}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Computer Labs"
          value={labCount}
          subtitle="Practical batch spaces"
          icon={Sliders}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Total Desk Capacity"
          value={rooms.reduce((a, r) => a + r.capacity, 0)}
          subtitle="Student seating capacity"
          icon={Users}
          iconColor="text-success-700"
        />
      </div>

      {/* Filter and Search */}
      <div className="rounded-2xl bg-white border border-line p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search rooms by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-line text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-700"
          >
            <option value="all">All Room Types</option>
            <option value="classroom">Classrooms</option>
            <option value="lab">Laboratories</option>
            <option value="seminar_hall">Seminar Halls</option>
          </select>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-sand text-[11px] uppercase tracking-wider text-muted border-b border-line">
              <tr>
                <th className="px-6 py-3.5">Venue Code & Name</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Seating Capacity</th>
                <th className="px-6 py-3.5">Mapped Subjects</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((room) => (
                <tr key={room.id} className="hover:bg-sand/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-tint border border-brand/20 text-brand-700">
                        {room.code}
                      </span>
                      <span className="font-semibold text-charcoal tracking-tight">
                        {room.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        room.room_type === 'classroom'
                          ? 'primary'
                          : room.room_type === 'lab'
                          ? 'purple'
                          : 'amber'
                      }
                    >
                      {room.room_type.toUpperCase()}
                    </Badge>
                  </td>

                  <td className="px-6 py-4 text-xs font-medium text-charcoal">
                    {room.capacity} Students
                  </td>

                  <td className="px-6 py-4 text-xs text-muted">
                    {room.mapped_courses_count} Courses
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(room.id)}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                        room.is_active
                          ? 'bg-success-50 text-success-700 border-success/30'
                          : 'bg-danger-50 text-danger-700 border-danger/30'
                      }`}
                    >
                      {room.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Available
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Maintenance
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(room)}
                      className="p-1.5 rounded-lg text-muted hover:text-charcoal hover:bg-sand transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? 'Edit Room / Laboratory' : 'Add Department Venue'}
        subtitle="Specify room dimensions, category, and student capacity"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Room Code
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                placeholder="R-301 or L-DB1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Category
              </label>
              <select
                value={formData.room_type}
                onChange={(e) =>
                  setFormData({ ...formData, room_type: e.target.value as any })
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option value="classroom">Classroom</option>
                <option value="lab">Laboratory</option>
                <option value="seminar_hall">Seminar Hall</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Venue Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              placeholder="e.g. Advanced Database Systems Lab"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Student Seating Capacity
            </label>
            <input
              type="number"
              min={15}
              max={200}
              required
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
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
              {editingRoom ? 'Save Changes' : 'Create Venue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
