'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Layers,
  Plus,
  Users,
  Building,
  GraduationCap,
  Edit2,
  Trash2,
  CheckCircle,
  Sparkles,
  UserCheck,
  RotateCw,
} from 'lucide-react'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'
import { api, ApiError } from '../../../../lib/api'
import { useDepartment } from '../../../../context/DepartmentContext'

interface BatchItem {
  id: string
  division_id?: string
  name: string
  student_count: number
}

interface DivisionItem {
  id: string
  name: string
  year_level: number
  capacity: number
  class_teacher: string
  faculty_id?: string
  batches: BatchItem[]
  academic_year_id?: string
  academic_year_name?: string
  term_id?: string
}

interface FacultyUser {
  id: string
  full_name: string
  email: string
  employee_code?: string
  department_id?: string
}

export default function DeptDivisionsPage() {
  const { selectedDepartment } = useDepartment()
  const [divisions, setDivisions] = useState<DivisionItem[]>([])
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; code: string; sequence?: number }[]>([])
  const [faculties, setFaculties] = useState<FacultyUser[]>([])
  const [loading, setLoading] = useState(true)

  const [isDivModalOpen, setIsDivModalOpen] = useState(false)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [selectedDivId, setSelectedDivId] = useState<string | null>(null)

  // Division Form
  const [divForm, setDivForm] = useState({
    name: '',
    year_level: 1,
    capacity: 60,
    faculty_id: '',
    class_teacher: '',
    academic_year_id: '',
  })

  // Batch Form
  const [batchForm, setBatchForm] = useState({
    name: '',
    student_count: 20,
  })

  const loadData = useCallback(async () => {
    if (!selectedDepartment) return
    setLoading(true)
    try {
      const [divRes, yearsRes, facRes] = await Promise.all([
        api.get<any[]>(`/divisions?department_id=${selectedDepartment.id}`),
        api.get<any[]>('/settings/academic-years'),
        api.get<FacultyUser[]>(`/settings/users?role=faculty&department_id=${selectedDepartment.id}`),
      ])

      setAcademicYears(yearsRes || [])
      setFaculties(facRes || [])

      // Fetch batches for each division in parallel
      const enrichedDivisions: DivisionItem[] = await Promise.all(
        (divRes || []).map(async (d) => {
          let batches: BatchItem[] = []
          try {
            batches = await api.get<BatchItem[]>(`/batches?division_id=${d.id}`)
          } catch {
            batches = []
          }

          const yearMatch = (yearsRes || []).find((y: any) => y.id === d.academic_year_id)

          return {
            id: d.id,
            name: d.name,
            year_level: yearMatch?.sequence || 1,
            capacity: d.student_count || 60,
            class_teacher: d.class_teacher || 'Unassigned',
            faculty_id: d.faculty_id,
            academic_year_id: d.academic_year_id,
            academic_year_name: yearMatch?.name || d.academic_year_name,
            batches: batches || [],
          }
        })
      )

      setDivisions(enrichedDivisions)

      if (yearsRes && yearsRes.length > 0) {
        setDivForm((prev) => ({
          ...prev,
          academic_year_id: prev.academic_year_id || yearsRes[0].id,
        }))
      }
    } catch (err) {
      console.error('Failed to load divisions data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedDepartment])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openCreateModal = () => {
    setDivForm({
      name: '',
      year_level: academicYears.length > 0 ? academicYears[0].sequence || 1 : 1,
      capacity: 60,
      faculty_id: faculties.length > 0 ? faculties[0].id : '',
      class_teacher: faculties.length > 0 ? faculties[0].full_name : '',
      academic_year_id: academicYears.length > 0 ? academicYears[0].id : '',
    })
    setIsDivModalOpen(true)
  }

  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDepartment) return

    try {
      const selectedYear = academicYears.find((y) => y.id === divForm.academic_year_id)
      const selectedFaculty = faculties.find((f) => f.id === divForm.faculty_id)

      await api.post<any>('/divisions', {
        name: divForm.name,
        student_count: Number(divForm.capacity),
        department_id: selectedDepartment.id,
        academic_year_id: divForm.academic_year_id,
        faculty_id: divForm.faculty_id || null,
        class_teacher: selectedFaculty ? selectedFaculty.full_name : null,
      })

      setIsDivModalOpen(false)
      await loadData()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error creating division.')
    }
  }

  const handleDeleteDivision = async (divId: string, divName: string) => {
    if (!confirm(`Are you sure you want to delete "${divName}"? All associated sub-batches and scheduled slots will also be removed.`)) return
    try {
      await api.delete(`/divisions/${divId}`)
      await loadData()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete division.')
    }
  }

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDivId) return

    try {
      await api.post<BatchItem>('/batches', {
        division_id: selectedDivId,
        name: batchForm.name,
        student_count: Number(batchForm.student_count),
      })
      setIsBatchModalOpen(false)
      setBatchForm({ name: '', student_count: 20 })
      await loadData()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to add practical batch.')
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await api.delete(`/batches/${batchId}`)
      await loadData()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete batch.')
    }
  }

  const totalStudents = divisions.reduce((a, d) => a + d.capacity, 0)
  const totalBatches = divisions.reduce((a, d) => a + d.batches.length, 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Academic Divisions &amp; Batches
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage class divisions, map assigned faculty class teachers, and configure laboratory practical sub-batches for {selectedDepartment?.name}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700/80 transition-all"
            title="Refresh divisions"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Division
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Divisions"
          value={divisions.length}
          subtitle="Lecture cohorts in department"
          icon={Layers}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Enrolled Students"
          value={totalStudents}
          subtitle="Total departmental learners"
          icon={Users}
          iconColor="text-sky-400"
        />
        <StatCard
          title="Lab Sub-Batches"
          value={totalBatches}
          subtitle="Practical lab groups"
          icon={GraduationCap}
          iconColor="text-purple-400"
        />
        <StatCard
          title="Faculty Assigned"
          value={divisions.filter((d) => d.class_teacher !== 'Unassigned').length}
          subtitle={`Out of ${divisions.length} divisions mapped`}
          icon={UserCheck}
          iconColor="text-emerald-400"
        />
      </div>

      {/* Divisions List */}
      {loading && divisions.length === 0 ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-sm font-medium text-slate-300">Loading divisions &amp; batch assignments...</p>
        </div>
      ) : divisions.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400">
          <Layers className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No Divisions Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Get started by creating your department&apos;s first academic division and assigning a faculty class teacher.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Create Division Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {divisions.map((div) => (
            <div
              key={div.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
                      {div.academic_year_name || `Year ${div.year_level}`}
                    </span>
                    <h3 className="text-lg font-bold text-white tracking-tight mt-1">
                      {div.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Class Teacher:</span>
                      <span className={div.class_teacher === 'Unassigned' ? 'text-amber-400 italic' : 'font-medium text-white'}>
                        {div.class_teacher}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="primary">{div.capacity} Students</Badge>
                    <button
                      onClick={() => handleDeleteDivision(div.id, div.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete division"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Practical Batches */}
                <div className="space-y-2 pt-4 mt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-slate-400">
                      Practical Lab Batches ({div.batches.length})
                    </span>
                    <button
                      onClick={() => {
                        setSelectedDivId(div.id)
                        setBatchForm({ name: '', student_count: Math.round(div.capacity / 3) || 20 })
                        setIsBatchModalOpen(true)
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Batch
                    </button>
                  </div>

                  {div.batches.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      No lab batches created yet. Click &quot;Add Batch&quot; to divide students into practical groups.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {div.batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-left group"
                        >
                          <div>
                            <div className="font-bold text-white text-xs tracking-tight">
                              {batch.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {batch.student_count} Students
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteBatch(batch.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Division Modal */}
      <Modal
        isOpen={isDivModalOpen}
        onClose={() => setIsDivModalOpen(false)}
        title="Create Academic Division"
        subtitle="Define a class cohort and map an assigned faculty member"
      >
        <form onSubmit={handleCreateDivision} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Division Name
            </label>
            <input
              type="text"
              required
              value={divForm.name}
              onChange={(e) => setDivForm({ ...divForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. TE-1 or Division A"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Academic Year / Cohort
              </label>
              <select
                required
                value={divForm.academic_year_id}
                onChange={(e) => {
                  const yid = e.target.value
                  const ymatch = academicYears.find((y) => y.id === yid)
                  setDivForm({
                    ...divForm,
                    academic_year_id: yid,
                    year_level: ymatch?.sequence || 1,
                  })
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id} className="bg-slate-900 text-white">
                    {y.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Student Headcount
              </label>
              <input
                type="number"
                min={10}
                max={200}
                required
                value={divForm.capacity}
                onChange={(e) => setDivForm({ ...divForm, capacity: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Assigned Class Teacher Selection from Real Faculty List */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Assigned Class Teacher (Faculty)
              </span>
              <span className="text-[11px] text-indigo-400 font-normal">
                {faculties.length} Faculty in Department
              </span>
            </label>
            <select
              value={divForm.faculty_id}
              onChange={(e) => {
                const fid = e.target.value
                const selectedFaculty = faculties.find((f) => f.id === fid)
                setDivForm({
                  ...divForm,
                  faculty_id: fid,
                  class_teacher: selectedFaculty ? selectedFaculty.full_name : 'Unassigned',
                })
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">
                -- Select Faculty Class Teacher --
              </option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                  {f.full_name} {f.employee_code ? `[${f.employee_code}]` : ''} ({f.email})
                </option>
              ))}
            </select>
            {faculties.length === 0 && (
              <p className="text-[11px] text-amber-400 mt-1">
                No faculty members found for {selectedDepartment?.name}. You can add faculty in the Faculty Directory.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDivModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-colors"
            >
              Create Division
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Batch Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Add Practical Lab Batch"
        subtitle="Add a laboratory practical sub-batch to this division"
      >
        <form onSubmit={handleAddBatch} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Batch Identifier
            </label>
            <input
              type="text"
              required
              value={batchForm.name}
              onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Batch A1 or Lab Group 1"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Student Headcount
            </label>
            <input
              type="number"
              min={1}
              max={100}
              required
              value={batchForm.student_count}
              onChange={(e) =>
                setBatchForm({ ...batchForm, student_count: Number(e.target.value) })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-colors"
            >
              Add Batch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
