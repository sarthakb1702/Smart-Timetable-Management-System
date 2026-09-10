'use client'

import React, { useState } from 'react'
import {
  CheckSquare,
  ShieldCheck,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Eye,
  ArrowRight,
  Layers,
  Building,
  Calendar,
  MessageSquare,
} from 'lucide-react'
import { useDepartment } from '../../../../context/DepartmentContext'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'

type ApprovalStage = 'draft' | 'hod_review' | 'coordinator_approval' | 'published'

interface AuditLogEntry {
  id: string
  action: string
  user_name: string
  timestamp: string
  notes: string
  status_badge: any
}

const SAMPLE_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    action: 'CP-SAT AI Generation Executed',
    user_name: 'Prof. Sneha Kulkarni (Dept Coordinator)',
    timestamp: 'Today at 10:30 AM',
    notes: 'Generated 42 theory slots and 12 lab sessions with 0 hard constraint violations.',
    status_badge: 'primary',
  },
  {
    id: 'log-2',
    action: 'Manual Slot Adjustments (Drag & Drop)',
    user_name: 'Prof. Sneha Kulkarni (Dept Coordinator)',
    timestamp: 'Today at 11:45 AM',
    notes: 'Moved CS502 Operating Systems from Wed 14:00 to Mon 09:00 after live clash verification.',
    status_badge: 'info',
  },
  {
    id: 'log-3',
    action: 'Internal Department Verification',
    user_name: 'Dr. Ramesh Deshmukh (HOD)',
    timestamp: 'Today at 02:15 PM',
    notes: 'Verified faculty teaching workload distribution and lab batch allocations.',
    status_badge: 'amber',
  },
]

export default function DeptApprovePage() {
  const { selectedDepartment } = useDepartment()
  const [stage, setStage] = useState<ApprovalStage>('hod_review')
  const [commentText, setCommentText] = useState('')
  const [logs, setLogs] = useState<AuditLogEntry[]>(SAMPLE_AUDIT_LOGS)
  const [toast, setToast] = useState<string | null>(null)

  const handleAdvanceWorkflow = (newStage: ApprovalStage, actionTitle: string) => {
    setStage(newStage)
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      action: actionTitle,
      user_name: 'Dr. Ramesh Deshmukh (HOD)',
      timestamp: 'Just now',
      notes: commentText || 'Workflow transition approved with zero constraint objections.',
      status_badge: newStage === 'published' ? 'success' : 'primary',
    }
    setLogs([newLog, ...logs])
    setCommentText('')
    setToast(`Timetable successfully transitioned to: ${newStage.toUpperCase().replace('_', ' ')}`)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Department Timetable Approval & Publishing
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

        <div className="flex items-center gap-2">
          {stage === 'published' ? (
            <Badge variant="success" dot>
              Live & Published to Students
            </Badge>
          ) : stage === 'coordinator_approval' ? (
            <Badge variant="warning" dot>
              Awaiting Central College Coordinator
            </Badge>
          ) : stage === 'hod_review' ? (
            <Badge variant="amber" dot>
              HOD Internal Review
            </Badge>
          ) : (
            <Badge variant="secondary">
              Draft Preparation
            </Badge>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Workflow Stepper Bar */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Timetable Lifecycle Progression
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-emerald-500/40 text-left space-y-1 relative">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" /> 1. AI Generation
            </div>
            <div className="text-white font-semibold text-sm">Solved by CP-SAT</div>
            <p className="text-[11px] text-slate-400">All hard constraints satisfied</p>
          </div>

          {/* Step 2 */}
          <div
            className={`p-4 rounded-xl border text-left space-y-1 relative transition-colors ${
              stage === 'hod_review'
                ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/60 border-emerald-500/40 text-emerald-400'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              {stage === 'draft' ? (
                <Clock className="w-4 h-4 text-slate-400" />
              ) : stage === 'hod_review' ? (
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              2. HOD Verification
            </div>
            <div className="text-white font-semibold text-sm">Department Signoff</div>
            <p className="text-[11px] text-slate-400">Curriculum & faculty audit</p>
          </div>

          {/* Step 3 */}
          <div
            className={`p-4 rounded-xl border text-left space-y-1 relative transition-colors ${
              stage === 'coordinator_approval'
                ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-500/10'
                : stage === 'published'
                ? 'bg-slate-800/60 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800/20 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              {stage === 'published' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              3. College Signoff
            </div>
            <div className="text-white font-semibold text-sm">College Coordinator</div>
            <p className="text-[11px] text-slate-400">Institutional clash check</p>
          </div>

          {/* Step 4 */}
          <div
            className={`p-4 rounded-xl border text-left space-y-1 relative transition-colors ${
              stage === 'published'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-800/20 border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              {stage === 'published' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              4. Live Publication
            </div>
            <div className="text-white font-semibold text-sm">Public Schedules</div>
            <p className="text-[11px] text-slate-400">Visible to faculty & students</p>
          </div>
        </div>
      </div>

      {/* Action Decision Control Box */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Workflow Action Panel
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Authorize the schedule to progress to the next administrative tier.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            Current Stage: <span className="text-indigo-300">{stage.toUpperCase()}</span>
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Reviewer Remarks / Approval Endorsement
          </label>
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add comments regarding workload balance, room allocations, or special notes..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {stage === 'hod_review' && (
            <button
              onClick={() =>
                handleAdvanceWorkflow(
                  'coordinator_approval',
                  'HOD Endorsement & Submission to Central Cell'
                )
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Send className="w-4 h-4" />
              Endorse & Submit to College TT Coordinator
            </button>
          )}

          {stage === 'coordinator_approval' && (
            <button
              onClick={() =>
                handleAdvanceWorkflow(
                  'published',
                  'Institutional Approval & Public Release'
                )
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve & Publish Live Timetable
            </button>
          )}

          {stage === 'published' && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              Timetable is Officially Published & Locked
            </div>
          )}
        </div>
      </div>

      {/* Audit Log / History */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Audit Trail & Edit History Log
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {logs.length} logged events
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {logs.map((log) => (
            <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-800/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant={log.status_badge}>{log.action}</Badge>
                  <span className="text-xs font-semibold text-white">{log.user_name}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">{log.timestamp}</span>
              </div>
              <p className="text-xs text-slate-300 pl-1">{log.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
