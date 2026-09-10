'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Layers,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  Printer,
  Calendar,
  Sparkles,
  Search,
} from 'lucide-react'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'

interface DeptOverviewItem {
  id: string
  name: string
  code: string
  divisions_count: number
  faculty_count: number
  status: 'draft' | 'submitted' | 'approved' | 'published'
  clashes_count: number
  readiness_percent: number
  submitted_by?: string
  last_updated: string
}

const SAMPLE_DEPTS: DeptOverviewItem[] = [
  {
    id: 'dept-1',
    name: 'Computer Science & Engineering',
    code: 'CSE',
    divisions_count: 6,
    faculty_count: 24,
    status: 'submitted',
    clashes_count: 0,
    readiness_percent: 100,
    submitted_by: 'Dr. Ramesh Deshmukh (HOD)',
    last_updated: 'Today at 14:30',
  },
  {
    id: 'dept-2',
    name: 'Information Technology',
    code: 'IT',
    divisions_count: 4,
    faculty_count: 18,
    status: 'approved',
    clashes_count: 0,
    readiness_percent: 100,
    submitted_by: 'Dr. Sunita Rao (HOD)',
    last_updated: 'Yesterday',
  },
  {
    id: 'dept-3',
    name: 'Electronics & Telecommunication',
    code: 'EXTC',
    divisions_count: 4,
    faculty_count: 16,
    status: 'draft',
    clashes_count: 1,
    readiness_percent: 85,
    submitted_by: 'Prof. K. Mehta',
    last_updated: '2 hours ago',
  },
  {
    id: 'dept-4',
    name: 'Mechanical Engineering',
    code: 'MECH',
    divisions_count: 4,
    faculty_count: 20,
    status: 'published',
    clashes_count: 0,
    readiness_percent: 100,
    submitted_by: 'Dr. S. K. Joshi (HOD)',
    last_updated: 'Sep 08, 2026',
  },
  {
    id: 'dept-5',
    name: 'Artificial Intelligence & Data Science',
    code: 'AI&DS',
    divisions_count: 4,
    faculty_count: 15,
    status: 'submitted',
    clashes_count: 0,
    readiness_percent: 95,
    submitted_by: 'Dr. Priya Singh (HOD)',
    last_updated: 'Today at 10:15',
  },
  {
    id: 'dept-6',
    name: 'Civil Engineering',
    code: 'CIVIL',
    divisions_count: 2,
    faculty_count: 10,
    status: 'draft',
    clashes_count: 0,
    readiness_percent: 70,
    submitted_by: 'Prof. V. Sharma',
    last_updated: '3 days ago',
  },
]

const STATUS_CONFIG: Record<string, { label: string; variant: any; dot: boolean }> = {
  draft: { label: 'In Progress (Draft)', variant: 'secondary', dot: false },
  submitted: { label: 'Awaiting Coordinator Approval', variant: 'warning', dot: true },
  approved: { label: 'Approved (Ready to Publish)', variant: 'primary', dot: true },
  published: { label: 'Live & Published', variant: 'success', dot: true },
}

export default function GlobalOverviewPage() {
  const [departments, setDepartments] = useState<DeptOverviewItem[]>(SAMPLE_DEPTS)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [actionToast, setActionToast] = useState<string | null>(null)

  const handleApprove = (id: string) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'approved' } : d))
    )
    setActionToast('Department timetable approved successfully.')
    setTimeout(() => setActionToast(null), 3500)
  }

  const handlePublishAllApproved = () => {
    setDepartments((prev) =>
      prev.map((d) => (d.status === 'approved' ? { ...d, status: 'published' } : d))
    )
    setActionToast('All approved department timetables published live for students and faculty.')
    setTimeout(() => setActionToast(null), 4000)
  }

  const filtered = departments.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const publishedCount = departments.filter((d) => d.status === 'published').length
  const submittedCount = departments.filter((d) => d.status === 'submitted').length
  const totalDivisions = departments.reduce((acc, d) => acc + d.divisions_count, 0)
  const totalClashes = departments.reduce((acc, d) => acc + d.clashes_count, 0)

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
              Institutional Timetable Master Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              College-wide progress tracking, inter-department coordination, and publication pipeline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePublishAllApproved}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            Publish All Approved
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionToast && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {actionToast}
        </div>
      )}

      {/* High-Level Institutional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Departments Active"
          value={`${departments.length} Engineering Depts`}
          subtitle={`${totalDivisions} Total Academic Divisions`}
          icon={Building}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Awaiting Review"
          value={submittedCount}
          subtitle="Submitted for Coordinator Signoff"
          icon={Clock}
          iconColor="text-amber-400"
        />
        <StatCard
          title="Published Live"
          value={`${publishedCount} / ${departments.length}`}
          subtitle={`${Math.round((publishedCount / departments.length) * 100)}% Institutional Completion`}
          icon={CheckCircle2}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Cross-Dept Clashes"
          value={totalClashes}
          subtitle={totalClashes === 0 ? 'Zero clashes detected' : 'Action required'}
          icon={AlertTriangle}
          iconColor={totalClashes === 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search department by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Timetable States</option>
            <option value="draft">Draft (In Progress)</option>
            <option value="submitted">Submitted for Approval</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* Departments Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Divisions & Faculty</th>
                <th className="px-6 py-3.5">Readiness</th>
                <th className="px-6 py-3.5">Schedule Status</th>
                <th className="px-6 py-3.5">Submission Info</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((dept) => {
                const conf = STATUS_CONFIG[dept.status]
                return (
                  <tr key={dept.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/20 text-indigo-400">
                          {dept.code}
                        </span>
                        <div>
                          <div className="font-semibold text-white tracking-tight">
                            {dept.name}
                          </div>
                          {dept.clashes_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium mt-0.5">
                              <AlertTriangle className="w-3 h-3" /> {dept.clashes_count} resource conflict
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-300">
                      <div>{dept.divisions_count} Divisions</div>
                      <div className="text-slate-400">{dept.faculty_count} Faculty assigned</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="w-28">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Readiness</span>
                          <span className="text-white font-medium">{dept.readiness_percent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              dept.readiness_percent === 100
                                ? 'bg-emerald-500'
                                : dept.readiness_percent > 80
                                ? 'bg-indigo-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${dept.readiness_percent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={conf.variant} dot={conf.dot}>
                        {conf.label}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      <div>{dept.submitted_by || 'Not submitted yet'}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{dept.last_updated}</div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {dept.status === 'submitted' && (
                          <button
                            onClick={() => handleApprove(dept.id)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-500/20 transition-all"
                          >
                            Approve
                          </button>
                        )}
                        <Link
                          href="/dept/edit"
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          Inspect <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
