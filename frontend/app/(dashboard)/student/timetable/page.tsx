'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { GridView, GridSlotItem } from '../../../../components/timetable/GridView'
import {
  GraduationCap,
  Users,
  Calendar,
  Layers,
  Clock,
  BookOpen,
  CheckCircle2,
  Filter,
  RefreshCw,
  Building,
  UserCheck,
} from 'lucide-react'
import { api, ApiError } from '../../../../lib/api'
import { useAuth } from '../../../../context/AuthContext'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'

interface TermItem {
  id: string
  name: string
  is_current: boolean
  is_locked: boolean
  department_id?: string
}

interface BatchItem {
  id: string
  name: string
  division_id: string
}

interface DivisionItem {
  id: string
  name: string
  department_id: string
  academic_year_id?: string
  academic_year_name?: string
  year_level?: number
  student_count: number
  batches?: BatchItem[]
  class_teacher?: string
  class_teacher_name?: string
}

const YEAR_LEVEL_LABELS: Record<number, string> = {
  1: 'First Year (FY)',
  2: 'Second Year (SY)',
  3: 'Third Year (TY)',
  4: 'Final Year (BTech)',
}

function StudentTimetableContent() {
  const { user } = useAuth()

  // State
  const [terms, setTerms] = useState<TermItem[]>([])
  const [activeTermId, setActiveTermId] = useState<string>('')
  const [divisions, setDivisions] = useState<DivisionItem[]>([])
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('')
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all')

  const [rawSlots, setRawSlots] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false)

  // 1. Initial Load: Terms and Divisions for Student's Department
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    const deptParam = user?.department_id ? `?department_id=${user.department_id}` : ''

    Promise.all([
      api.get<TermItem[]>(`/settings/academic-terms${deptParam}`),
      api.get<DivisionItem[]>(`/divisions${deptParam}`),
    ])
      .then(([termList, divList]) => {
        if (!isMounted) return
        setTerms(termList || [])

        // Set active term (prefer is_current)
        const currentTerm = termList?.find((t) => t.is_current) || termList?.[0]
        if (currentTerm) {
          setActiveTermId(currentTerm.id)
        }

        setDivisions(divList || [])

        // Set active division: student's assigned division or first available
        if (divList && divList.length > 0) {
          const userDiv = divList.find((d) => d.id === user?.division_id)
          const targetDiv = userDiv || divList[0]
          setSelectedDivisionId(targetDiv.id)
        }
      })
      .catch((err) => {
        console.error('Failed to load terms or divisions for student:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user])

  // 2. Fetch timetable slots whenever active term or division changes
  const fetchTimetableSlots = async (termId: string, divisionId: string) => {
    if (!termId || !divisionId) return
    setSlotsLoading(true)
    try {
      const data = await api.get<any[]>(
        `/timetable?term_id=${termId}&division_id=${divisionId}`
      )
      setRawSlots(data || [])
    } catch (err) {
      console.error('Failed to load student timetable:', err)
      setRawSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTermId && selectedDivisionId) {
      fetchTimetableSlots(activeTermId, selectedDivisionId)
    }
  }, [activeTermId, selectedDivisionId])

  // Current Division and Term objects
  const activeDivision = useMemo(() => {
    return divisions.find((d) => d.id === selectedDivisionId) || divisions[0] || null
  }, [divisions, selectedDivisionId])

  const activeTerm = useMemo(() => {
    return terms.find((t) => t.id === activeTermId) || terms[0] || null
  }, [terms, activeTermId])

  // Available batches for current division
  const availableBatches = useMemo(() => {
    return activeDivision?.batches || []
  }, [activeDivision])

  // Filter and Map Slots into GridSlotItem format
  const mappedSlots = useMemo<GridSlotItem[]>(() => {
    return rawSlots
      .filter((s) => {
        // If a specific batch is chosen, keep all theory sessions + labs of that specific batch
        if (selectedBatchId !== 'all') {
          if (s.session_type === 'lab' && s.batch_id && s.batch_id !== selectedBatchId) {
            return false
          }
        }
        return true
      })
      .map((s) => {
        // Find batch name if slot is linked to a batch
        const batchObj = availableBatches.find((b) => b.id === s.batch_id)
        const batchName = batchObj?.name || (s.batch_id ? 'Batch Lab' : undefined)

        const sessionType: 'theory' | 'lab' = s.session_type === 'lab' ? 'lab' : 'theory'

        return {
          id: s.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          session_type: sessionType,
          course_code:
            s.courses?.code ||
            (s.source_type === 'mdm'
              ? 'MDM Minor'
              : s.source_type === 'pe'
              ? 'Elective (PE)'
              : 'Course'),
          course_name:
            s.courses?.name ||
            (s.source_type === 'mdm'
              ? 'Multidisciplinary Minor Option'
              : s.source_type === 'pe'
              ? 'Program Elective Option'
              : 'Scheduled Lecture'),
          faculty_name: s.users?.full_name || 'Assigned Faculty',
          room_code: s.rooms?.name || 'Classroom',
          division_name: activeDivision?.name || 'Division',
          batch_name: batchName,
          is_locked: !!s.is_locked,
        }
      })
  }, [rawSlots, selectedBatchId, availableBatches, activeDivision])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = rawSlots.length
    const theory = rawSlots.filter(
      (s) => s.session_type === 'theory' && s.source_type !== 'mdm' && s.source_type !== 'pe'
    ).length
    const labs = rawSlots.filter((s) => s.session_type === 'lab').length
    const common = rawSlots.filter(
      (s) => s.source_type === 'mdm' || s.source_type === 'pe'
    ).length
    return { total, theory, labs, common }
  }, [rawSlots])

  const yearLabel =
    activeDivision?.academic_year_name ||
    (activeDivision?.year_level
      ? YEAR_LEVEL_LABELS[activeDivision.year_level]
      : 'Third Year (TY)')

  return (
    <div className="space-y-6">
      {/* Top Banner: Student Schedule Overview */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-sand via-sand/90 to-tint/40 border border-line shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-tint border border-brand/40 flex items-center justify-center font-bold text-lg text-brand-700 shrink-0 mt-0.5">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-charcoal tracking-tight">
                Division {activeDivision?.name || 'Schedule'} — Student Timetable
              </h1>
              <Badge variant="primary" dot>
                {yearLabel}
              </Badge>
              <Badge variant="success" dot>
                Published & Active
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Student:{' '}
              <span className="text-charcoal font-medium">
                {user?.full_name || 'Enrolled Student'}
              </span>{' '}
              • Academic Term:{' '}
              <span className="text-charcoal font-medium">
                {activeTerm?.name || 'Current Term'}
              </span>
              {activeDivision?.class_teacher && (
                <span>
                  {' '}
                  • Class Teacher:{' '}
                  <span className="text-charcoal font-medium">
                    {activeDivision.class_teacher}
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls: Division, Term & Batch Selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Division Selector */}
          <div className="flex items-center gap-2 bg-sand border border-line rounded-xl px-3 py-1.5 text-xs shadow-sm">
            <Layers className="w-3.5 h-3.5 text-brand-700" />
            <span className="text-muted font-medium">Division:</span>
            <select
              value={selectedDivisionId}
              onChange={(e) => {
                setSelectedDivisionId(e.target.value)
                setSelectedBatchId('all')
              }}
              className="bg-transparent text-charcoal font-semibold focus:outline-none text-xs cursor-pointer"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id} className="bg-white text-charcoal">
                  {d.name} ({YEAR_LEVEL_LABELS[d.year_level || 3] || 'TY'})
                </option>
              ))}
            </select>
          </div>

          {/* Academic Term Selector */}
          <div className="flex items-center gap-2 bg-sand border border-line rounded-xl px-3 py-1.5 text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-success-700" />
            <span className="text-muted font-medium">Term:</span>
            <select
              value={activeTermId}
              onChange={(e) => setActiveTermId(e.target.value)}
              className="bg-transparent text-charcoal font-semibold focus:outline-none text-xs cursor-pointer"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id} className="bg-white text-charcoal">
                  {t.name} {t.is_current ? '• Current' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Selector */}
          {availableBatches.length > 0 && (
            <div className="flex items-center gap-2 bg-sand border border-line rounded-xl px-3 py-1.5 text-xs shadow-sm">
              <Users className="w-3.5 h-3.5 text-charcoal" />
              <span className="text-muted font-medium">Batch:</span>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-transparent text-charcoal font-semibold focus:outline-none text-xs cursor-pointer"
              >
                <option value="all" className="bg-white text-charcoal">
                  All Batches
                </option>
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-white text-charcoal">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => {
              if (activeTermId && selectedDivisionId) {
                fetchTimetableSlots(activeTermId, selectedDivisionId)
              }
            }}
            disabled={slotsLoading}
            className="p-2 rounded-xl bg-white border border-line hover:border-muted/60 text-muted hover:text-charcoal transition-colors"
            title="Refresh Schedule"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${slotsLoading ? 'animate-spin text-brand-700' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Scheduled Sessions"
          value={metrics.total}
          subtitle={`Weekly slots for ${activeDivision?.name || 'Class'}`}
          icon={Clock}
          iconColor="text-brand-700"
        />
        <StatCard
          title="Theory Lectures"
          value={metrics.theory}
          subtitle="Core subject lectures"
          icon={BookOpen}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Practical Labs"
          value={metrics.labs}
          subtitle={
            selectedBatchId !== 'all'
              ? `Filtered to selected batch`
              : 'All division batches'
          }
          icon={Users}
          iconColor="text-success-700"
        />
        <StatCard
          title="Minor / Electives"
          value={metrics.common}
          subtitle="MDM & common blocks"
          icon={Layers}
          iconColor="text-charcoal"
        />
      </div>

      {/* Timetable Grid View */}
      {loading || slotsLoading ? (
        <div className="p-16 text-center rounded-2xl bg-sand border border-line space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-700" />
          <p className="text-sm text-muted">Loading student weekly timetable...</p>
        </div>
      ) : mappedSlots.length > 0 ? (
        <div className="rounded-2xl border border-line bg-sand overflow-hidden shadow-xl p-2">
          <GridView
            slots={mappedSlots}
            institutionName="Pimpri Chinchwad Education Trust's Pimpri Chinchwad College of Engineering"
            departmentName="Department of Information Technology"
            academicYear="2026 - 2027"
            semesterName={activeTerm?.name || 'Semester - V'}
            className={`TY IT (Div- ${activeDivision?.name?.replace('IT-', '') || 'A'})`}
            classTeacherName={activeDivision?.class_teacher || activeDivision?.class_teacher_name || 'Prof. Sachin Kadam'}
            wefDate="27/07/2026"
            title={`Class Time Table — Division ${activeDivision?.name || 'IT-A'}`}
            subtitle={`Academic Year: 2026 - 2027 • Term: ${activeTerm?.name || 'Sem - 5'}`}
            showFilters={true}
          />
        </div>
      ) : (
        <div className="p-16 text-center rounded-2xl bg-sand border border-line space-y-3">
          <Calendar className="w-12 h-12 mx-auto text-muted" />
          <h3 className="text-base font-bold text-charcoal">
            No Timetable Published for {activeDivision?.name || 'Division'} in {activeTerm?.name || 'this term'}
          </h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            The timetable for this division has not been published yet. Check back once the department timetable coordinator submits and publishes the schedule.
          </p>
        </div>
      )}
    </div>
  )
}

export default function StudentTimetablePage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-muted space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-700" />
          <p className="text-xs">Loading Student Portal...</p>
        </div>
      }
    >
      <StudentTimetableContent />
    </Suspense>
  )
}
