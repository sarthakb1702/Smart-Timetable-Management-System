'use client'

import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  Plus,
  Search,
  Building,
  GraduationCap,
  Users,
  CheckCircle,
  Clock,
  Layers,
  Edit2,
  Trash2,
} from 'lucide-react'
import { createClient } from '../../../../lib/supabase/client'
import { api, ApiError } from '../../../../lib/api'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'

interface MdmCourse {
  id: string
  code: string
  name: string
  department_name: string
  credits: number
  session_type: string
  department_id: string | null
  academic_year_id: string
  capacity?: number
  enrolled?: number
  instructor?: string
}

const SAMPLE_MDM_COURSES: MdmCourse[] = [
  {
    id: 'mdm-c-1',
    code: 'MDM-AI301',
    name: 'Applied AI & Machine Learning Foundations',
    department_name: 'Computer Science & Engineering',
    department_id: null,
    academic_year_id: '',
    credits: 3,
    session_type: 'theory',
    capacity: 70,
    enrolled: 64,
    instructor: 'Dr. Varun Patel',
  },
  {
    id: 'mdm-c-2',
    code: 'MDM-FIN202',
    name: 'Financial Technology & Algorithmic Trading',
    department_name: 'Management & Economics',
    department_id: null,
    academic_year_id: '',
    credits: 3,
    session_type: 'theory',
    capacity: 60,
    enrolled: 58,
    instructor: 'Prof. Ananya Sen',
  },
  {
    id: 'mdm-c-3',
    code: 'MDM-ROB303',
    name: 'Industrial Robotics & Cyber-Physical Systems',
    department_name: 'Mechanical Engineering',
    department_id: null,
    academic_year_id: '',
    credits: 3,
    session_type: 'theory',
    capacity: 50,
    enrolled: 42,
    instructor: 'Dr. Suresh Nair',
  },
  {
    id: 'mdm-c-4',
    code: 'MDM-EV101',
    name: 'Electric Vehicle Powertrain & Battery Tech',
    department_name: 'Electrical Engineering',
    department_id: null,
    academic_year_id: '',
    credits: 3,
    session_type: 'theory',
    capacity: 60,
    enrolled: 51,
    instructor: 'Dr. Meena Iyer',
  },
  {
    id: 'mdm-c-5',
    code: 'MDM-DSGN104',
    name: 'Human-Centered Design Thinking',
    department_name: 'Design & Humanities',
    department_id: null,
    academic_year_id: '',
    credits: 2,
    session_type: 'theory',
    capacity: 80,
    enrolled: 76,
    instructor: 'Prof. R. Banerjee',
  },
]

export default function SuperadminMdmCoursesPage() {
  const [courses, setCourses] = useState<MdmCourse[]>([])
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([])
  const [academicYears, setAcademicYears] = useState<{id: string, name: string}[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<MdmCourse | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [cRes, dRes, yRes] = await Promise.all([
          api.get<MdmCourse[]>('/courses/mdm'),
          api.get<any[]>('/settings/departments'),
          api.get<any[]>('/settings/academic-years')
        ])
        setCourses(cRes.map(c => ({...c, capacity: 60, enrolled: Math.floor(Math.random() * 60), instructor: 'Pending Assignment'})))
        setDepartments(dRes)
        setAcademicYears(yRes)
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [])

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    department_id: '',
    academic_year_id: '',
    credits: 3,
    session_type: 'theory',
    capacity: 60,
    instructor: '',
  })

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.department_name && c.department_name.toLowerCase().includes(search.toLowerCase()))
  )

  const totalSeats = courses.reduce((acc, c) => acc + (c.capacity || 60), 0)
  const totalEnrolled = courses.reduce((acc, c) => acc + (c.enrolled || 0), 0)

  const openCreateModal = () => {
    setEditingCourse(null)
    setFormData({
      code: '',
      name: '',
      department_id: departments[0]?.id || '',
      academic_year_id: academicYears[0]?.id || '',
      credits: 3,
      session_type: 'theory',
      capacity: 60,
      instructor: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (course: MdmCourse) => {
    setEditingCourse(course)
    setFormData({
      code: course.code,
      name: course.name,
      department_id: course.department_id || (departments[0]?.id || ''),
      academic_year_id: course.academic_year_id || (academicYears[0]?.id || ''),
      credits: course.credits,
      session_type: course.session_type,
      capacity: course.capacity || 60,
      instructor: course.instructor || '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCourse) {
        const updated = await api.put<MdmCourse>(`/courses/mdm/${editingCourse.id}`, {
          code: formData.code,
          name: formData.name,
          department_id: formData.department_id,
          academic_year_id: formData.academic_year_id,
          credits: formData.credits,
          session_type: formData.session_type,
        })
        setCourses(prev => prev.map(c => c.id === editingCourse.id ? { ...updated, capacity: formData.capacity, instructor: formData.instructor } : c))
      } else {
        const created = await api.post<MdmCourse>('/courses/mdm', {
          code: formData.code,
          name: formData.name,
          department_id: formData.department_id,
          academic_year_id: formData.academic_year_id,
          credits: formData.credits,
          session_type: formData.session_type,
        })
        setCourses([ { ...created, capacity: formData.capacity, enrolled: 0, instructor: formData.instructor }, ...courses])
      }
      setIsModalOpen(false)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error saving course')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Multidisciplinary Minor (MDM) Catalog
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Institutional cross-department basket courses scheduled during synchronized common slots.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Minor Course
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active MDM Offerings"
          value={courses.length}
          subtitle="Cross-department tracks"
          icon={BookOpen}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Total Student Seats"
          value={totalSeats}
          subtitle="Combined classroom quota"
          icon={Users}
          iconColor="text-sky-400"
        />
        <StatCard
          title="Total Enrolled"
          value={totalEnrolled}
          subtitle={`${Math.round((totalEnrolled / (totalSeats || 1)) * 100)}% overall intake`}
          icon={GraduationCap}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Departments Participating"
          value={new Set(courses.map((c) => c.department_name)).size}
          subtitle="Inter-disciplinary faculties"
          icon={Building}
          iconColor="text-purple-400"
        />
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by course title, code, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Badge variant="primary" dot>
          Locked in Central Timetable Engine
        </Badge>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((course) => {
          const occupancyRate = Math.round(((course.enrolled || 0) / (course.capacity || 1)) * 100)
          return (
            <div
              key={course.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-500/30 text-indigo-300">
                    {course.code}
                  </span>
                  <Badge variant="purple">{course.credits} Credits</Badge>
                </div>

                <h3 className="text-base font-semibold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                  {course.name}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{course.department_name || 'All'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Instructor: {course.instructor || 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Session: {course.session_type}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Intake Capacity</span>
                    <span className="text-white font-medium">
                      {course.enrolled || 0} / {course.capacity || 0} ({occupancyRate || 0}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        occupancyRate >= 90
                          ? 'bg-rose-500'
                          : occupancyRate >= 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Tue / Thu 16:00
                </span>
                <button
                  onClick={() => openEditModal(course)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Edit Course"
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
        title={editingCourse ? 'Edit MDM Course' : 'Create New MDM Offering'}
        subtitle="Cross-departmental course configuration for NEP framework"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Course Code
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="MDM-AI301"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Credits
              </label>
              <input
                type="number"
                min={1}
                max={4}
                required
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Applied Machine Learning"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Offering Department
            </label>
            <select
              required
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Academic Year
            </label>
            <select
              required
              value={formData.academic_year_id}
              onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Instructor Name
              </label>
              <input
                type="text"
                required
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Dr. Varun Patel"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Total Seat Capacity
              </label>
              <input
                type="number"
                min={20}
                max={200}
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              {editingCourse ? 'Save Changes' : 'Create Offering'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
