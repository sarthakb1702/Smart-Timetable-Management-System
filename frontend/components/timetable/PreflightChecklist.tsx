'use client'

import React from 'react'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Users,
  BookOpen,
  Clock,
  Layers,
} from 'lucide-react'

export interface PreflightCheckItem {
  id: string
  title: string
  description: string
  status: 'passed' | 'warning' | 'error'
  icon: React.ElementType
  count?: number
  actionLabel?: string
  actionHref?: string
}

interface PreflightChecklistProps {
  items: PreflightCheckItem[]
  onGenerate: () => void
  isGenerating?: boolean
}

export function PreflightChecklist({
  items,
  onGenerate,
  isGenerating = false,
}: PreflightChecklistProps) {
  const errorCount = items.filter((i) => i.status === 'error').length
  const warningCount = items.filter((i) => i.status === 'warning').length
  const passedCount = items.filter((i) => i.status === 'passed').length
  const totalCount = items.length

  const readinessScore = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0
  const canGenerate = errorCount === 0 && !isGenerating

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-6">
      {/* Header & Readiness Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Pre-Generation Preflight Checklist
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Validating departmental resources and constraints before triggering Google OR-Tools CP-SAT scheduler.
          </p>
        </div>

        {/* Readiness Meter */}
        <div className="flex items-center gap-4 bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-700/60">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-medium">Readiness Score</div>
            <div className="text-lg font-extrabold text-white font-mono">{readinessScore}%</div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-slate-700 relative flex items-center justify-center">
            <div
              className={`text-xs font-bold ${
                readinessScore === 100 ? 'text-emerald-400' : readinessScore >= 70 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {passedCount}/{totalCount}
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {items.map((item) => {
          const Icon = item.icon
          let statusBadge = (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              <CheckCircle className="w-3.5 h-3.5" /> Ready
            </span>
          )

          if (item.status === 'warning') {
            statusBadge = (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5" /> Warning
              </span>
            )
          } else if (item.status === 'error') {
            statusBadge = (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded-md">
                <XCircle className="w-3.5 h-3.5" /> Missing
              </span>
            )
          }

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.status === 'error'
                  ? 'bg-rose-950/10 border-rose-500/30'
                  : item.status === 'warning'
                  ? 'bg-amber-950/10 border-amber-500/30'
                  : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      item.status === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : item.status === 'warning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div>{statusBadge}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400">
          {errorCount > 0 ? (
            <span className="text-rose-400 font-medium">
              Please resolve {errorCount} critical configuration requirement(s) before generating.
            </span>
          ) : warningCount > 0 ? (
            <span className="text-amber-400 font-medium">
              Ready to generate with {warningCount} optional advisory notice(s).
            </span>
          ) : (
            <span className="text-emerald-400 font-medium">
              All 8 constraint rules and resources are verified and ready.
            </span>
          )}
        </div>

        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-all shadow-lg ${
            canGenerate
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.02] cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
          id="trigger-solver-btn"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Solving Constraints...' : 'Generate Timetable (OR-Tools)'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
