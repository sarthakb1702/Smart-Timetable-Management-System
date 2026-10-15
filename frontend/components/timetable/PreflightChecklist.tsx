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
    <div className="rounded-2xl bg-white border border-line p-6 shadow-xl space-y-6">
      {/* Header & Readiness Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-700" />
            <h2 className="text-lg font-bold text-charcoal tracking-tight">
              Pre-Generation Preflight Checklist
            </h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Validating departmental resources and constraints before triggering Google OR-Tools CP-SAT scheduler.
          </p>
        </div>

        {/* Readiness Meter */}
        <div className="flex items-center gap-4 bg-sand/60 px-4 py-2.5 rounded-xl border border-line/60">
          <div className="text-right">
            <div className="text-[11px] text-muted font-medium">Readiness Score</div>
            <div className="text-lg font-extrabold text-charcoal font-mono">{readinessScore}%</div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-line relative flex items-center justify-center">
            <div
              className={`text-xs font-bold ${
                readinessScore === 100 ? 'text-success-700' : readinessScore >= 70 ? 'text-warning-700' : 'text-danger-700'
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
            <span className="flex items-center gap-1 text-[11px] font-semibold text-success-700 bg-success-50 border border-success/30 px-2 py-0.5 rounded-md">
              <CheckCircle className="w-3.5 h-3.5" /> Ready
            </span>
          )

          if (item.status === 'warning') {
            statusBadge = (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-warning-700 bg-warning-50 border border-warning/30 px-2 py-0.5 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5" /> Warning
              </span>
            )
          } else if (item.status === 'error') {
            statusBadge = (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-danger-700 bg-danger-50 border border-danger/30 px-2 py-0.5 rounded-md">
                <XCircle className="w-3.5 h-3.5" /> Missing
              </span>
            )
          }

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.status === 'error'
                  ? 'bg-danger-50 border-danger/30'
                  : item.status === 'warning'
                  ? 'bg-warning-50 border-warning/30'
                  : 'bg-white border-line hover:border-muted/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      item.status === 'error'
                        ? 'bg-danger-50 text-danger-700'
                        : item.status === 'warning'
                        ? 'bg-warning-50 text-warning-700'
                        : 'bg-tint text-brand-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-charcoal">{item.title}</h4>
                    <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
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
      <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-muted">
          {errorCount > 0 ? (
            <span className="text-danger-700 font-medium">
              Please resolve {errorCount} critical configuration requirement(s) before generating.
            </span>
          ) : warningCount > 0 ? (
            <span className="text-warning-700 font-medium">
              Ready to generate with {warningCount} optional advisory notice(s).
            </span>
          ) : (
            <span className="text-success-700 font-medium">
              All 8 constraint rules and resources are verified and ready.
            </span>
          )}
        </div>

        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-all shadow-lg ${
            canGenerate
              ? 'bg-brand hover:bg-brand-600 text-charcoal shadow-charcoal/15 hover:scale-[1.02] cursor-pointer'
              : 'bg-sand text-muted cursor-not-allowed border border-line/50'
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
