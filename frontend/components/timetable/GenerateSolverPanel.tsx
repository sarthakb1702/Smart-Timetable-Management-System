'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Layers,
  Users,
  Building,
  BookOpen,
  Clock,
  CheckCircle,
  AlertTriangle,
  Sliders,
  ArrowRight,
} from 'lucide-react'
import { PreflightChecklist, PreflightCheckItem } from './PreflightChecklist'
import { useDepartment } from '../../context/DepartmentContext'
import { api, ApiError } from '../../lib/api'

const ICON_BY_ID: Record<string, React.ElementType> = {
  'fac-1': Users,
  'room-2': Building,
  'course-3': BookOpen,
  'div-4': Layers,
  'mdm-5': Clock,
  'pe-6': Sliders,
  'lunch-7': Clock,
}

interface GenerateSolverPanelProps {
  editPath: string
  approvePath: string
}

export function GenerateSolverPanel({ editPath, approvePath }: GenerateSolverPanelProps) {
  const router = useRouter()
  const { selectedDepartment, isLoading: isDeptLoading } = useDepartment()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingPreflight, setIsLoadingPreflight] = useState(true)
  const [generationResult, setGenerationResult] = useState<any>(null)
  const [preflightItems, setPreflightItems] = useState<PreflightCheckItem[]>([])
  const [preflightError, setPreflightError] = useState<string | null>(null)

  const deptId = selectedDepartment?.id

  const buildPayload = useCallback(async (): Promise<any | null> => {
    if (!deptId) return null

    const [
      terms,
      divisions,
      courses,
      users,
      rooms,
      mdmSlots,
      electiveSlots,
      electiveCourses,
      electiveOptions,
      collegeSettings,
      facultyMaps,
      roomMaps,
    ] = await Promise.all([
      api.get<any[]>('/settings/academic-terms'),
      api.get<any[]>(`/divisions?department_id=${deptId}`),
      api.get<any[]>(`/courses?department_id=${deptId}`),
      api.get<any[]>('/settings/users'),
      api.get<any[]>(`/rooms?department_id=${deptId}`),
      api.get<any[]>('/mdm/slots'),
      api.get<any[]>(`/electives/slots?department_id=${deptId}`),
      api.get<any[]>(`/electives/courses?department_id=${deptId}`),
      api.get<any[]>(`/electives/options`),
      api.get<any>('/settings/college'),
      api.get<any[]>('/mappings/faculty'),
      api.get<any[]>('/mappings/rooms'),
    ])

    const activeTerm = terms.find((t) => t.is_current) || terms[0]
    const termId = activeTerm?.id
    const activeYearId = divisions[0]?.academic_year_id

    const faculties = users.filter((u) => u.role === 'faculty')

    const facultyByCourse: Record<string, string[]> = {}
    for (const m of facultyMaps || []) {
      if (!m.course_id || !m.faculty_id) continue
      ;(facultyByCourse[m.course_id] ||= []).push(m.faculty_id)
    }

    const roomsByCourse: Record<string, string[]> = {}
    for (const m of roomMaps || []) {
      if (!m.course_id || !m.room_id) continue
      ;(roomsByCourse[m.course_id] ||= []).push(m.room_id)
    }

    return {
      term_id: termId,
      department_id: deptId,
      divisions: divisions.map((d) => ({
        id: d.id,
        name: d.name,
        academic_year_id: d.academic_year_id || activeYearId,
        year_level: d.year_level,
        capacity: d.student_count || 60,
        batches: (d.batches || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          student_count: b.student_count || 20,
        })),
      })),
      courses: courses
        .filter((c) => !c.academic_year_id || !activeYearId || c.academic_year_id === activeYearId)
        .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        credits: c.credits,
        weekly_theory_hours: c.session_type === 'theory' ? c.credits : 0,
        weekly_lab_hours: c.session_type === 'lab' ? c.credits : 0,
        preferred_room_type: c.session_type === 'lab' ? 'lab' : 'classroom',
        assigned_faculty_ids: facultyByCourse[c.id] || [],
        allowed_room_ids: roomsByCourse[c.id] || [],
      })),
      faculties: faculties.map((f) => ({
        id: f.id,
        name: f.full_name,
        max_weekly_hours: collegeSettings?.max_faculty_weekly_hours || 18,
      })),
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.name,
        room_type: r.room_type,
        capacity: r.capacity,
      })),
      mdm_slots: (() => {
        const list: any[] = []
        for (const m of mdmSlots || []) {
          if (m.academic_year_id !== activeYearId) continue
          const isLocked = m.status === 'locked'
          for (const o of (m.options || [])) {
            list.push({
              id: o.id,
              name: 'MDM',
              day_of_week: m.day_of_week,
              start_time: m.start_time,
              end_time: m.end_time,
              is_locked: isLocked,
              faculty_id: o.faculty_id,
              room_id: o.room_id,
            })
          }
        }
        return list
      })(),
      elective_slots: (() => {
        const list: any[] = []
        const deptEs = (electiveSlots || []).filter((e) => e.academic_year_id === activeYearId)
        const ecById: Record<string, any> = {}
        for (const c of electiveCourses || []) ecById[c.id] = c
        const slotByAY: Record<string, any> = {}
        for (const s of deptEs) slotByAY[s.academic_year_id] = s
        for (const opt of electiveOptions || []) {
          const ec = opt.elective_course_id && ecById[opt.elective_course_id]
          if (!ec) continue
          if (ec.academic_year_id !== activeYearId) continue
          if (ec.department_id !== deptId) continue
          const s = slotByAY[ec.academic_year_id]
          if (!s) continue
          const isLocked = s.status === 'locked'
          list.push({
            id: opt.id,
            name: 'PE',
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_locked: isLocked,
            faculty_id: opt.faculty_id,
            room_id: opt.theory_room_id,
          })
        }
        return list
      })(),
      settings: {
        working_days: collegeSettings?.working_days || [1, 2, 3, 4, 5, 6],
        day_start_time: collegeSettings?.day_start_time || '08:00:00',
        day_end_time: collegeSettings?.day_end_time || '17:00:00',
        slot_duration_minutes: collegeSettings?.slot_duration_minutes || 60,
        lunch_start_time: collegeSettings?.lunch_start_time || '12:00:00',
        lunch_end_time: collegeSettings?.lunch_end_time || '13:00:00',
        max_faculty_weekly_hours: collegeSettings?.max_faculty_weekly_hours || 18,
        max_solver_time_seconds: 60,
      },
      save_to_db: true,
    }
  }, [deptId])

  const loadPreflight = useCallback(async () => {
    if (isDeptLoading) return
    if (!deptId) {
      setIsLoadingPreflight(false)
      setPreflightError('Select a department to run the preflight checks.')
      return
    }
    setIsLoadingPreflight(true)
    setPreflightError(null)
    try {
      const payload = await buildPayload()
      if (!payload) return
      const pre = await api.post<any>('/generate/preflight', payload)
      const items: PreflightCheckItem[] = (pre.items || []).map((i: any) => ({
        ...i,
        icon: ICON_BY_ID[i.id] || Clock,
      }))
      setPreflightItems(items)
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : 'Failed to load preflight checks.'
      setPreflightError(detail)
    } finally {
      setIsLoadingPreflight(false)
    }
  }, [deptId, isDeptLoading, buildPayload])

  useEffect(() => {
    if (!isDeptLoading && deptId) {
      loadPreflight()
    }
  }, [isDeptLoading, deptId, loadPreflight])

  const handleRunSolver = async () => {
    setIsGenerating(true)
    setGenerationResult(null)

    try {
      const payload = await buildPayload()
      if (!payload) {
        alert('Selected department is not available. Please pick a department first.')
        return
      }
      if (!payload.term_id) {
        alert('No academic term is configured. Ask a Superadmin to create and set the current term.')
        return
      }

      const data = await api.post<any>('/generate', payload)
      setGenerationResult(data)
    } catch (err) {
      const detail = err instanceof ApiError ? err.message : 'Error calling generation API.'
      alert(`Generation Failed: ${detail}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {preflightError && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs">
          <AlertTriangle className="w-4 h-4" />
          <span>{preflightError}</span>
        </div>
      )}

      {isLoadingPreflight ? (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
          Running pre-generation checks...
        </div>
      ) : (
        <PreflightChecklist
          items={preflightItems}
          onGenerate={handleRunSolver}
          isGenerating={isGenerating}
        />
      )}

      {generationResult && (
        <div
          className={`p-6 rounded-2xl border shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
            generationResult.success
              ? 'bg-indigo-950/30 border-indigo-500/40'
              : 'bg-rose-950/20 border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {generationResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <h3 className="text-sm font-bold text-white">
                OR-Tools Generation {generationResult.success ? 'Completed' : 'Incomplete'}:{' '}
                {generationResult.status}
              </h3>
            </div>
            <div className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300">
              Solve Time: {generationResult.solver_time_seconds}s
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{generationResult.message}</p>

          {Array.isArray(generationResult.diagnostics) && generationResult.diagnostics.length > 0 && (
            <ul className="text-[11px] text-amber-300/90 list-disc pl-5 space-y-0.5">
              {generationResult.diagnostics.map((d: any, i: number) => (
                <li key={i}>{d.message || d.reason || JSON.stringify(d)}</li>
              ))}
            </ul>
          )}

          {generationResult.success && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => router.push(editPath)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wide shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                <span>Review in Interactive Grid</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => router.push(approvePath)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Submit for HOD Approval
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
