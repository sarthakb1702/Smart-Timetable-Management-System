'use client'

import React, { useEffect, useState } from 'react'
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
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'
import { api, ApiError } from '../../../../lib/api'
import { useDepartment } from '../../../../context/DepartmentContext'

interface CourseItem {
  id: string
  code: string
  name: string
  credits: number
  session_type: string
  academic_year_id?: string
  academic_year_name?: string
}

export default function DeptCoursesPage() {
  const { selectedDepartment } = useDepartment()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [academicYears, setAcademicYears] = useState<{id: string, name: string}[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: 4,
    session_type: 'theory',
    academic_year_id: ''
  })

  useEffect(() => {
    if (selectedDepartment) {
      Promise.all([
        api.get<CourseItem[]>(`/courses?department_id=${selectedDepartment.id}`),
        api.get<any[]>('/settings/academic-years')
      ]).then(([coursesRes, yearsRes]) => {
        setCourses(coursesRes)
        setAcademicYears(yearsRes)
        if (yearsRes.length > 0) {
          setFormData(prev => ({ ...prev, academic_year_id: yearsRes[0].id }))
        }
      }).catch(err => console.error(err))
    }
  }, [selectedDepartment])

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  )

  const openCreateModal = () => {
    setEditingCourse(null)
    setFormData({
      code: '',
      name: '',
      credits: 4,
      session_type: 'theory',
      academic_year_id: academicYears.length > 0 ? academicYears[0].id : ''
    })
    setIsModalOpen(true)
  }

  const openEditModal = (course: CourseItem) => {
    setEditingCourse(course)
    setFormData({
      code: course.code,
      name: course.name,
      credits: course.credits,
      session_type: course.session_type,
      academic_year_id: course.academic_year_id || (academicYears.length > 0 ? academicYears[0].id : '')
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingCourse) {
        const updated = await api.put<CourseItem>(`/courses/${editingCourse.id}`, {
          ...formData,
          department_id: selectedDepartment?.id
        })
        setCourses((prev) =>
          prev.map((c) => (c.id === editingCourse.id ? { ...c, ...updated } : c))
        )
      } else {
        const created = await api.post<CourseItem>('/courses', {
          ...formData,
          department_id: selectedDepartment?.id
        })
        setCourses([created, ...courses])
      }
      setIsModalOpen(false)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error saving course')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return
    try {
      await api.delete(`/courses/${id}`)
      setCourses(courses.filter(c => c.id !== id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error deleting course')
    }
  }

  const totalTheoryCredits = courses.filter(c => c.session_type === 'theory').reduce((a, c) => a + c.credits, 0)
  const totalLabCredits = courses.filter(c => c.session_type === 'lab').reduce((a, c) => a + c.credits, 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Department Core Curriculum & Courses
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Department:{' '}
              <span className="text-brand-700 font-semibold">
                {selectedDepartment ? selectedDepartment.name : 'Computer Science & Engineering'}
              </span>{' '}
              • AY 2026-27 (Odd Semester)
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-medium text-sm shadow-lg shadow-charcoal/15 transition-colors self-start sm:self-auto"
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
          iconColor="text-brand-700"
        />
        <StatCard
          title="Theory Credits"
          value={totalTheoryCredits}
          subtitle="Total theory credits"
          icon={Clock}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Lab Credits"
          value={totalLabCredits}
          subtitle="Total lab credits"
          icon={Layers}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Total Credits"
          value={courses.reduce((a, c) => a + c.credits, 0)}
          subtitle="Academic curriculum load"
          icon={GraduationCap}
          iconColor="text-success-700"
        />
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl bg-white border border-line p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by title, code, or faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>
        <Badge variant="primary" dot>
          Input into OR-Tools Solver
        </Badge>
      </div>

      {/* Courses Table */}
      <div className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="bg-sand text-[11px] uppercase tracking-wider text-muted border-b border-line">
              <tr>
                <th className="px-6 py-3.5">Code & Title</th>
                <th className="px-6 py-3.5">Credits</th>
                <th className="px-6 py-3.5">Session Type</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((course) => (
                <tr key={course.id} className="hover:bg-sand/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-tint border border-brand/20 text-brand-700">
                        {course.code}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-charcoal tracking-tight">
                          {course.name}
                        </span>
                        <span className="text-xs text-muted">{course.academic_year_name}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <Badge variant="purple">{course.credits} Credits</Badge>
                  </td>

                  <td className="px-6 py-4 text-xs text-muted">
                    <Badge variant={course.session_type === 'lab' ? 'success' : 'primary'}>
                      {course.session_type.toUpperCase()}
                    </Badge>
                  </td>

                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(course)}
                      className="p-1.5 rounded-lg text-muted hover:text-charcoal hover:bg-sand transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-danger-700 hover:bg-sand transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Course Code
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                placeholder="CS501"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Credits
              </label>
              <input
                type="number"
                min={1}
                max={5}
                required
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Course Title
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              placeholder="Database Management Systems"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Session Type
              </label>
              <select
                required
                value={formData.session_type}
                onChange={(e) =>
                  setFormData({ ...formData, session_type: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option value="theory">Theory</option>
                <option value="lab">Lab / Practical</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Academic Year
              </label>
              <select
                required
                value={formData.academic_year_id}
                onChange={(e) =>
                  setFormData({ ...formData, academic_year_id: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
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
              {editingCourse ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
