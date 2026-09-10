import React from 'react'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'amber'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-800 text-slate-300 border-slate-700',
  primary: 'bg-indigo-950/70 text-indigo-300 border-indigo-500/30',
  secondary: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
  success: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-950/70 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-950/70 text-rose-300 border-rose-500/30',
  info: 'bg-sky-950/70 text-sky-300 border-sky-500/30',
  purple: 'bg-purple-950/70 text-purple-300 border-purple-500/30',
  amber: 'bg-amber-950/70 text-amber-300 border-amber-500/30',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  primary: 'bg-indigo-400',
  secondary: 'bg-slate-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-sky-400',
  purple: 'bg-purple-400',
  amber: 'bg-amber-400',
}

export function Badge({
  children,
  variant = 'default',
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  )
}
