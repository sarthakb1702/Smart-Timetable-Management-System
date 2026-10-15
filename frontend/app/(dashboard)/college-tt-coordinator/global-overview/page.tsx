'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Layers,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Send,
  Calendar,
  Search,
  RotateCw,
  XCircle,
  Eye,
  MessageSquare,
} from 'lucide-react'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { api, ApiError } from '../../../../lib/api'
import { useDepartment } from '../../../../context/DepartmentContext'

interface DeptOverviewItem {
  id: string
  name: string
  code: string
  divisions_count: number
  faculty_count: number
  slot_count: number
  status: 'draft' | 'pending_approval' | 'submitted' | 'approved' | 'published' | 'rejected'
  clashes_count: number
  readiness_percent: number
  submitted_by?: string
  last_updated: string
  comments?: string | null
}

interface OverviewStats {
  departments_active: number
  total_divisions: number
  awaiting_review: number
  published: number
  total_clashes: number
}

const STATUS_CONFIG: Record<string, { label: string; variant: any; dot: boolean }> = {
  draft: { label: 'In Progress (Draft)', variant: 'secondary', dot: false },
  pending_approval: { label: 'Awaiting Coordinator Signoff', variant: 'warning', dot: true },
  submitted: { label: 'Awaiting Coordinator Signoff', variant: 'warning', dot: true },
  approved: { label: 'Approved (Ready to Publish)', variant: 'primary', dot: true },
  published: { label: 'Live & Published', variant: 'success', dot: true },
  rejected: { label: 'Revision Requested', variant: 'danger', dot: true },
}

export default function GlobalOverviewPage() {
  const router = useRouter()
  const { setSelectedDepartment, departments: contextDepts } = useDepartment()

  const [departments, setDepartments] = useState<DeptOverviewItem[]>([])
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [terms, setTerms] = useState<any[]>([])
  const [activeTermId, setActiveTermId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  // 1. Initial Load: Fetch Academic Terms
  useEffect(() => {
    let isMounted = true
    api.get<any[]>('/settings/academic-terms')
      .then((termList) => {
        if (!isMounted) return
        setTerms(termList || [])
        const current = termList.find((t) => t.is_current) || termList[0]
        if (current) {
          setActiveTermId(current.id)
        }
      })
      .catch((err) => {
        console.error('Failed to load academic terms:', err)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // 2. Fetch Live Institutional Overview Data
  const fetchOverview = useCallback(async (termId: string) => {
    if (!termId) return
    setLoading(true)
    try {
      const res = await api.get<{
        term_id: string
        departments: DeptOverviewItem[]
        stats: OverviewStats
      }>(`/timetable/approvals/overview?term_id=${termId}`)

      setDepartments(res.departments || [])
      setStats(res.stats || null)
    } catch (err) {
      console.error('Failed to load institutional overview:', err)
      // Fallback: If overview endpoint failed, load basic departments list
      try {
        const depts = await api.get<any[]>('/settings/departments')
        const mapped: DeptOverviewItem[] = depts.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          divisions_count: 0,
          faculty_count: 0,
          slot_count: 0,
          status: 'draft',
          clashes_count: 0,
          readiness_percent: 0,
          submitted_by: 'Not submitted yet',
          last_updated: 'Not yet',
        }))
        setDepartments(mapped)
      } catch (fallbackErr) {
        console.error('Fallback departments failed:', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTermId) {
      fetchOverview(activeTermId)
    }
  }, [activeTermId, fetchOverview])

  // 3. Action Handlers
  const handlePublishDepartment = async (deptId: string, deptName: string) => {
    setActionBusyId(deptId)
    try {
      await api.post('/timetable/approvals/action', {
        term_id: activeTermId,
        department_id: deptId,
        status: 'published',
        comments: 'Approved and published live by College Coordinator',
      })
      setActionToast({
        type: 'success',
        message: `${deptName} timetable published live for students and faculty.`,
      })
      setTimeout(() => setActionToast(null), 4000)
      await fetchOverview(activeTermId)
    } catch (err) {
      setActionToast({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Publish failed',
      })
      setTimeout(() => setActionToast(null), 4500)
    } finally {
      setActionBusyId(null)
    }
  }

  const handleRejectDepartment = async (deptId: string, deptName: string) => {
    const reason = window.prompt(
      `Enter revision feedback for ${deptName}:`,
      'Please adjust overlapping faculty slots and resubmit.'
    )
    if (reason === null) return // cancelled

    setActionBusyId(deptId)
    try {
      await api.post('/timetable/approvals/action', {
        term_id: activeTermId,
        department_id: deptId,
        status: 'rejected',
        comments: reason || 'Revision requested by College Coordinator',
      })
      setActionToast({
        type: 'success',
        message: `${deptName} timetable sent back for revision.`,
      })
      setTimeout(() => setActionToast(null), 4000)
      await fetchOverview(activeTermId)
    } catch (err) {
      setActionToast({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Action failed',
      })
      setTimeout(() => setActionToast(null), 4500)
    } finally {
      setActionBusyId(null)
    }
  }

  const handlePublishAllPending = async () => {
    const toPublish = departments.filter(
      (d) => d.status === 'pending_approval' || d.status === 'submitted'
    )
    if (toPublish.length === 0) {
      setActionToast({
        type: 'error',
        message: 'No department timetables are currently awaiting signoff.',
      })
      setTimeout(() => setActionToast(null), 3500)
      return
    }

    setActionBusyId('batch-publish')
    try {
      let publishedCount = 0
      for (const d of toPublish) {
        try {
          await api.post('/timetable/approvals/action', {
            term_id: activeTermId,
            department_id: d.id,
            status: 'published',
            comments: 'Batch approved and published by College Coordinator',
          })
          publishedCount++
        } catch (subErr) {
          console.error(`Failed to publish ${d.name}:`, subErr)
        }
      }
      setActionToast({
        type: 'success',
        message: `Successfully published ${publishedCount} department timetable(s) live.`,
      })
      setTimeout(() => setActionToast(null), 4500)
      await fetchOverview(activeTermId)
    } catch (err) {
      setActionToast({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Batch publish failed',
      })
      setTimeout(() => setActionToast(null), 4500)
    } finally {
      setActionBusyId(null)
    }
  }

  const handleInspect = (dept: DeptOverviewItem) => {
    const found = contextDepts.find((d) => d.id === dept.id)
    if (found) {
      setSelectedDepartment(found)
    } else {
      setSelectedDepartment({ id: dept.id, name: dept.name, code: dept.code })
    }
    router.push('/dept-tt-coordinator/edit')
  }

  // 4. Filtering & Stats
  const filtered = departments.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      filterStatus === 'all' ||
      d.status === filterStatus ||
      (filterStatus === 'pending_approval' && (d.status === 'pending_approval' || d.status === 'submitted'))
    return matchesSearch && matchesStatus
  })

  const totalDepts = stats?.departments_active ?? departments.length
  const totalDivisions = stats?.total_divisions ?? departments.reduce((acc, d) => acc + d.divisions_count, 0)
  const awaitingReview =
    stats?.awaiting_review ??
    departments.filter((d) => d.status === 'pending_approval' || d.status === 'submitted').length
  const publishedCount = stats?.published ?? departments.filter((d) => d.status === 'published').length
  const totalClashes = stats?.total_clashes ?? departments.reduce((acc, d) => acc + d.clashes_count, 0)
  const completionPercent = totalDepts > 0 ? Math.round((publishedCount / totalDepts) * 100) : 0

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400 shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Institutional Timetable Master Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Live college-wide progress tracking, division allocations, and publication pipeline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchOverview(activeTermId)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700/80 transition-all disabled:opacity-50"
            title="Refresh overview data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handlePublishAllPending}
            disabled={actionBusyId !== null || awaitingReview === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            {actionBusyId === 'batch-publish' ? 'Publishing...' : `Publish All Pending (${awaitingReview})`}
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionToast && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            actionToast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          {actionToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionToast.message}</span>
        </div>
      )}

      {/* High-Level Institutional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Departments Active"
          value={`${totalDepts} Academic Depts`}
          subtitle={`${totalDivisions} Total Academic Divisions`}
          icon={Building}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Awaiting Signoff"
          value={awaitingReview}
          subtitle="Submitted for Coordinator Approval"
          icon={Clock}
          iconColor="text-amber-400"
        />
        <StatCard
          title="Published Live"
          value={`${publishedCount} / ${totalDepts}`}
          subtitle={`${completionPercent}% Institutional Completion`}
          icon={CheckCircle2}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Cross-Dept Clashes"
          value={totalClashes}
          subtitle={totalClashes === 0 ? 'Zero clashes detected' : 'Action required in schedules'}
          icon={AlertTriangle}
          iconColor={totalClashes === 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search department by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Academic Term Picker */}
          {terms.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={activeTermId}
                onChange={(e) => setActiveTermId(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.name || 'Academic Term'} {t.is_current ? '• Active Term' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Timetable States</option>
            <option value="draft">Draft (In Progress)</option>
            <option value="pending_approval">Awaiting Coordinator Signoff</option>
            <option value="published">Published &amp; Live</option>
            <option value="rejected">Revision Requested</option>
          </select>
        </div>
      </div>

      {/* Departments Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {loading && departments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-sm font-medium text-slate-300">Loading live institutional data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Layers className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">No departments match your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Divisions &amp; Faculty</th>
                  <th className="px-6 py-3.5">Readiness &amp; Slots</th>
                  <th className="px-6 py-3.5">Schedule Status</th>
                  <th className="px-6 py-3.5">Submission Details</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((dept) => {
                  const conf = STATUS_CONFIG[dept.status] || STATUS_CONFIG['draft']
                  const isPending = dept.status === 'pending_approval' || dept.status === 'submitted'
                  const isBusy = actionBusyId === dept.id

                  return (
                    <tr key={dept.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/20 text-indigo-400 shrink-0">
                            {dept.code}
                          </span>
                          <div>
                            <div className="font-semibold text-white tracking-tight">
                              {dept.name}
                            </div>
                            {dept.clashes_count > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium mt-0.5">
                                <AlertTriangle className="w-3 h-3" /> {dept.clashes_count} resource conflict(s)
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">0 clashes</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-300">
                        <div className="font-medium text-white">{dept.divisions_count} Academic Divisions</div>
                        <div className="text-slate-400 mt-0.5">{dept.faculty_count} Faculty assigned</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">
                              {dept.slot_count > 0 ? `${dept.slot_count} slots` : 'No slots'}
                            </span>
                            <span className="text-white font-medium">{dept.readiness_percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                dept.readiness_percent === 100
                                  ? 'bg-emerald-500'
                                  : dept.readiness_percent >= 80
                                  ? 'bg-indigo-500'
                                  : dept.readiness_percent > 30
                                  ? 'bg-amber-500'
                                  : 'bg-slate-600'
                              }`}
                              style={{ width: `${Math.max(5, dept.readiness_percent)}%` }}
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
                        <div className="font-medium text-slate-300">{dept.submitted_by}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{dept.last_updated}</div>
                        {dept.comments && (
                          <div className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1 italic truncate max-w-[200px]" title={dept.comments}>
                            <MessageSquare className="w-3 h-3 shrink-0" />
                            {dept.comments}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handlePublishDepartment(dept.id, dept.name)}
                                disabled={isBusy}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                                title="Publish this department's schedule live to students and faculty"
                              >
                                {isBusy ? 'Publishing...' : 'Publish Live'}
                              </button>

                              <button
                                onClick={() => handleRejectDepartment(dept.id, dept.name)}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors disabled:opacity-50"
                                title="Send back for revision"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleInspect(dept)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1"
                            title="Inspect timetable grid for this department"
                          >
                            <Eye className="w-3 h-3 text-indigo-400" />
                            Inspect <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
