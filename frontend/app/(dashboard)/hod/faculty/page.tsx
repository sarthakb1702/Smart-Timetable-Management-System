'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Search,
  BookOpen,
  Clock,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  Shield,
  Loader2,
  AlertCircle,
  Building,
} from 'lucide-react'
import { useDepartment, Department } from '../../../../context/DepartmentContext'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'
import { api } from '../../../../lib/api'

interface CourseItem {
  id: string
  code: string
  name: string
  credits?: number
  session_type?: string
  department_id?: string
}

interface AssignedCourse {
  id: string
  code: string
  name: string
  mapping_id?: string
}

interface FacultyMember {
  id: string
  name: string
  designation: string
  email: string
  phone: string
  department_id?: string | null
  department_name?: string | null
  employee_code?: string | null
  max_weekly_hours: number
  assigned_hours: number
  assigned_courses: AssignedCourse[]
}

export default function DeptFacultyPage() {
  const { selectedDepartment, departments } = useDepartment()
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState<FacultyMember | null>(null)

  // Course checklist state for modal
  const [availableCourses, setAvailableCourses] = useState<CourseItem[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [courseSearch, setCourseSearch] = useState('')
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])

  // Form submission state
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    designation: 'Assistant Professor',
    employee_code: '',
    department_id: '',
    email: '',
    phone: '',
    max_weekly_hours: 16,
  })

  // Load faculty directory & faculty-course mappings
  const loadData = async () => {
    try {
      setPageLoading(true)
      const deptId = selectedDepartment?.id
      const [usersRes, mapsRes] = await Promise.all([
        api.get<any[]>(`/settings/users?role=faculty${deptId ? `&department_id=${deptId}` : ''}`),
        api.get<any[]>('/mappings/faculty'),
      ])

      // Group mappings by faculty_id
      const mappingsByFaculty: Record<string, AssignedCourse[]> = {}
      for (const m of mapsRes || []) {
        if (!m.faculty_id || !m.course_id) continue
        const course = m.courses || {}
        ;(mappingsByFaculty[m.faculty_id] ||= []).push({
          id: m.course_id,
          code: course.code || 'N/A',
          name: course.name || 'Course',
          mapping_id: m.id,
        })
      }

      setFacultyList(
        (usersRes || []).map((u) => {
          const courses = mappingsByFaculty[u.id] || []
          return {
            id: u.id,
            name: u.full_name,
            designation: 'Faculty',
            email: u.email,
            phone: u.phone || 'N/A',
            department_id: u.department_id,
            department_name: u.department_name,
            employee_code: u.employee_code,
            max_weekly_hours: 20,
            assigned_hours: courses.length * 4,
            assigned_courses: courses,
          }
        })
      )
    } catch (err) {
      console.error('Failed to load faculty:', err)
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedDepartment])

  // Load courses whenever the modal's chosen department changes
  useEffect(() => {
    if (!formData.department_id) {
      setAvailableCourses([])
      return
    }

    let active = true
    setLoadingCourses(true)
    api
      .get<CourseItem[]>(`/courses?department_id=${formData.department_id}`)
      .then((res) => {
        if (active) {
          setAvailableCourses(res || [])
        }
      })
      .catch((err) => {
        console.error('Error fetching courses for department:', err)
        if (active) setAvailableCourses([])
      })
      .finally(() => {
        if (active) setLoadingCourses(false)
      })

    return () => {
      active = false
    }
  }, [formData.department_id])

  const filtered = facultyList.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.designation.toLowerCase().includes(search.toLowerCase()) ||
      f.email.toLowerCase().includes(search.toLowerCase()) ||
      (f.employee_code && f.employee_code.toLowerCase().includes(search.toLowerCase()))
  )

  const openCreateModal = () => {
    setEditingFaculty(null)
    setFormError(null)
    setCourseSearch('')
    const initialDeptId = selectedDepartment?.id || (departments.length > 0 ? departments[0].id : '')
    setFormData({
      name: '',
      designation: 'Assistant Professor',
      employee_code: '',
      department_id: initialDeptId,
      email: '',
      phone: '',
      max_weekly_hours: 16,
    })
    setSelectedCourseIds([])
    setIsModalOpen(true)
  }

  const openEditModal = (f: FacultyMember) => {
    setEditingFaculty(f)
    setFormError(null)
    setCourseSearch('')
    setFormData({
      name: f.name,
      designation: f.designation,
      employee_code: f.employee_code || '',
      department_id: f.department_id || selectedDepartment?.id || '',
      email: f.email,
      phone: f.phone === 'N/A' ? '' : f.phone,
      max_weekly_hours: f.max_weekly_hours,
    })
    setSelectedCourseIds(f.assigned_courses.map((c) => c.id))
    setIsModalOpen(true)
  }

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      if (editingFaculty) {
        // 1. Update faculty details (name, department, employee_code)
        await api.put(`/settings/users/${editingFaculty.id}/role`, {
          role: 'faculty',
          department_id: formData.department_id,
          employee_code: formData.employee_code || null,
          full_name: formData.name,
        })

        // 2. Synchronize course mappings
        const currentCourseIds = editingFaculty.assigned_courses.map((c) => c.id)
        const toAdd = selectedCourseIds.filter((id) => !currentCourseIds.includes(id))
        const toRemove = editingFaculty.assigned_courses.filter((c) => !selectedCourseIds.includes(c.id))

        await Promise.all([
          ...toAdd.map((courseId) =>
            api.post('/mappings/faculty', {
              faculty_id: editingFaculty.id,
              course_id: courseId,
            })
          ),
          ...toRemove.map((c) => {
            if (c.mapping_id) {
              return api.delete(`/mappings/faculty/${c.mapping_id}`)
            }
            return Promise.resolve()
          }),
        ])
      } else {
        // 1. Create faculty account
        const newUser = await api.post<any>('/settings/users', {
          full_name: formData.name,
          email: formData.email,
          role: 'faculty',
          department_id: formData.department_id,
          employee_code: formData.employee_code || null,
          password: 'Password@123',
        })

        // 2. Map selected courses from checklist
        if (selectedCourseIds.length > 0 && newUser?.id) {
          await Promise.all(
            selectedCourseIds.map((courseId) =>
              api.post('/mappings/faculty', {
                faculty_id: newUser.id,
                course_id: courseId,
              })
            )
          )
        }
      }

      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error('Error saving faculty:', err)
      setFormError(err?.message || 'Failed to save faculty member. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCourses = availableCourses.filter(
    (c) =>
      c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.name.toLowerCase().includes(courseSearch.toLowerCase())
  )

  const totalTeachingHours = facultyList.reduce((a, f) => a + f.assigned_hours, 0)
  const totalMaxCapacity = facultyList.reduce((a, f) => a + f.max_weekly_hours, 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Faculty Directory & Workload Monitor
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Department:{' '}
              <span className="text-brand-700 font-semibold">
                {selectedDepartment ? selectedDepartment.name : 'All Departments'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-medium text-sm shadow-lg shadow-charcoal/15 transition-colors self-start sm:self-auto"
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
          iconColor="text-brand-700"
        />
        <StatCard
          title="Assigned Load"
          value={`${totalTeachingHours} Hrs / Wk`}
          subtitle="Estimated teaching slots"
          icon={Clock}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Total Max Quota"
          value={`${totalMaxCapacity} Hrs / Wk`}
          subtitle="Aggregated workload ceiling"
          icon={Shield}
          iconColor="text-success-700"
        />
        <StatCard
          title="Workload Utilization"
          value={`${Math.round((totalTeachingHours / (totalMaxCapacity || 1)) * 100)}%`}
          subtitle="Balanced faculty distribution"
          icon={CheckCircle2}
          iconColor="text-charcoal"
        />
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl bg-white border border-line p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search faculty by name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>
        <Badge variant="primary" dot>
          Zero Double-Booking Hard Constraint
        </Badge>
      </div>

      {/* Faculty Cards */}
      {pageLoading ? (
        <div className="p-12 text-center text-muted flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
          Loading faculty members...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-line text-muted">
          No faculty members found. Click &quot;Add Faculty&quot; to register instructors for this department.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((faculty) => {
            const loadPercent = Math.round((faculty.assigned_hours / faculty.max_weekly_hours) * 100)
            return (
              <div
                key={faculty.id}
                className="rounded-2xl bg-white border border-line p-5 shadow-xl hover:border-muted/60 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-tint border border-brand/30 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
                        {faculty.name.split(' ').slice(-1)[0][0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-charcoal tracking-tight">{faculty.name}</h3>
                          {faculty.employee_code && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-tint text-brand-700 border border-brand/30">
                              {faculty.employee_code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted flex items-center gap-2">
                          <span>{faculty.designation}</span>
                          {faculty.department_name && (
                            <>
                              <span className="text-muted">·</span>
                              <span className="text-muted">{faculty.department_name}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{faculty.assigned_hours} / {faculty.max_weekly_hours}h</Badge>
                  </div>

                  {/* Workload Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">Weekly Teaching Workload</span>
                      <span className="text-charcoal font-medium">{loadPercent}% capacity</span>
                    </div>
                    <div className="h-1.5 w-full bg-sand rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          loadPercent > 90
                            ? 'bg-warning'
                            : loadPercent > 100
                            ? 'bg-danger'
                            : 'bg-success'
                        }`}
                        style={{ width: `${Math.min(loadPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Course Badges */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">
                      Assigned Eligible Courses ({faculty.assigned_courses.length})
                    </span>
                    {faculty.assigned_courses.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {faculty.assigned_courses.map((c) => (
                          <span
                            key={c.id}
                            className="text-xs px-2.5 py-1 rounded-lg bg-tint border border-brand/30 text-brand-700 font-medium flex items-center gap-1.5"
                            title={c.name}
                          >
                            <BookOpen className="w-3 h-3 text-brand-700 shrink-0" />
                            <span className="font-bold">{c.code}</span>
                            <span className="text-muted text-[11px] truncate max-w-[130px]">{c.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted italic">No courses mapped yet</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-line/80 flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1 truncate max-w-[260px]">
                    <Mail className="w-3.5 h-3.5 shrink-0" /> {faculty.email}
                  </span>
                  <button
                    onClick={() => openEditModal(faculty)}
                    className="p-1.5 rounded-lg text-muted hover:text-charcoal hover:bg-sand transition-colors flex items-center gap-1 text-xs"
                    title="Edit Faculty"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaculty ? 'Edit Faculty Details' : 'Add Faculty Member'}
        subtitle="Manage department assignment, employee code, and eligible teaching courses"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 p-3 text-xs text-danger-700 bg-danger-50 border border-danger/60 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-danger-700" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                placeholder="e.g. Dr. Kavya Iyer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Employee Code
              </label>
              <input
                type="text"
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                placeholder="e.g. FAC-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Department
              </label>
              <select
                required
                value={formData.department_id}
                onChange={(e) => {
                  const newDeptId = e.target.value
                  setFormData({ ...formData, department_id: newDeptId })
                  setSelectedCourseIds([])
                }}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option value="" disabled>Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Designation
              </label>
              <select
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Adjunct Faculty">Adjunct Faculty</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Institutional Email
              </label>
              <input
                type="email"
                required
                disabled={!!editingFaculty}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 disabled:opacity-50"
                placeholder="faculty@college.edu"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Max Hours / Week
              </label>
              <input
                type="number"
                min={8}
                max={30}
                required
                value={formData.max_weekly_hours}
                onChange={(e) =>
                  setFormData({ ...formData, max_weekly_hours: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
          </div>

          {/* Course Checklist (department-filtered) */}
          <div className="space-y-2 pt-1 border-t border-line">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-brand-700" />
                Select Eligible Courses ({availableCourses.length})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCourseIds(availableCourses.map((c) => c.id))}
                  className="text-[11px] text-brand-700 hover:text-brand-700 underline font-medium"
                >
                  Select All
                </button>
                <span className="text-muted">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedCourseIds([])}
                  className="text-[11px] text-muted hover:text-charcoal underline font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Quick search filter for courses */}
            {availableCourses.length > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Filter courses by code or name..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-line text-xs text-charcoal placeholder-muted focus:outline-none focus:border-brand-700"
                />
              </div>
            )}

            {/* Checklist Container */}
            <div className="max-h-52 overflow-y-auto rounded-xl border border-line bg-white divide-y divide-line/60 p-1">
              {loadingCourses ? (
                <div className="p-4 text-center text-xs text-muted flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-700" />
                  Loading courses for selected department...
                </div>
              ) : availableCourses.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted">
                  No courses found for this department. Add courses in Course Management first.
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted">
                  No courses match &quot;{courseSearch}&quot;
                </div>
              ) : (
                filteredCourses.map((course) => {
                  const isChecked = selectedCourseIds.includes(course.id)
                  return (
                    <label
                      key={course.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-tint text-charcoal'
                          : 'hover:bg-sand/50 text-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCourse(course.id)}
                        className="w-4 h-4 rounded border-line bg-sand text-brand-700 focus:ring-brand-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-tint text-brand-700 border border-brand/30">
                            {course.code}
                          </span>
                          <span className="text-xs font-medium truncate">{course.name}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted shrink-0">
                        {course.credits ? `${course.credits} cr` : ''} {course.session_type ? `· ${course.session_type}` : ''}
                      </span>
                    </label>
                  )
                })
              )}
            </div>

            <p className="text-[11px] text-muted">
              Selected: <span className="text-brand-700 font-semibold">{selectedCourseIds.length}</span> course(s) from this department.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-charcoal hover:bg-sand transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand hover:bg-brand-600 text-charcoal text-xs font-semibold shadow-lg shadow-charcoal/15 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingFaculty ? 'Save Changes' : 'Add Faculty'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
