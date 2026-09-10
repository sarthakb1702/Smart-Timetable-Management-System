'use client'

import React, { useState } from 'react'
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
} from 'lucide-react'
import { useDepartment } from '../../../../context/DepartmentContext'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'

interface BatchItem {
  id: string
  name: string
  student_count: number
}

interface DivisionItem {
  id: string
  name: string
  year_level: number
  capacity: number
  class_teacher: string
  batches: BatchItem[]
}

const SAMPLE_DIVISIONS: DivisionItem[] = [
  {
    id: 'div-te-1',
    name: 'TE-1 (Third Year Section A)',
    year_level: 3,
    capacity: 60,
    class_teacher: 'Prof. Amit Sharma',
    batches: [
      { id: 'b-1', name: 'Batch B1', student_count: 20 },
      { id: 'b-2', name: 'Batch B2', student_count: 20 },
      { id: 'b-3', name: 'Batch B3', student_count: 20 },
    ],
  },
  {
    id: 'div-te-2',
    name: 'TE-2 (Third Year Section B)',
    year_level: 3,
    capacity: 60,
    class_teacher: 'Dr. Varun Patel',
    batches: [
      { id: 'b-4', name: 'Batch B1', student_count: 20 },
      { id: 'b-5', name: 'Batch B2', student_count: 20 },
      { id: 'b-6', name: 'Batch B3', student_count: 20 },
    ],
  },
  {
    id: 'div-be-1',
    name: 'BE-1 (Final Year Section A)',
    year_level: 4,
    capacity: 55,
    class_teacher: 'Prof. S. Deshmukh',
    batches: [
      { id: 'b-7', name: 'Batch B1', student_count: 28 },
      { id: 'b-8', name: 'Batch B2', student_count: 27 },
    ],
  },
]

export default function DeptDivisionsPage() {
  const { selectedDepartment } = useDepartment()
  const [divisions, setDivisions] = useState<DivisionItem[]>(SAMPLE_DIVISIONS)
  const [isDivModalOpen, setIsDivModalOpen] = useState(false)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [selectedDivId, setSelectedDivId] = useState<string | null>(null)

  // Division Form
  const [divForm, setDivForm] = useState({
    name: '',
    year_level: 3,
    capacity: 60,
    class_teacher: '',
  })

  // Batch Form
  const [batchForm, setBatchForm] = useState({
    name: '',
    student_count: 20,
  })

  const handleCreateDivision = (e: React.FormEvent) => {
    e.preventDefault()
    const newDiv: DivisionItem = {
      id: `div-${Date.now()}`,
      name: divForm.name,
      year_level: Number(divForm.year_level),
      capacity: Number(divForm.capacity),
      class_teacher: divForm.class_teacher,
      batches: [
        { id: `b-${Date.now()}-1`, name: 'Batch B1', student_count: Math.round(Number(divForm.capacity) / 2) },
        { id: `b-${Date.now()}-2`, name: 'Batch B2', student_count: Math.round(Number(divForm.capacity) / 2) },
      ],
    }
    setDivisions([...divisions, newDiv])
    setIsDivModalOpen(false)
  }

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDivId) return

    const newBatch: BatchItem = {
      id: `b-${Date.now()}`,
      name: batchForm.name,
      student_count: Number(batchForm.student_count),
    }

    setDivisions((prev) =>
      prev.map((d) =>
        d.id === selectedDivId
          ? {
              ...d,
              batches: [...d.batches, newBatch],
            }
          : d
      )
    )
    setIsBatchModalOpen(false)
  }

  const totalStudents = divisions.reduce((a, d) => a + d.capacity, 0)
  const totalBatches = divisions.reduce((a, d) => a + d.batches.length, 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Academic Divisions & Practical Batches
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
          onClick={() => setIsDivModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Division
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Divisions"
          value={divisions.length}
          subtitle="Lecture cohorts"
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
          title="Division Concurrency"
          value="No Overlap"
          subtitle="OR-Tools hard constraint"
          icon={CheckCircle}
          iconColor="text-emerald-400"
        />
      </div>

      {/* Divisions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {divisions.map((div) => (
          <div
            key={div.id}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-5 hover:border-slate-700 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Year {div.year_level} (Semester {div.year_level * 2 - 1})
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight mt-1">
                  {div.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Class Teacher: {div.class_teacher}
                </p>
              </div>
              <Badge variant="primary">{div.capacity} Students</Badge>
            </div>

            {/* Practical Batches */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-400">
                  Practical Lab Sub-Batches ({div.batches.length})
                </span>
                <button
                  onClick={() => {
                    setSelectedDivId(div.id)
                    setIsBatchModalOpen(true)
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Batch
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {div.batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center space-y-1"
                  >
                    <div className="font-bold text-white text-xs tracking-tight">
                      {batch.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {batch.student_count} Students
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Division Modal */}
      <Modal
        isOpen={isDivModalOpen}
        onClose={() => setIsDivModalOpen(false)}
        title="Create Academic Division"
        subtitle="Define a whole-class lecture group for scheduling"
      >
        <form onSubmit={handleCreateDivision} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Division Name
            </label>
            <input
              type="text"
              required
              value={divForm.name}
              onChange={(e) => setDivForm({ ...divForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. TE-1 (Third Year Section A)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Year Level
              </label>
              <select
                value={divForm.year_level}
                onChange={(e) => setDivForm({ ...divForm, year_level: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>First Year (FE)</option>
                <option value={2}>Second Year (SE)</option>
                <option value={3}>Third Year (TE)</option>
                <option value={4}>Final Year (BE)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Student Headcount
              </label>
              <input
                type="number"
                min={20}
                max={120}
                required
                value={divForm.capacity}
                onChange={(e) => setDivForm({ ...divForm, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Assigned Class Teacher
            </label>
            <input
              type="text"
              required
              value={divForm.class_teacher}
              onChange={(e) => setDivForm({ ...divForm, class_teacher: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Prof. Amit Sharma"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDivModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-colors"
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
        title="Add Practical Batch"
        subtitle="Add a laboratory sub-batch to the division"
      >
        <form onSubmit={handleAddBatch} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Batch Identifier
            </label>
            <input
              type="text"
              required
              value={batchForm.name}
              onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Batch B4"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Student Headcount
            </label>
            <input
              type="number"
              min={10}
              max={50}
              required
              value={batchForm.student_count}
              onChange={(e) =>
                setBatchForm({ ...batchForm, student_count: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-colors"
            >
              Add Batch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
