'use client'

import React, { useState } from 'react'
import {
  Users,
  Plus,
  Search,
  Filter,
  Shield,
  BookOpen,
  Clock,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { useDepartment } from '../../../../context/DepartmentContext'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'

interface FacultyMember {
  id: string
  name: string
  designation: string
  email: string
  phone: string
  max_weekly_hours: number
  assigned_hours: number
  assigned_courses: string[]
}

const SAMPLE_FACULTY: FacultyMember[] = [
  {
    id: 'fac-1',
    name: 'Prof. Amit Sharma',
    designation: 'Associate Professor',
    email: 'sharma.faculty@smartcollege.edu',
    phone: '+91 98230 22334',
    max_weekly_hours: 16,
    assigned_hours: 14,
    assigned_courses: ['CS501 (DBMS)', 'CS501L (DBMS Lab)'],
  },
  {
    id: 'fac-2',
    name: 'Dr. Varun Patel',
    designation: 'Professor',
    email: 'patel.faculty@smartcollege.edu',
    phone: '+91 98230 55667',
    max_weekly_hours: 16,
    assigned_hours: 15,
    assigned_courses: ['CS502 (Operating Systems)', 'MDM-AI301 (Machine Learning)'],
  },
  {
    id: 'fac-3',
    name: 'Prof. S. Deshmukh',
    designation: 'Assistant Professor',
    email: 'deshmukh.faculty@smartcollege.edu',
    phone: '+91 98230 66778',
    max_weekly_hours: 18,
    assigned_hours: 12,
    assigned_courses: ['CS503 (Design & Analysis of Algorithms)'],
  },
  {
    id: 'fac-4',
    name: 'Dr. K. Rao',
    designation: 'Associate Professor',
    email: 'rao.faculty@smartcollege.edu',
    phone: '+91 98230 11244',
    max_weekly_hours: 16,
    assigned_hours: 14,
    assigned_courses: ['CS504 (Computer Networks & Security)'],
  },
  {
    id: 'fac-5',
    name: 'Prof. Sneha Kulkarni',
    designation: 'Dept Timetable Coordinator',
    email: 'kulkarni.faculty@smartcollege.edu',
    phone: '+91 98230 99001',
    max_weekly_hours: 14,
    assigned_hours: 10,
    assigned_courses: ['CS505 (Software Engineering)'],
  },
]

export default function DeptFacultyPage() {
  const { selectedDepartment } = useDepartment()
  const [facultyList, setFacultyList] = useState<FacultyMember[]>(SAMPLE_FACULTY)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    designation: 'Assistant Professor',
    email: '',
    phone: '',
    max_weekly_hours: 16,
    assigned_courses_str: '',
  })

  const filtered = facultyList.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.designation.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingFaculty(null)
    setFormData({
      name: '',
      designation: 'Assistant Professor',
      email: '',
      phone: '',
      max_weekly_hours: 16,
      assigned_courses_str: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (f: FacultyMember) => {
    setEditingFaculty(f)
    setFormData({
      name: f.name,
      designation: f.designation,
      email: f.email,
      phone: f.phone,
      max_weekly_hours: f.max_weekly_hours,
      assigned_courses_str: f.assigned_courses.join(', '),
    })
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const coursesArr = formData.assigned_courses_str
      ? formData.assigned_courses_str.split(',').map((s) => s.trim())
      : []

    if (editingFaculty) {
      setFacultyList((prev) =>
        prev.map((f) =>
          f.id === editingFaculty.id
            ? {
                ...f,
                name: formData.name,
                designation: formData.designation,
                email: formData.email,
                phone: formData.phone,
                max_weekly_hours: formData.max_weekly_hours,
                assigned_courses: coursesArr,
              }
            : f
        )
      )
    } else {
      const newF: FacultyMember = {
        id: `fac-${Date.now()}`,
        name: formData.name,
        designation: formData.designation,
        email: formData.email,
        phone: formData.phone,
        max_weekly_hours: formData.max_weekly_hours,
        assigned_hours: 0,
        assigned_courses: coursesArr,
      }
      setFacultyList([...facultyList, newF])
    }
    setIsModalOpen(false)
  }

  const totalTeachingHours = facultyList.reduce((a, f) => a + f.assigned_hours, 0)
  const totalMaxCapacity = facultyList.reduce((a, f) => a + f.max_weekly_hours, 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Faculty Directory & Workload Monitor
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
          Add Faculty
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Teaching Faculty"
          value={facultyList.length}
          subtitle="Department instructors"
          icon={Users}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Assigned Load"
          value={`${totalTeachingHours} Hrs / Wk`}
          subtitle="Scheduled teaching commitments"
          icon={Clock}
          iconColor="text-sky-400"
        />
        <StatCard
          title="Total Max Quota"
          value={`${totalMaxCapacity} Hrs / Wk`}
          subtitle="Aggregated workload ceiling"
          icon={Shield}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Workload Utilization"
          value={`${Math.round((totalTeachingHours / (totalMaxCapacity || 1)) * 100)}%`}
          subtitle="Balanced faculty distribution"
          icon={CheckCircle2}
          iconColor="text-purple-400"
        />
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty by name, title, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Badge variant="primary" dot>
          Zero Double-Booking Hard Constraint
        </Badge>
      </div>

      {/* Faculty Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((faculty) => {
          const loadPercent = Math.round((faculty.assigned_hours / faculty.max_weekly_hours) * 100)
          return (
            <div
              key={faculty.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                      {faculty.name.split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-white tracking-tight">{faculty.name}</h3>
                      <p className="text-xs text-slate-400">{faculty.designation}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{faculty.assigned_hours} / {faculty.max_weekly_hours}h</Badge>
                </div>

                {/* Workload Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Weekly Teaching Workload</span>
                    <span className="text-white font-medium">{loadPercent}% capacity</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        loadPercent > 90
                          ? 'bg-amber-500'
                          : loadPercent > 100
                          ? 'bg-rose-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(loadPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Course Badges */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Assigned Courses
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {faculty.assigned_courses.map((c) => (
                      <span
                        key={c}
                        className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-indigo-300 font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {faculty.email}
                </span>
                <button
                  onClick={() => openEditModal(faculty)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaculty ? 'Edit Faculty Details' : 'Add Faculty Member'}
        subtitle="Manage teaching hours limits and subject assignments"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Prof. Amit Sharma"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Academic Designation
              </label>
              <select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Dept Timetable Coordinator">Dept Timetable Coordinator</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Max Hours / Week
              </label>
              <input
                type="number"
                min={8}
                max={24}
                required
                value={formData.max_weekly_hours}
                onChange={(e) =>
                  setFormData({ ...formData, max_weekly_hours: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Institutional Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Assigned Courses (Comma separated)
            </label>
            <input
              type="text"
              value={formData.assigned_courses_str}
              onChange={(e) => setFormData({ ...formData, assigned_courses_str: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. CS501 (DBMS), CS501L (Lab)"
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
              {editingFaculty ? 'Save Changes' : 'Add Faculty'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
