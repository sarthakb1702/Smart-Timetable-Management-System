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
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'

interface MdmCourse {
  id: string
  code: string
  title: string
  offering_department: string
  credits: number
  capacity: number
  enrolled: number
  eligible_semesters: string
  instructor: string
}

const SAMPLE_MDM_COURSES: MdmCourse[] = [
  {
    id: 'mdm-c-1',
    code: 'MDM-AI301',
    title: 'Applied AI & Machine Learning Foundations',
    offering_department: 'Computer Science & Engineering',
    credits: 3,
    capacity: 70,
    enrolled: 64,
    eligible_semesters: 'Sem 5, Sem 7',
    instructor: 'Dr. Varun Patel',
  },
  {
    id: 'mdm-c-2',
    code: 'MDM-FIN202',
    title: 'Financial Technology & Algorithmic Trading',
    offering_department: 'Management & Economics',
    credits: 3,
    capacity: 60,
    enrolled: 58,
    eligible_semesters: 'Sem 5, Sem 6, Sem 7',
    instructor: 'Prof. Ananya Sen',
  },
  {
    id: 'mdm-c-3',
    code: 'MDM-ROB303',
    title: 'Industrial Robotics & Cyber-Physical Systems',
    offering_department: 'Mechanical Engineering',
    credits: 3,
    capacity: 50,
    enrolled: 42,
    eligible_semesters: 'Sem 5, Sem 7',
    instructor: 'Dr. Suresh Nair',
  },
  {
    id: 'mdm-c-4',
    code: 'MDM-EV101',
    title: 'Electric Vehicle Powertrain & Battery Tech',
    offering_department: 'Electrical Engineering',
    credits: 3,
    capacity: 60,
    enrolled: 51,
    eligible_semesters: 'Sem 5, Sem 7',
    instructor: 'Dr. Meena Iyer',
  },
  {
    id: 'mdm-c-5',
    code: 'MDM-DSGN104',
    title: 'Human-Centered Design Thinking',
    offering_department: 'Design & Humanities',
    credits: 2,
    capacity: 80,
    enrolled: 76,
    eligible_semesters: 'All Semesters',
    instructor: 'Prof. R. Banerjee',
  },
]

export default function SuperadminMdmCoursesPage() {
  const [courses, setCourses] = useState<MdmCourse[]>(SAMPLE_MDM_COURSES)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<MdmCourse | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    offering_department: 'Computer Science & Engineering',
    credits: 3,
    capacity: 60,
    eligible_semesters: 'Sem 5, Sem 7',
    instructor: '',
  })

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.offering_department.toLowerCase().includes(search.toLowerCase())
  )

  const totalSeats = courses.reduce((acc, c) => acc + c.capacity, 0)
  const totalEnrolled = courses.reduce((acc, c) => acc + c.enrolled, 0)

  const openCreateModal = () => {
    setEditingCourse(null)
    setFormData({
      code: '',
      title: '',
      offering_department: 'Computer Science & Engineering',
      credits: 3,
      capacity: 60,
      eligible_semesters: 'Sem 5, Sem 7',
      instructor: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (course: MdmCourse) => {
    setEditingCourse(course)
    setFormData({
      code: course.code,
      title: course.title,
      offering_department: course.offering_department,
      credits: course.credits,
      capacity: course.capacity,
      eligible_semesters: course.eligible_semesters,
      instructor: course.instructor,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCourse) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === editingCourse.id
            ? {
                ...c,
                ...formData,
              }
            : c
        )
      )
    } else {
      const newCourse: MdmCourse = {
        id: `mdm-c-${Date.now()}`,
        ...formData,
        enrolled: 0,
      }
      setCourses([newCourse, ...courses])
    }
    setIsModalOpen(false)
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
          value={new Set(courses.map((c) => c.offering_department)).size}
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
          const occupancyRate = Math.round((course.enrolled / course.capacity) * 100)
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
                  {course.title}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{course.offering_department}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Instructor: {course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Eligibility: {course.eligible_semesters}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Intake Capacity</span>
                    <span className="text-white font-medium">
                      {course.enrolled} / {course.capacity} ({occupancyRate}%)
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
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Applied Machine Learning"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Offering Department
            </label>
            <input
              type="text"
              required
              value={formData.offering_department}
              onChange={(e) => setFormData({ ...formData, offering_department: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
