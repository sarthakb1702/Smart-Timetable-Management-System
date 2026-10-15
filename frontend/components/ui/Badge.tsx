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
  default: 'bg-sand text-charcoal/80 border-line',
  primary: 'bg-tint text-brand-700 border-brand/25',
  secondary: 'bg-white text-muted border-line',
  success: 'bg-success-50 text-success-700 border-success/25',
  warning: 'bg-warning-50 text-warning-700 border-warning/25',
  danger: 'bg-danger-50 text-danger-700 border-danger/25',
  info: 'bg-line/70 text-charcoal border-charcoal/20',
  purple: 'bg-sand text-charcoal border-charcoal/20',
  amber: 'bg-warning-50 text-warning-700 border-warning/25',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-muted',
  primary: 'bg-brand',
  secondary: 'bg-muted',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-charcoal',
  purple: 'bg-charcoal',
  amber: 'bg-warning',
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
