import React from 'react'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  trend?: {
    value: string
    isPositive: boolean
  }
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-brand-700',
  trend,
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-line p-5 transition-colors duration-200 hover:border-brand/40">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </span>
        <div className="w-10 h-10 rounded-xl bg-sand border border-line flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-charcoal tabular-nums">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              trend.isPositive
                ? 'bg-success-50 text-success-700 border-success/25'
                : 'bg-danger-50 text-danger-700 border-danger/25'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-muted leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
