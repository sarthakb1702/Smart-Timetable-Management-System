'use client'

import React, { useState } from 'react'
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  Building,
  GraduationCap,
  Edit2,
  Trash2,
  Layers,
} from 'lucide-react'
import { useDepartment } from '../../../../context/DepartmentContext'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'

interface CourseItem {
  id: string
  code: string
  name: string
  credits: number
  weekly_theory_hours: number
  weekly_lab_hours: number
  weekly_tutorial_hours: number
  preferred_room_type: 'classroom' | 'lab'
  assigned_faculty_name: string
}

const SAMPLE_COURSES: CourseItem[] = [
  {
    id: 'cs-501',
    code: 'CS501',
    name: 'Database Management Systems',
    credits: 4,
    weekly_theory_hours: 3,
    weekly_lab_hours: 2,
    weekly_tutorial_hours: 0,
    preferred_room_type: 'classroom',
    assigned_faculty_name: 'Prof. Amit Sharma',
  },
  {
    id: 'cs-502',
    code: 'CS502',
    name: 'Operating Systems & Concurrency',
    credits: 4,
    weekly_theory_hours: 3,
    weekly_lab_hours: 2,
    weekly_tutorial_hours: 0,
    preferred_room_type: 'classroom',
    assigned_faculty_name: 'Dr. Varun Patel',
  },
  {
    id: 'cs-503',
    code: 'CS503',
    name: 'Design & Analysis of Algorithms',
    credits: 3,
    weekly_theory_hours: 3,
    weekly_lab_hours: 0,
    weekly_tutorial_hours: 1,
    preferred_room_type: 'classroom',
    assigned_faculty_name: 'Prof. S. Deshmukh',
  },
  {
    id: 'cs-504',
    code: 'CS504',
    name: 'Computer Networks & Security',
    credits: 4,
    weekly_theory_hours: 3,
    weekly_lab_hours: 2,
    weekly_tutorial_hours: 0,
    preferred_room_type: 'classroom',
    assigned_faculty_name: 'Dr. K. Rao',
  },
  {
    id: 'cs-505',
    code: 'CS505',
    name: 'Software Engineering & Agile Methodologies',
    credits: 3,
    weekly_theory_hours: 3,
    weekly_lab_hours: 0,
    weekly_tutorial_hours: 0,
    preferred_room_type: 'classroom',
    assigned_faculty_name: 'Prof. Sneha Kulkarni',
  },
]

export default function DeptCoursesPage() {
  const { selectedDepartment } = useDepartment()
  const [courses, setCourses] = useState<CourseItem[]>(SAMPLE_COURSES)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: 4,
    weekly_theory_hours: 3,
    weekly_lab_hours: 2,
    weekly_tutorial_hours: 0,
    preferred_room_type: 'classroom' as 'classroom' | 'lab',
    assigned_faculty_name: '',
  })

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.assigned_faculty_name.toLowerCase().includes(search.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingCourse(null)
    setFormData({
      code: '',
      name: '',
      credits: 4,
      weekly_theory_hours: 3,
      weekly_lab_hours: 2,
      weekly_tutorial_hours: 0,
      preferred_room_type: 'classroom',
      assigned_faculty_name: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (course: CourseItem) => {
    setEditingCourse(course)
    setFormData({
      code: course.code,
      name: course.name,
      credits: course.credits,
      weekly_theory_hours: course.weekly_theory_hours,
      weekly_lab_hours: course.weekly_lab_hours,
      weekly_tutorial_hours: course.weekly_tutorial_hours,
      preferred_room_type: course.preferred_room_type,
      assigned_faculty_name: course.assigned_faculty_name,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCourse) {
      setCourses((prev) =>
        prev.map((c) => (c.id === editingCourse.id ? { ...c, ...formData } : c))
      )
    } else {
      const newCourse: CourseItem = {
        id: `cs-${Date.now()}`,
        ...formData,
      }
      setCourses([...courses, newCourse])
    }
    setIsModalOpen(false)
  }

  const totalTheoryHours = courses.reduce((a, c) => a + c.weekly_theory_hours, 0)
  const totalLabHours = courses.reduce((a, c) => a + c.weekly_lab_hours, 0)

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
              Department Core Curriculum & Courses
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
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Core Courses"
          value={courses.length}
          subtitle="Department syllabus subjects"
          icon={BookOpen}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Weekly Theory Hours"
          value={`${totalTheoryHours} Hrs / Wk`}
          subtitle="1-hour lecture blocks"
          icon={Clock}
          iconColor="text-sky-400"
        />
        <StatCard
          title="Weekly Lab Hours"
          value={`${totalLabHours} Hrs / Wk`}
          subtitle="2-hour continuous sessions"
          icon={Layers}
          iconColor="text-purple-400"
        />
        <StatCard
          title="Total Credits"
          value={courses.reduce((a, c) => a + c.credits, 0)}
          subtitle="Academic curriculum load"
          icon={GraduationCap}
          iconColor="text-emerald-400"
        />
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, code, or faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Badge variant="primary" dot>
          Input into OR-Tools Solver
        </Badge>
      </div>

      {/* Courses Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Code & Title</th>
                <th className="px-6 py-3.5">Credits</th>
                <th className="px-6 py-3.5">Weekly Hours Distribution</th>
                <th className="px-6 py-3.5">Preferred Venue</th>
                <th className="px-6 py-3.5">Assigned Faculty</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((course) => (
                <tr key={course.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/20 text-indigo-400">
                        {course.code}
                      </span>
                      <span className="font-semibold text-white tracking-tight">
                        {course.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <Badge variant="purple">{course.credits} Credits</Badge>
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        {course.weekly_theory_hours}h Theory
                      </span>
                      {course.weekly_lab_hours > 0 && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                          {course.weekly_lab_hours}h Lab
                        </span>
                      )}
                      {course.weekly_tutorial_hours > 0 && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                          {course.weekly_tutorial_hours}h Tut
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-xs">
                    <Badge variant={course.preferred_room_type === 'lab' ? 'purple' : 'primary'}>
                      {course.preferred_room_type.toUpperCase()}
                    </Badge>
                  </td>

                  <td className="px-6 py-4 text-xs font-medium text-slate-200">
                    {course.assigned_faculty_name || 'Unassigned'}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(course)}
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
        title={editingCourse ? 'Edit Course Details' : 'Add Department Course'}
        subtitle="Specify weekly theory and lab continuous duration constraints"
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
                placeholder="CS501"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Credits
              </label>
              <input
                type="number"
                min={1}
                max={5}
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
              placeholder="Database Management Systems"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Theory (Hrs/Wk)
              </label>
              <input
                type="number"
                min={0}
                max={6}
                required
                value={formData.weekly_theory_hours}
                onChange={(e) =>
                  setFormData({ ...formData, weekly_theory_hours: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Lab (Hrs/Wk)
              </label>
              <input
                type="number"
                min={0}
                max={4}
                step={2}
                required
                value={formData.weekly_lab_hours}
                onChange={(e) =>
                  setFormData({ ...formData, weekly_lab_hours: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Tutorials
              </label>
              <input
                type="number"
                min={0}
                max={2}
                required
                value={formData.weekly_tutorial_hours}
                onChange={(e) =>
                  setFormData({ ...formData, weekly_tutorial_hours: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Assigned Faculty
            </label>
            <input
              type="text"
              required
              value={formData.assigned_faculty_name}
              onChange={(e) =>
                setFormData({ ...formData, assigned_faculty_name: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Prof. Amit Sharma"
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
              {editingCourse ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
