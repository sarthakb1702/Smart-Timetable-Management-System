'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  CheckSquare,
  ShieldCheck,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { useDepartment } from '../../context/DepartmentContext'
import { Badge, BadgeVariant } from '../ui/Badge'
import { api, ApiError } from '../../lib/api'

type BackendStatus = 'draft' | 'pending_approval' | 'published' | 'rejected'

interface ApprovalState {
  status: BackendStatus
  approval: Record<string, any> | null
  slot_count: number
  slots_by_status: Record<string, number>
}

interface LogRow {
  id: string
  action: string
  created_at: string
  reason?: string | null
  users?: { full_name?: string } | null
}

const ACTION_VARIANT: Record<string, BadgeVariant> = {
  publish: 'success',
  published: 'success',
  submit: 'primary',
  create: 'info',
  update: 'amber',
  delete: 'danger',
  reject: 'danger',
  rejected: 'danger',
}

function clashMessages(err: unknown): string[] {
  if (err instanceof ApiError) {
    const detail = err.detail as any
    if (detail && typeof detail === 'object' && Array.isArray(detail.clashes)) {
      return detail.clashes
        .map((c: any) => (typeof c === 'string' ? c : c?.message))
        .filter(Boolean)
    }
    return [err.message]
  }
  return ['Action failed. Please try again.']
}

export function ApprovalWorkflowPanel() {
  const { selectedDepartment, userRole, isGlobalUser } = useDepartment()
  const [termId, setTermId] = useState('')
  const [termLabel, setTermLabel] = useState('')
  const [state, setState] = useState<ApprovalState | null>(null)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [commentText, setCommentText] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; title: string; messages: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const showToast = (type: 'success' | 'error', title: string, messages: string[]) => {
    setToast({ type, title, messages })
    setTimeout(() => setToast(null), 6000)
  }

  const loadLogs = useCallback(async (tId: string, deptId: string) => {
    const data = await api.get<LogRow[]>(
      `/timetable/logs?term_id=${tId}&department_id=${deptId}`
    )
    setLogs(data)
  }, [])

  const load = useCallback(async () => {
    if (!selectedDepartment) return
    setLoading(true)
    try {
      const terms = await api.get<any[]>('/settings/academic-terms')
      const activeTerm = terms.find((t) => t.is_current) || terms[0]
      if (!activeTerm) {
        showToast('error', 'No academic term', ['No active/current academic term is configured.'])
        setState(null)
        return
      }
      setTermId(activeTerm.id)
      setTermLabel(activeTerm.name || activeTerm.code || 'Current Term')

      const [approvalState, logRows] = await Promise.all([
        api.get<ApprovalState>(
          `/timetable/approvals?term_id=${activeTerm.id}&department_id=${selectedDepartment.id}`
        ),
        api.get<LogRow[]>(
          `/timetable/logs?term_id=${activeTerm.id}&department_id=${selectedDepartment.id}`
        ),
      ])
      setState(approvalState)
      setLogs(logRows)
    } catch (err) {
      showToast('error', 'Could not load approval state', clashMessages(err))
      setState(null)
    } finally {
      setLoading(false)
    }
  }, [selectedDepartment])

  useEffect(() => {
    load()
  }, [load])

  const runAction = async (label: string, fn: () => Promise<unknown>, successMsg: string) => {
    if (!selectedDepartment || !termId) return
    setBusy(label)
    try {
      await fn()
      setCommentText('')
      showToast('success', successMsg, [])
      await load()
    } catch (err) {
      showToast('error', 'Action failed', clashMessages(err))
    } finally {
      setBusy(null)
    }
  }

  const handleSubmit = () =>
    runAction(
      'submit',
      () =>
        api.post('/timetable/approvals/submit', {
          term_id: termId,
          department_id: selectedDepartment!.id,
        }),
      'Submitted for approval.'
    )

  const handleReject = () =>
    runAction(
      'reject',
      () =>
        api.post('/timetable/approvals/action', {
          term_id: termId,
          department_id: selectedDepartment!.id,
          status: 'rejected',
          comments: commentText || 'Rejected',
        }),
      'Timetable rejected.'
    )

  const handlePublish = () =>
    runAction(
      'publish',
      () =>
        api.post('/timetable/approvals/action', {
          term_id: termId,
          department_id: selectedDepartment!.id,
          status: 'published',
          comments: commentText || 'Approved for publication',
        }),
      'Timetable published.'
    )

  const status: BackendStatus = state?.status ?? 'draft'
  const canSubmit = status === 'draft' || status === 'rejected'
  const canReject = status === 'pending_approval' && (isGlobalUser || userRole === 'hod')
  const canPublish =
    status !== 'published' && (isGlobalUser || userRole === 'college_tt_coordinator')

  const statusBadge = () => {
    switch (status) {
      case 'published':
        return <Badge variant="success" dot>Live &amp; Published to Students</Badge>
      case 'pending_approval':
        return <Badge variant="warning" dot>Awaiting College Coordinator</Badge>
      case 'rejected':
        return <Badge variant="danger" dot>Rejected — Needs Revision</Badge>
      default:
        return <Badge variant="secondary">Draft Preparation</Badge>
    }
  }

  const stepClass = (active: boolean, done: boolean) =>
    active
      ? 'bg-tint border-brand-600 text-brand-700 shadow-lg shadow-charcoal/10'
      : done
      ? 'bg-white border-success/40 text-success-700'
      : 'bg-white border-line text-muted'

  const done1 = (state?.slot_count ?? 0) > 0
  const done2 = status === 'pending_approval' || status === 'published'
  const done3 = status === 'published'
  const done4 = status === 'published'

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Department Timetable Approval &amp; Publishing
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Department:{' '}
              <span className="text-brand-700 font-semibold">
                {selectedDepartment ? selectedDepartment.name : 'Not selected'}
              </span>
              {termLabel ? ` • ${termLabel}` : ''} •{' '}
              <span className="font-mono">{state?.slot_count ?? 0} slots</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand hover:bg-line border border-line text-muted text-xs font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {statusBadge()}
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-start gap-2 ${
            toast.type === 'error'
              ? 'bg-danger-50 border-danger/40 text-danger-700'
              : 'bg-success-50 border-success/40 text-success-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-danger-700 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-success-700 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-semibold">{toast.title}</div>
            {toast.messages.length > 0 && (
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {toast.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Lifecycle stepper */}
      <div className="rounded-2xl bg-white border border-line p-6 shadow-xl">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
          Timetable Lifecycle Progression
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border text-left space-y-1 ${stepClass(false, done1)}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              {done1 ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              1. Timetable Prepared
            </div>
            <div className="text-charcoal font-semibold text-sm">{done1 ? 'Slots generated' : 'Empty'}</div>
            <p className="text-[11px] text-muted">{state?.slot_count ?? 0} slots in this term</p>
          </div>

          <div className={`p-4 rounded-xl border text-left space-y-1 ${stepClass(status === 'draft' || status === 'rejected', done2)}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              {done2 ? <CheckCircle2 className="w-4 h-4 text-success-700" /> : <Send className="w-4 h-4" />}
              2. Submitted for Approval
            </div>
            <div className="text-charcoal font-semibold text-sm">Department Signoff</div>
            <p className="text-[11px] text-muted">Submit to central cell</p>
          </div>

          <div className={`p-4 rounded-xl border text-left space-y-1 ${stepClass(status === 'pending_approval', done3)}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              {done3 ? <CheckCircle2 className="w-4 h-4 text-success-700" /> : <ShieldCheck className="w-4 h-4" />}
              3. College Signoff
            </div>
            <div className="text-charcoal font-semibold text-sm">College Coordinator</div>
            <p className="text-[11px] text-muted">Institutional clash check</p>
          </div>

          <div className={`p-4 rounded-xl border text-left space-y-1 ${stepClass(false, done4)}`}>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              {done4 ? <CheckCircle2 className="w-4 h-4 text-success-700" /> : <Clock className="w-4 h-4" />}
              4. Live Publication
            </div>
            <div className="text-charcoal font-semibold text-sm">Public Schedules</div>
            <p className="text-[11px] text-muted">Visible to faculty &amp; students</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl bg-white border border-line p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-base font-bold text-charcoal tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-700" />
              Workflow Action Panel
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Authorize the schedule to progress to the next administrative tier.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-muted">
            Current: <span className="text-brand-700">{status.toUpperCase()}</span>
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Reviewer Remarks / Approval Endorsement
          </label>
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add comments regarding workload balance, room allocations, or rejection reasons..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={busy !== null || (state?.slot_count ?? 0) === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-semibold text-xs shadow-lg shadow-charcoal/15 transition-all disabled:opacity-50"
            >
              {busy === 'submit' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit for Approval
            </button>
          )}

          {canReject && (
            <button
              onClick={handleReject}
              disabled={busy !== null}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-danger hover:bg-danger-600 text-white font-semibold text-xs shadow-lg shadow-charcoal/15 transition-all disabled:opacity-50"
            >
              {busy === 'reject' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject
            </button>
          )}

          {canPublish && (
            <button
              onClick={handlePublish}
              disabled={busy !== null || (state?.slot_count ?? 0) === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-success hover:bg-success-600 text-white font-semibold text-xs shadow-lg shadow-charcoal/15 transition-all disabled:opacity-50"
            >
              {busy === 'publish' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve &amp; Publish Live Timetable
            </button>
          )}

          {status === 'published' && (
            <div className="flex items-center gap-2 text-success-700 text-xs font-semibold px-4 py-2 rounded-xl bg-success-50 border border-success/30">
              <CheckCircle2 className="w-4 h-4" />
              Timetable is Officially Published &amp; Locked
            </div>
          )}

          {status === 'pending_approval' && !canPublish && !canReject && (
            <div className="text-xs text-muted px-4 py-2 rounded-xl bg-white border border-line">
              Awaiting the College TT Coordinator to publish.
            </div>
          )}
        </div>
      </div>

      {/* Audit log */}
      <div className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden">
        <div className="p-5 border-b border-line bg-sand flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-700" />
            <h2 className="text-base font-bold text-charcoal tracking-tight">
              Audit Trail &amp; Edit History Log
            </h2>
          </div>
          <span className="text-xs text-muted font-mono">{logs.length} logged events</span>
        </div>

        <div className="divide-y divide-line/60">
          {logs.length === 0 && (
            <div className="p-6 text-xs text-muted text-center">
              No edit or approval activity recorded for this term yet.
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="p-4 sm:p-5 hover:bg-sand/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant={ACTION_VARIANT[log.action] ?? 'default'}>
                    {log.action.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-semibold text-charcoal">
                    {log.users?.full_name || 'System'}
                  </span>
                </div>
                <span className="text-[11px] text-muted font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted pl-1">{log.reason || 'No reason provided.'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
