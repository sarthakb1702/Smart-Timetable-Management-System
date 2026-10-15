'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Settings,
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Coffee,
  Sliders,
  Plus,
  Trash2,
  Building2,
  Users,
  Loader2,
  GraduationCap,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'

const DAYS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
]

interface CollegeSettings {
  id: string
  working_days: number[]
  day_start_time: string
  day_end_time: string
  slot_duration_minutes: number
  max_faculty_weekly_hours: number
  updated_at: string
}

interface LunchBreak {
  id: string
  department_id: string | null
  academic_year_id: string | null
  day_of_week: number | null
  start_time: string
  end_time: string
}

interface Department {
  id: string
  name: string
  code: string
  created_at: string
}

interface AcademicYear {
  id: string
  code: string
  name: string
  sequence: number
  created_at?: string
}

interface UserRow {
  id: string
  email: string
  full_name: string
  role: string
  department_id: string | null
  department_name: string | null
  is_active: boolean
}

type Tab = 'general' | 'lunch' | 'departments' | 'years' | 'roles'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'lunch', label: 'Lunch Breaks', icon: Coffee },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'years', label: 'Academic Years (FY/SY/TY/Final)', icon: GraduationCap },
  { id: 'roles', label: 'Role Assignment', icon: Users },
]

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'dept_tt_coordinator', label: 'Dept TT Coordinator' },
  { value: 'hod', label: 'HOD' },
  { value: 'college_tt_coordinator', label: 'College TT Coordinator' },
  { value: 'superadmin', label: 'Superadmin' },
]

const DEPARTMENT_SCOPED_ROLES = [
  'dept_tt_coordinator',
  'hod',
  'faculty',
  'student',
]

function trimTime(value: string): string {
  return value?.slice(0, 5) ?? '00:00'
}

export default function CollegeSettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [settings, setSettings] = useState<CollegeSettings | null>(null)
  const [lunchBreaks, setLunchBreaks] = useState<LunchBreak[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [users, setUsers] = useState<UserRow[]>([])

  const flash = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    if (kind === 'success') setSuccess(message)
    else setError(message)
    window.setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 4000)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [s, l, d, u, y] = await Promise.all([
        api.get<CollegeSettings>('/settings/college'),
        api.get<LunchBreak[]>('/settings/lunch-breaks'),
        api.get<Department[]>('/settings/departments'),
        api.get<UserRow[]>('/settings/users'),
        api.get<AcademicYear[]>('/settings/academic-years'),
      ])
      setSettings({
        ...s,
        working_days: s.working_days ?? [],
        day_start_time: trimTime(s.day_start_time),
        day_end_time: trimTime(s.day_end_time),
      })
      setLunchBreaks(
        l.map((lb) => ({
          ...lb,
          start_time: trimTime(lb.start_time),
          end_time: trimTime(lb.end_time),
        }))
      )
      setDepartments(d)
      setUsers(u)
      setAcademicYears(y || [])
    } catch (err) {
      flash(
        err instanceof ApiError ? err.message : 'Failed to load settings',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }, [flash])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const slotCount = useMemo(() => {
    if (!settings) return 0
    const [sh, sm] = settings.day_start_time.split(':').map(Number)
    const [eh, em] = settings.day_end_time.split(':').map(Number)
    const dayMinutes = eh * 60 + em - (sh * 60 + sm)
    if (dayMinutes <= 0 || !settings.slot_duration_minutes) return 0
    return Math.floor(dayMinutes / settings.slot_duration_minutes)
  }, [settings])

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    try {
      const updated = await api.put<CollegeSettings>('/settings/college', {
        working_days: settings.working_days,
        day_start_time: `${settings.day_start_time}:00`,
        day_end_time: `${settings.day_end_time}:00`,
        slot_duration_minutes: Number(settings.slot_duration_minutes),
        max_faculty_weekly_hours: Number(settings.max_faculty_weekly_hours),
      })
      setSettings({ ...updated, day_start_time: trimTime(updated.day_start_time), day_end_time: trimTime(updated.day_end_time) })
      flash('College settings saved')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Save failed', 'error')
    }
  }

  function toggleDay(dayId: number) {
    setSettings((prev) => {
      if (!prev) return prev
      const exists = prev.working_days.includes(dayId)
      if (exists) {
        if (prev.working_days.length === 1) return prev
        return { ...prev, working_days: prev.working_days.filter((d) => d !== dayId) }
      }
      return { ...prev, working_days: [...prev.working_days, dayId].sort((a, b) => a - b) }
    })
  }

  async function addLunchBreak() {
    try {
      const created = await api.post<LunchBreak>('/settings/lunch-breaks', {
        start_time: '12:00:00',
        end_time: '13:00:00',
      })
      setLunchBreaks((prev) => [...prev, { ...created, start_time: trimTime(created.start_time), end_time: trimTime(created.end_time) }])
      flash('Lunch break added')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Failed to add lunch break', 'error')
    }
  }

  async function updateLunchBreak(id: string, patch: { start_time?: string; end_time?: string }) {
    const payload: Record<string, string> = {}
    if (patch.start_time) payload.start_time = `${patch.start_time}:00`
    if (patch.end_time) payload.end_time = `${patch.end_time}:00`
    try {
      const updated = await api.put<LunchBreak>(`/settings/lunch-breaks/${id}`, payload)
      setLunchBreaks((prev) =>
        prev.map((lb) =>
          lb.id === id
            ? { ...lb, start_time: trimTime(updated.start_time), end_time: trimTime(updated.end_time) }
            : lb
        )
      )
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Failed to update lunch break', 'error')
    }
  }

  async function removeLunchBreak(id: string) {
    try {
      await api.delete(`/settings/lunch-breaks/${id}`)
      setLunchBreaks((prev) => prev.filter((lb) => lb.id !== id))
      flash('Lunch break removed')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Failed to remove lunch break', 'error')
    }
  }

  async function addDepartment(name: string, code: string) {
    try {
      const created = await api.post<Department>('/settings/departments', { name, code })
      setDepartments((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      flash(`Department "${created.name}" created`)
      return true
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Failed to create department', 'error')
      return false
    }
  }

  async function removeDepartment(id: string) {
    try {
      await api.delete(`/settings/departments/${id}`)
      setDepartments((prev) => prev.filter((d) => d.id !== id))
      setUsers((prev) =>
        prev.map((u) => (u.department_id === id ? { ...u, department_id: null, department_name: null } : u))
      )
      flash('Department deleted')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Failed to delete department', 'error')
    }
  }

  async function addAcademicYear(code: string, name: string, sequence: number) {
    try {
      const created = await api.post<AcademicYear>('/settings/academic-years', {
        code,
        name,
        sequence,
      })
      setAcademicYears((prev) => [...prev, created].sort((a, b) => a.sequence - b.sequence))
      flash(`Academic Year "${created.name}" created`)
      return true
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Failed to create academic year', 'error')
      return false
    }
  }

  async function removeAcademicYear(id: string) {
    if (!confirm('Are you sure you want to delete this academic year? Divisions and courses linked to it may be affected.')) return
    try {
      await api.delete(`/settings/academic-years/${id}`)
      setAcademicYears((prev) => prev.filter((y) => y.id !== id))
      flash('Academic year deleted')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Failed to delete academic year', 'error')
    }
  }

  async function updateUserRole(userId: string, patch: { role?: string; department_id?: string | null; is_active?: boolean }) {
    try {
      await api.put(`/settings/users/${userId}/role`, patch)
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...patch } : u))
      )
      flash('Role updated')
    } catch (err) {
      flash(err instanceof ApiError ? err.message : 'Failed to update role', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading college settings…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              College Settings
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Global timetable constraints, breaks, departments and role assignment.
            </p>
          </div>
        </div>
        <Badge variant="primary" dot>
          Superadmin Only
        </Badge>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-success-50 border-success/40 text-success-700">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-success-700" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-danger-50 border-danger/40 text-danger-700">
          <AlertCircle className="w-5 h-5 shrink-0 text-danger-700" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Stats */}
      {settings && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Working Days"
            value={`${settings.working_days.length} / 7`}
            subtitle={settings.working_days.map((d) => DAYS[d - 1]?.label).join(' ')}
            icon={Calendar}
            iconColor="text-brand-700"
          />
          <StatCard
            title="Daily Window"
            value={`${settings.day_start_time} – ${settings.day_end_time}`}
            subtitle={`${slotCount} slots @ ${settings.slot_duration_minutes}m`}
            icon={Clock}
            iconColor="text-charcoal"
          />
          <StatCard
            title="Lunch Breaks"
            value={String(lunchBreaks.length)}
            subtitle="Protected windows"
            icon={Coffee}
            iconColor="text-warning-700"
          />
          <StatCard
            title="Departments"
            value={String(departments.length)}
            subtitle={`${users.length} linked accounts`}
            icon={Building2}
            iconColor="text-charcoal"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-line">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors -mb-px ${
              tab === id
                ? 'border-brand-600 text-charcoal bg-white'
                : 'border-transparent text-muted hover:text-charcoal'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && settings && (
        <form onSubmit={saveSettings} className="rounded-2xl bg-white border border-line p-6 shadow-xl space-y-6">
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Working Days
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DAYS.map((day) => {
                const active = settings.working_days.includes(day.id)
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-brand border-brand-600 text-charcoal'
                        : 'bg-white border-line text-muted hover:text-charcoal'
                    }`}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-4 border-t border-line">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Day Start
              </label>
              <input
                type="time"
                required
                value={settings.day_start_time}
                onChange={(e) => setSettings({ ...settings, day_start_time: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Day End
              </label>
              <input
                type="time"
                required
                value={settings.day_end_time}
                onChange={(e) => setSettings({ ...settings, day_end_time: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Slot Duration
              </label>
              <select
                value={settings.slot_duration_minutes}
                onChange={(e) => setSettings({ ...settings, slot_duration_minutes: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option value={45}>45 minutes</option>
                <option value={50}>50 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Max Faculty Hrs / Week
              </label>
              <input
                type="number"
                min={10}
                max={40}
                required
                value={settings.max_faculty_weekly_hours}
                onChange={(e) => setSettings({ ...settings, max_faculty_weekly_hours: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-semibold text-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </form>
      )}

      {/* Lunch Breaks */}
      {tab === 'lunch' && (
        <div className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-line">
            <div>
              <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
                <Coffee className="w-5 h-5 text-warning-700" />
                Lunch Breaks
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Hard constraint — the solver never places a session overlapping these windows.
              </p>
            </div>
            <button
              onClick={addLunchBreak}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-charcoal text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Break
            </button>
          </div>

          {lunchBreaks.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">
              No lunch breaks configured. Add at least one to protect a break window.
            </p>
          ) : (
            <div className="divide-y divide-line/60">
              {lunchBreaks.map((lb) => (
                <div key={lb.id} className="flex flex-wrap items-center gap-4 p-4">
                  <Badge variant="secondary">
                    {lb.day_of_week ? DAYS[lb.day_of_week - 1]?.label : 'All days'}
                  </Badge>
                  <Badge variant="secondary">
                    {lb.department_id
                      ? departments.find((d) => d.id === lb.department_id)?.code ?? 'Dept'
                      : 'College-wide'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={lb.start_time}
                      onChange={(e) => setLunchBreaks((p) => p.map((x) => (x.id === lb.id ? { ...x, start_time: e.target.value } : x)))}
                      onBlur={(e) => updateLunchBreak(lb.id, { start_time: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                    <span className="text-muted text-xs">to</span>
                    <input
                      type="time"
                      value={lb.end_time}
                      onChange={(e) => setLunchBreaks((p) => p.map((x) => (x.id === lb.id ? { ...x, end_time: e.target.value } : x)))}
                      onBlur={(e) => updateLunchBreak(lb.id, { end_time: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
                    />
                  </div>
                  <button
                    onClick={() => removeLunchBreak(lb.id)}
                    className="ml-auto p-2 rounded-lg text-muted hover:text-danger-700 hover:bg-danger-50"
                    title="Remove lunch break"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Departments */}
      {tab === 'departments' && <DepartmentsPanel departments={departments} onAdd={addDepartment} onDelete={removeDepartment} />}

      {/* Academic Years */}
      {tab === 'years' && (
        <AcademicYearsPanel
          academicYears={academicYears}
          onAdd={addAcademicYear}
          onDelete={removeAcademicYear}
        />
      )}

      {/* Role Assignment */}
      {tab === 'roles' && (
        <RoleAssignmentPanel users={users} departments={departments} onUpdate={updateUserRole} />
      )}
    </div>
  )
}

function DepartmentsPanel({
  departments,
  onAdd,
  onDelete,
}: {
  departments: Department[]
  onAdd: (name: string, code: string) => Promise<boolean>
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !code.trim()) return
    setSaving(true)
    const ok = await onAdd(name.trim(), code.trim().toUpperCase())
    setSaving(false)
    if (ok) {
      setName('')
      setCode('')
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden">
      <div className="p-5 border-b border-line">
        <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-700" />
          Departments
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Departments own rooms, courses, faculty, divisions and their own timetable.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-5 border-b border-line bg-sand">
        <div className="flex-1 min-w-[220px] space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Department Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Electronics & Communication"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>
        <div className="w-32 space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Code
          </label>
          <input
            type="text"
            required
            maxLength={20}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ECE"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal text-xs font-semibold disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {saving ? 'Adding…' : 'Add'}
        </button>
      </form>

      {departments.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted">No departments yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-sand text-[11px] uppercase tracking-wider text-muted border-b border-line">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {departments.map((d) => (
              <tr key={d.id} className="hover:bg-sand/30">
                <td className="px-5 py-3.5 text-charcoal font-medium">{d.name}</td>
                <td className="px-5 py-3.5">
                  <span className="px-2 py-0.5 rounded bg-sand border border-line text-muted text-[11px] font-mono">
                    {d.code}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => onDelete(d.id)}
                    className="p-2 rounded-lg text-muted hover:text-danger-700 hover:bg-danger-50"
                    title="Delete department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function RoleAssignmentPanel({
  users,
  departments,
  onUpdate,
}: {
  users: UserRow[]
  departments: Department[]
  onUpdate: (userId: string, patch: { role?: string; department_id?: string | null; is_active?: boolean }) => void
}) {
  const collegeCoordinator = users.find((u) => u.role === 'college_tt_coordinator')

  return (
    <div className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden">
      <div className="p-5 border-b border-line">
        <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-700" />
          Role Assignment
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Department-scoped roles lock to one department. College-wide roles have no department.
        </p>
      </div>

      <div className="p-4 border-b border-line bg-sand">
        <div className="flex items-center gap-2 text-xs">
          <Shield className="w-4 h-4 text-warning-700 shrink-0" />
          <span className="text-muted">College TT Coordinator (only one allowed):</span>
          <span className="font-semibold text-charcoal">
            {collegeCoordinator ? collegeCoordinator.email : 'Not assigned'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand text-[11px] uppercase tracking-wider text-muted border-b border-line">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Department</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {users.map((u) => {
              const needsDepartment = DEPARTMENT_SCOPED_ROLES.includes(u.role)
              return (
                <tr key={u.id} className="hover:bg-sand/30">
                  <td className="px-5 py-3.5">
                    <div className="text-charcoal font-medium">{u.full_name}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => onUpdate(u.id, { role: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-white border border-line text-charcoal text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    {needsDepartment ? (
                      <select
                        value={u.department_id ?? ''}
                        onChange={(e) => onUpdate(u.id, { department_id: e.target.value || null })}
                        className="px-3 py-2 rounded-lg bg-white border border-line text-charcoal text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
                      >
                        <option value="">Select…</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted">College-wide</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AcademicYearsPanel({
  academicYears,
  onAdd,
  onDelete,
}: {
  academicYears: AcademicYear[]
  onAdd: (code: string, name: string, sequence: number) => Promise<boolean>
  onDelete: (id: string) => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [sequence, setSequence] = useState<number>(academicYears.length + 1)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !name.trim()) return
    setSaving(true)
    const ok = await onAdd(code.trim().toUpperCase(), name.trim(), Number(sequence))
    setSaving(false)
    if (ok) {
      setCode('')
      setName('')
      setSequence(academicYears.length + 2)
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-line shadow-xl overflow-hidden">
      <div className="p-5 border-b border-line">
        <h2 className="text-base font-semibold text-charcoal flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-brand-700" />
          Academic Years &amp; Student Cohorts
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Manage student cohorts (First Year, Second Year, Third Year, Final Year). Divisions, courses, and central MDM slots link directly to these years.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-5 border-b border-line bg-sand">
        <div className="w-28 space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Year Code
          </label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. FY"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 uppercase font-mono"
          />
        </div>

        <div className="flex-1 min-w-[220px] space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Display Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. First Year (FY)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <div className="w-24 space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
            Sequence
          </label>
          <input
            type="number"
            min={1}
            required
            value={sequence}
            onChange={(e) => setSequence(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-line text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal text-sm font-semibold shadow-lg shadow-charcoal/15 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Year
        </button>
      </form>

      {academicYears.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted">
          No academic years configured.
        </p>
      ) : (
        <div className="divide-y divide-line/60">
          {academicYears.map((ay) => (
            <div key={ay.id} className="flex items-center justify-between p-4 hover:bg-sand/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-tint border border-brand/30 text-brand-700">
                  {ay.code}
                </span>
                <div>
                  <div className="text-sm font-semibold text-charcoal">{ay.name}</div>
                  <div className="text-xs text-muted">Sequence #{ay.sequence} in degree curriculum pipeline</div>
                </div>
              </div>
              <button
                onClick={() => onDelete(ay.id)}
                className="p-2 rounded-lg text-muted hover:text-danger-700 hover:bg-danger-50 transition-colors"
                title="Delete Academic Year"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}