'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { useDepartment } from '../../../../context/DepartmentContext'
import {
  BarChart3,
  Users,
  Building2,
  BookOpen,
  Clock,
  RefreshCw,
  AlertCircle,
  Layers,
  Calendar,
} from 'lucide-react'
import { StatCard } from '../../../../components/ui/StatCard'

interface TermItem {
  id: string
  name: string
  is_current: boolean
  is_locked: boolean
}

interface DivisionItem {
  id: string
  name: string
  year_level: number
  academic_years?: { name: string }
}

interface RoomItem {
  id: string
  name: string
  room_type?: string
  capacity?: number
}

interface FacultyItem {
  id: string
  full_name?: string
  email?: string
}

interface SlotRow {
  id: string
  division_id: string
  faculty_id?: string | null
  room_id?: string | null
  day_of_week: number
  start_time: string
  end_time: string
  session_type: string
  source_type?: string
  courses?: { code?: string; name?: string }
  rooms?: { name?: string; room_type?: string }
  users?: { full_name?: string }
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WORK_DAYS = 6
const WORK_HOURS_PER_DAY = 8

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em - (sh * 60 + sm)) / 60
  return diff > 0 ? diff : 0
}

export default function ReportsPage() {
  const { selectedDepartment } = useDepartment()

  const [terms, setTerms] = useState<TermItem[]>([])
  const [activeTermId, setActiveTermId] = useState<string>('')
  const [divisions, setDivisions] = useState<DivisionItem[]>([])
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [faculty, setFaculty] = useState<FacultyItem[]>([])
  const [slots, setSlots] = useState<SlotRow[]>([])

  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDepartment) return
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const [termList, divList, roomList, facList] = await Promise.all([
          api.get<TermItem[]>(`/settings/academic-terms?department_id=${selectedDepartment.id}`),
          api.get<DivisionItem[]>(`/divisions?department_id=${selectedDepartment.id}`),
          api.get<RoomItem[]>(`/rooms?department_id=${selectedDepartment.id}`),
          api.get<FacultyItem[]>(`/settings/users?role=faculty&department_id=${selectedDepartment.id}`),
        ])
        if (cancelled) return

        const safeTerms = termList || []
        setTerms(safeTerms)
        setDivisions(divList || [])
        setRooms(roomList || [])
        setFaculty(facList || [])

        const currentTerm = safeTerms.find((t) => t.is_current) || safeTerms[0]
        const termId = currentTerm ? currentTerm.id : ''
        setActiveTermId(termId)

        if (termId) {
          const slotData = await api.get<SlotRow[]>(
            `/timetable?term_id=${termId}&department_id=${selectedDepartment.id}`
          )
          if (!cancelled) setSlots(slotData || [])
        } else {
          setSlots([])
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load department analytics. Please try again.'
          )
          setSlots([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [selectedDepartment])

  const fetchSlots = async (termId: string) => {
    if (!selectedDepartment || !termId) return
    setRefreshing(true)
    setError(null)
    try {
      const slotData = await api.get<SlotRow[]>(
        `/timetable?term_id=${termId}&department_id=${selectedDepartment.id}`
      )
      setSlots(slotData || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load timetable slots for this term.'
      )
      setSlots([])
    } finally {
      setRefreshing(false)
    }
  }

  const handleTermChange = (termId: string) => {
    setActiveTermId(termId)
    fetchSlots(termId)
  }

  const analytics = useMemo(() => {
    const facultyName = new Map<string, string>()
    faculty.forEach((f) => facultyName.set(f.id, f.full_name || f.email || 'Faculty'))
    slots.forEach((s) => {
      if (s.faculty_id && s.users?.full_name) facultyName.set(s.faculty_id, s.users.full_name)
    })

    const roomName = new Map<string, string>()
    rooms.forEach((r) => roomName.set(r.id, r.name))
    slots.forEach((s) => {
      if (s.room_id && s.rooms?.name) roomName.set(s.room_id, s.rooms.name)
    })

    // ── Clash detection (faculty / room overlaps on the same day) ──────────
    const clashingSlots = new Set<string>()
    const byDay = new Map<number, SlotRow[]>()
    slots.forEach((s) => {
      if (!byDay.has(s.day_of_week)) byDay.set(s.day_of_week, [])
      byDay.get(s.day_of_week)!.push(s)
    })
    byDay.forEach((daySlots) => {
      for (let i = 0; i < daySlots.length; i++) {
        for (let j = i + 1; j < daySlots.length; j++) {
          const a = daySlots[i]
          const b = daySlots[j]
          const overlaps = a.start_time < b.end_time && b.start_time < a.end_time
          if (!overlaps) continue
          const facultyClash = !!(a.faculty_id && a.faculty_id === b.faculty_id)
          const roomClash = !!(a.room_id && a.room_id === b.room_id)
          if (facultyClash || roomClash) {
            clashingSlots.add(a.id)
            clashingSlots.add(b.id)
          }
        }
      }
    })

    // ── Faculty workload ───────────────────────────────────────────────────
    const facultyMap = new Map<string, { name: string; sessions: number; hours: number }>()
    faculty.forEach((f) =>
      facultyMap.set(f.id, { name: f.full_name || f.email || 'Faculty', sessions: 0, hours: 0 })
    )
    slots.forEach((s) => {
      if (!s.faculty_id) return
      if (!facultyMap.has(s.faculty_id)) {
        facultyMap.set(s.faculty_id, {
          name: facultyName.get(s.faculty_id) || 'Faculty',
          sessions: 0,
          hours: 0,
        })
      }
      const item = facultyMap.get(s.faculty_id)!
      item.sessions += 1
      item.hours += hoursBetween(s.start_time, s.end_time)
    })
    const facultyWorkload = Array.from(facultyMap.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        sessions: v.sessions,
        hours: Math.round(v.hours * 10) / 10,
      }))
      .sort((a, b) => b.hours - a.hours)

    const activeFaculty = facultyWorkload.filter((f) => f.sessions > 0)
    const avgFacultyLoad = activeFaculty.length
      ? Math.round(
          (activeFaculty.reduce((sum, f) => sum + f.hours, 0) / activeFaculty.length) * 10
        ) / 10
      : 0
    const maxFacultyHours = Math.max(1, ...facultyWorkload.map((f) => f.hours))

    // ── Room utilization ───────────────────────────────────────────────────
    const roomMap = new Map<string, { name: string; sessions: number; hours: number }>()
    rooms.forEach((r) => roomMap.set(r.id, { name: r.name, sessions: 0, hours: 0 }))
    slots.forEach((s) => {
      if (!s.room_id) return
      if (!roomMap.has(s.room_id)) {
        roomMap.set(s.room_id, {
          name: roomName.get(s.room_id) || 'Room',
          sessions: 0,
          hours: 0,
        })
      }
      const item = roomMap.get(s.room_id)!
      item.sessions += 1
      item.hours += hoursBetween(s.start_time, s.end_time)
    })
    const weeklyCapacity = WORK_DAYS * WORK_HOURS_PER_DAY
    const roomUtilization = Array.from(roomMap.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        sessions: v.sessions,
        hours: Math.round(v.hours * 10) / 10,
        percent: Math.min(100, Math.round((v.hours / weeklyCapacity) * 100)),
      }))
      .sort((a, b) => b.percent - a.percent)

    const totalRoomHours = roomUtilization.reduce((sum, r) => sum + r.hours, 0)
    const totalCapacity = roomUtilization.length * weeklyCapacity
    const overallRoomUtilization =
      totalCapacity > 0 ? Math.min(100, Math.round((totalRoomHours / totalCapacity) * 100)) : 0

    // ── Division coverage ──────────────────────────────────────────────────
    const divMap = new Map<
      string,
      { name: string; total: number; theory: number; lab: number; days: Set<number> }
    >()
    divisions.forEach((d) =>
      divMap.set(d.id, { name: d.name, total: 0, theory: 0, lab: 0, days: new Set() })
    )
    slots.forEach((s) => {
      if (!divMap.has(s.division_id)) {
        divMap.set(s.division_id, {
          name: 'Division',
          total: 0,
          theory: 0,
          lab: 0,
          days: new Set(),
        })
      }
      const item = divMap.get(s.division_id)!
      item.total += 1
      if (s.session_type === 'lab') item.lab += 1
      else item.theory += 1
      item.days.add(s.day_of_week)
    })
    const divisionCoverage = Array.from(divMap.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        total: v.total,
        theory: v.theory,
        lab: v.lab,
        days: v.days.size,
      }))
      .sort((a, b) => b.total - a.total)

    // ── Day distribution ───────────────────────────────────────────────────
    const dayCounts = [1, 2, 3, 4, 5, 6].map((d) => slots.filter((s) => s.day_of_week === d).length)
    const maxDayCount = Math.max(1, ...dayCounts)

    return {
      totalSlots: slots.length,
      clashes: clashingSlots.size,
      avgFacultyLoad,
      activeFacultyCount: activeFaculty.length,
      overallRoomUtilization,
      facultyWorkload,
      maxFacultyHours,
      roomUtilization,
      divisionCoverage,
      dayCounts,
      maxDayCount,
      totalFacultyHours:
        Math.round(facultyWorkload.reduce((sum, f) => sum + f.hours, 0) * 10) / 10,
    }
  }, [slots, faculty, rooms, divisions])

  const activeTerm = terms.find((t) => t.id === activeTermId)

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Department Reports &amp; Analytics
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Insights on resource utilization and workload distribution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-sand border border-line rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-brand-700" />
            <span className="text-muted font-medium">Term:</span>
            <select
              value={activeTermId}
              onChange={(e) => handleTermChange(e.target.value)}
              disabled={terms.length === 0}
              className="bg-transparent text-charcoal font-semibold focus:outline-none text-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {terms.length === 0 && <option value="">No terms</option>}
              {terms.map((t) => (
                <option key={t.id} value={t.id} className="bg-white text-charcoal">
                  {t.name} {t.is_current ? '• Current' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchSlots(activeTermId)}
            disabled={refreshing || !activeTermId}
            className="p-2 rounded-xl bg-white border border-line hover:border-muted/60 text-muted hover:text-charcoal transition-colors disabled:opacity-50"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-700' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-danger-50 border border-danger/40 text-danger-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold">Could not load analytics</div>
            <div className="text-xs opacity-90">{error}</div>
          </div>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scheduled Slots"
          value={analytics.totalSlots.toString()}
          subtitle="Across all divisions"
          icon={BookOpen}
          iconColor="text-brand-700"
        />
        <StatCard
          title="Detected Clashes"
          value={analytics.clashes.toString()}
          subtitle={analytics.clashes === 0 ? 'No conflicts found' : 'Requires attention'}
          icon={AlertCircle}
          iconColor={analytics.clashes === 0 ? 'text-success-700' : 'text-danger-700'}
        />
        <StatCard
          title="Avg Faculty Load"
          value={`${analytics.avgFacultyLoad} hrs/wk`}
          subtitle={`${analytics.activeFacultyCount} active teaching faculty`}
          icon={Users}
          iconColor="text-warning-700"
        />
        <StatCard
          title="Room Utilization"
          value={`${analytics.overallRoomUtilization}%`}
          subtitle="Peak operational capacity"
          icon={Building2}
          iconColor="text-success-700"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted space-y-3 rounded-2xl bg-white border border-line">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-700" />
          <p className="text-xs">Loading department analytics...</p>
        </div>
      ) : (
        <>
          {analytics.totalSlots === 0 && !error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-line text-muted">
              <Layers className="w-5 h-5 text-brand-700 shrink-0" />
              <p className="text-xs sm:text-sm">
                No timetable slots are scheduled for{' '}
                <span className="font-semibold text-charcoal">
                  {activeTerm?.name || 'the selected term'}
                </span>
                . Generate a timetable to populate these analytics.
              </p>
            </div>
          )}

          {/* Weekly load distribution */}
          <div className="rounded-2xl bg-white border border-line p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-brand-700" />
              <h2 className="text-sm font-bold text-charcoal tracking-tight">
                Weekly Load Distribution
              </h2>
            </div>
            <div className="space-y-2.5">
              {DAY_LABELS.map((label, idx) => {
                const count = analytics.dayCounts[idx]
                const width = Math.round((count / analytics.maxDayCount) * 100)
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-20 text-[11px] font-semibold text-muted shrink-0">
                      {label}
                    </span>
                    <div className="flex-1 h-5 rounded-lg bg-sand border border-line/70 overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-brand/70 transition-all"
                        style={{ width: `${count > 0 ? Math.max(width, 4) : 0}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[11px] font-bold text-charcoal tabular-nums">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Faculty workload */}
            <div className="rounded-2xl bg-white border border-line shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-700" />
                  <h2 className="text-sm font-bold text-charcoal tracking-tight">
                    Faculty Workload
                  </h2>
                </div>
                <span className="text-[11px] text-muted">
                  {analytics.totalFacultyHours} total hrs/wk
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-sand text-[11px] uppercase tracking-wider text-muted border-b border-line">
                    <tr>
                      <th className="px-5 py-3">Faculty</th>
                      <th className="px-5 py-3 text-center">Sessions</th>
                      <th className="px-5 py-3 text-center">Hrs/wk</th>
                      <th className="px-5 py-3">Load</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {analytics.facultyWorkload.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-xs text-muted">
                          No faculty workload to display.
                        </td>
                      </tr>
                    ) : (
                      analytics.facultyWorkload.map((f) => {
                        const pct = Math.round((f.hours / analytics.maxFacultyHours) * 100)
                        return (
                          <tr key={f.id} className="hover:bg-sand/30 transition-colors">
                            <td className="px-5 py-3 font-semibold text-charcoal tracking-tight">
                              {f.name}
                            </td>
                            <td className="px-5 py-3 text-center text-xs text-muted tabular-nums">
                              {f.sessions}
                            </td>
                            <td className="px-5 py-3 text-center text-xs font-bold text-charcoal tabular-nums">
                              {f.hours}
                            </td>
                            <td className="px-5 py-3">
                              <div className="w-full h-2 rounded-full bg-sand border border-line/70 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct >= 80
                                      ? 'bg-danger/70'
                                      : pct >= 50
                                      ? 'bg-warning/70'
                                      : 'bg-success/70'
                                  }`}
                                  style={{ width: `${f.sessions > 0 ? Math.max(pct, 4) : 0}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Room utilization */}
            <div className="rounded-2xl bg-white border border-line shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-700" />
                  <h2 className="text-sm font-bold text-charcoal tracking-tight">
                    Room &amp; Lab Utilization
                  </h2>
                </div>
                <span className="text-[11px] text-muted">
                  {WORK_DAYS} days × {WORK_HOURS_PER_DAY} hrs capacity
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-sand text-[11px] uppercase tracking-wider text-muted border-b border-line">
                    <tr>
                      <th className="px-5 py-3">Venue</th>
                      <th className="px-5 py-3 text-center">Sessions</th>
                      <th className="px-5 py-3 text-center">Hrs/wk</th>
                      <th className="px-5 py-3">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {analytics.roomUtilization.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-xs text-muted">
                          No rooms to display.
                        </td>
                      </tr>
                    ) : (
                      analytics.roomUtilization.map((r) => (
                        <tr key={r.id} className="hover:bg-sand/30 transition-colors">
                          <td className="px-5 py-3 font-semibold text-charcoal tracking-tight">
                            {r.name}
                          </td>
                          <td className="px-5 py-3 text-center text-xs text-muted tabular-nums">
                            {r.sessions}
                          </td>
                          <td className="px-5 py-3 text-center text-xs font-bold text-charcoal tabular-nums">
                            {r.hours}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-sand border border-line/70 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    r.percent >= 80
                                      ? 'bg-danger/70'
                                      : r.percent >= 50
                                      ? 'bg-brand/70'
                                      : 'bg-success/70'
                                  }`}
                                  style={{ width: `${r.sessions > 0 ? Math.max(r.percent, 4) : 0}%` }}
                                />
                              </div>
                              <span className="w-9 text-right text-[11px] font-bold text-charcoal tabular-nums">
                                {r.percent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Division coverage */}
          <div className="rounded-2xl bg-white border border-line p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-brand-700" />
              <h2 className="text-sm font-bold text-charcoal tracking-tight">
                Division Coverage
              </h2>
            </div>
            {analytics.divisionCoverage.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                No divisions found for this department.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {analytics.divisionCoverage.map((div) => (
                  <div
                    key={div.id}
                    className="rounded-xl bg-sand/60 border border-line p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-charcoal tracking-tight truncate">
                        {div.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-line text-muted font-semibold shrink-0">
                        {div.days}/6 days
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white border border-line py-2">
                        <div className="text-[9px] uppercase tracking-wider text-muted font-semibold">
                          Total
                        </div>
                        <div className="text-sm font-extrabold text-charcoal tabular-nums">
                          {div.total}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white border border-line py-2">
                        <div className="text-[9px] uppercase tracking-wider text-muted font-semibold">
                          Theory
                        </div>
                        <div className="text-sm font-extrabold text-charcoal tabular-nums">
                          {div.theory}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white border border-line py-2">
                        <div className="text-[9px] uppercase tracking-wider text-success-700 font-semibold">
                          Labs
                        </div>
                        <div className="text-sm font-extrabold text-success-700 tabular-nums">
                          {div.lab}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
