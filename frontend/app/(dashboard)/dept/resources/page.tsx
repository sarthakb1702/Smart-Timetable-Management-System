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

interface RoomItem {
  id: string
  name: string
  code: string
  room_type: 'classroom' | 'lab' | 'seminar_hall'
  capacity: number
  is_active: boolean
  mapped_courses_count: number
}

const SAMPLE_ROOMS: RoomItem[] = [
  {
    id: 'room-301',
    name: 'Lecture Hall 301 (Smart Classroom)',
    code: 'R-301',
    room_type: 'classroom',
    capacity: 70,
    is_active: true,
    mapped_courses_count: 5,
  },
  {
    id: 'room-302',
    name: 'Lecture Hall 302 (Smart Classroom)',
    code: 'R-302',
    room_type: 'classroom',
    capacity: 70,
    is_active: true,
    mapped_courses_count: 4,
  },
  {
    id: 'room-303',
    name: 'Lecture Hall 303',
    code: 'R-303',
    room_type: 'classroom',
    capacity: 65,
    is_active: true,
    mapped_courses_count: 3,
  },
  {
    id: 'lab-db',
    name: 'Advanced Database Systems Lab',
    code: 'L-DB1',
    room_type: 'lab',
    capacity: 35,
    is_active: true,
    mapped_courses_count: 3,
  },
  {
    id: 'lab-os',
    name: 'Systems & Networking Lab',
    code: 'L-SYS2',
    room_type: 'lab',
    capacity: 35,
    is_active: true,
    mapped_courses_count: 3,
  },
  {
    id: 'lab-ai',
    name: 'Artificial Intelligence & Vision Lab',
    code: 'L-AI3',
    room_type: 'lab',
    capacity: 35,
    is_active: true,
    mapped_courses_count: 2,
  },
  {
    id: 'sem-cs',
    name: 'CS Department Seminar & Project Room',
    code: 'SEM-CS',
    room_type: 'seminar_hall',
    capacity: 90,
    is_active: true,
    mapped_courses_count: 1,
  },
]

export default function DeptResourcesPage() {
  const { selectedDepartment } = useDepartment()
  const [rooms, setRooms] = useState<RoomItem[]>(SAMPLE_ROOMS)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRoom) {
      setRooms((prev) =>
        prev.map((r) => (r.id === editingRoom.id ? { ...r, ...formData } : r))
      )
    } else {
      const newRoom: RoomItem = {
        id: `room-${Date.now()}`,
        ...formData,
        is_active: true,
        mapped_courses_count: 0,
      }
      setRooms([...rooms, newRoom])
    }
    setIsModalOpen(false)
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
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Department Rooms & Specialized Labs
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Department:{' '}
              <span className="text-indigo-300 font-semibold">
                {selectedDepartment ? selectedDepartment.name : 'Computer Science & Engineering'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-colors self-start sm:self-auto"
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
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Classrooms"
          value={classroomCount}
          subtitle="Theory lecture halls"
          icon={Monitor}
          iconColor="text-sky-400"
        />
        <StatCard
          title="Computer Labs"
          value={labCount}
          subtitle="Practical batch spaces"
          icon={Sliders}
          iconColor="text-purple-400"
        />
        <StatCard
          title="Total Desk Capacity"
          value={rooms.reduce((a, r) => a + r.capacity, 0)}
          subtitle="Student seating capacity"
          icon={Users}
          iconColor="text-emerald-400"
        />
      </div>

      {/* Filter and Search */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search rooms by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Room Types</option>
            <option value="classroom">Classrooms</option>
            <option value="lab">Laboratories</option>
            <option value="seminar_hall">Seminar Halls</option>
          </select>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Venue Code & Name</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Seating Capacity</th>
                <th className="px-6 py-3.5">Mapped Subjects</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((room) => (
                <tr key={room.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/20 text-indigo-400">
                        {room.code}
                      </span>
                      <span className="font-semibold text-white tracking-tight">
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

                  <td className="px-6 py-4 text-xs font-medium text-slate-200">
                    {room.capacity} Students
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-400">
                    {room.mapped_courses_count} Courses
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(room.id)}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                        room.is_active
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-950/70 text-rose-300 border-rose-500/30'
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
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Room Code
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="R-301 or L-DB1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Category
              </label>
              <select
                value={formData.room_type}
                onChange={(e) =>
                  setFormData({ ...formData, room_type: e.target.value as any })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="classroom">Classroom</option>
                <option value="lab">Laboratory</option>
                <option value="seminar_hall">Seminar Hall</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Venue Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Advanced Database Systems Lab"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Student Seating Capacity
            </label>
            <input
              type="number"
              min={15}
              max={200}
              required
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
              {editingRoom ? 'Save Changes' : 'Create Venue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
