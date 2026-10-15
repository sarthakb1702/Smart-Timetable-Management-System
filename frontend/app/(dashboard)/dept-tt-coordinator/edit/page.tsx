'use client'

import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Layers,
  Calendar,
  Clock,
  Users,
  BookOpen,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Grid,
  Edit3,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  FileCheck2,
  Eye,
  SlidersHorizontal,
  Download,
  FileText,
} from 'lucide-react'
import { DragDropGrid, DragSlotItem } from '../../../../components/timetable/DragDropGrid'
import { TimetablePrintView } from '../../../../components/timetable/TimetablePrintView'
import { useDepartment } from '../../../../context/DepartmentContext'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { api, ApiError } from '../../../../lib/api'

interface DivisionItem {
  id: string
  name: string
  department_id: string
  academic_year_id?: string
  year_level: number
  student_count: number
  academic_years?: { name: string; code: string }
  batches?: any[]
  class_teacher_name?: string | null
  class_teacher_id?: string | null
}

interface TermItem {
  id: string
  name: string
  academic_year_id: string
  is_current: boolean
  is_locked: boolean
}

interface ApprovalState {
  status: 'draft' | 'pending_approval' | 'published' | 'rejected'
  submitted_by_name?: string | null
  slot_count?: number
  slots_by_status?: Record<string, number>
}

const YEAR_LEVEL_LABELS: Record<number, string> = {
  1: 'First Year (FY)',
  2: 'Second Year (SY)',
  3: 'Third Year (TY)',
  4: 'Final Year (BTech)',
}

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; variant: 'secondary' | 'warning' | 'primary' | 'success' | 'danger'; dot: boolean }
> = {
  draft: { label: 'Draft • Work in Progress', variant: 'warning', dot: true },
  pending_approval: { label: 'Pending HOD Review', variant: 'primary', dot: true },
  submitted: { label: 'Pending HOD Review', variant: 'primary', dot: true },
  published: { label: 'Published & Live', variant: 'success', dot: true },
  rejected: { label: 'Changes Requested', variant: 'danger', dot: true },
  not_generated: { label: 'No Schedule Yet', variant: 'secondary', dot: false },
}

function EditTimetableContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlDivisionId = searchParams.get('division_id')

  const { selectedDepartment } = useDepartment()

  // Academic Terms & Divisions
  const [terms, setTerms] = useState<TermItem[]>([])
  const [activeTermId, setActiveTermId] = useState<string>('')
  const [divisions, setDivisions] = useState<DivisionItem[]>([])

  // Raw timetable slots for the entire department & term
  const [allDepartmentSlots, setAllDepartmentSlots] = useState<any[]>([])
  const [approvalState, setApprovalState] = useState<ApprovalState | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  // Active View: 'list' (catalog) | 'editor'
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(urlDivisionId || null)

  // Filters for Catalog View
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Submission state
  const [submittingApproval, setSubmittingApproval] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // 1. Initial Load: Terms and Divisions
  useEffect(() => {
    if (!selectedDepartment) return

    let isMounted = true
    setLoading(true)

    Promise.all([
      api.get<TermItem[]>(`/settings/academic-terms?department_id=${selectedDepartment.id}`),
      api.get<DivisionItem[]>(`/divisions?department_id=${selectedDepartment.id}`),
    ])
      .then(([termList, divList]) => {
        if (!isMounted) return
        setTerms(termList || [])
        const currentTerm = termList.find((t) => t.is_current) || termList[0]
        if (currentTerm) {
          setActiveTermId(currentTerm.id)
        }
        setDivisions(divList || [])
      })
      .catch((err) => {
        console.error('Failed to load terms or divisions:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedDepartment])

  // 2. Fetch all department slots & approval state whenever term or dept changes
  const fetchDepartmentTimetable = async (termId: string, deptId: string) => {
    if (!termId || !deptId) return
    setRefreshing(true)
    try {
      const [slotsData, approvalData] = await Promise.all([
        api.get<any[]>(`/timetable?term_id=${termId}&department_id=${deptId}`),
        api.get<ApprovalState>(`/timetable/approvals?term_id=${termId}&department_id=${deptId}`).catch(() => null),
      ])
      setAllDepartmentSlots(slotsData || [])
      if (approvalData) {
        setApprovalState(approvalData)
      }
    } catch (err) {
      console.error('Failed to fetch timetable slots:', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (activeTermId && selectedDepartment) {
      fetchDepartmentTimetable(activeTermId, selectedDepartment.id)
    }
  }, [activeTermId, selectedDepartment])

  // Sync urlDivisionId if it changes
  useEffect(() => {
    if (urlDivisionId) {
      setSelectedDivisionId(urlDivisionId)
    }
  }, [urlDivisionId])

  // Group slots by division_id
  const slotsByDivision = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const slot of allDepartmentSlots) {
      const divId = slot.division_id
      if (!map.has(divId)) {
        map.set(divId, [])
      }
      map.get(divId)!.push(slot)
    }
    return map
  }, [allDepartmentSlots])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalDivs = divisions.length
    const totalSlots = allDepartmentSlots.length
    const theorySlots = allDepartmentSlots.filter((s) => s.session_type === 'theory').length
    const labSlots = allDepartmentSlots.filter((s) => s.session_type === 'lab').length
    const commonSlots = allDepartmentSlots.filter(
      (s) => s.source_type === 'mdm' || s.source_type === 'pe'
    ).length

    const overallStatus = approvalState?.status || (totalSlots > 0 ? 'draft' : 'not_generated')

    return {
      totalDivs,
      totalSlots,
      theorySlots,
      labSlots,
      commonSlots,
      overallStatus,
    }
  }, [divisions, allDepartmentSlots, approvalState])

  // Filtered Divisions for Catalog View
  const filteredDivisions = useMemo(() => {
    return divisions.filter((div) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = div.name.toLowerCase().includes(q)
        const matchesYear =
          div.academic_years?.name?.toLowerCase().includes(q) ||
          YEAR_LEVEL_LABELS[div.year_level]?.toLowerCase().includes(q)
        if (!matchesName && !matchesYear) return false
      }

      // Year filter
      if (yearFilter !== 'all') {
        if (div.year_level.toString() !== yearFilter) return false
      }

      // Status filter
      if (statusFilter !== 'all') {
        const divSlots = slotsByDivision.get(div.id) || []
        const currentStatus =
          divSlots.length === 0
            ? 'not_generated'
            : approvalState?.status || divSlots[0]?.status || 'draft'
        if (statusFilter === 'not_generated' && currentStatus !== 'not_generated') return false
        if (statusFilter !== 'not_generated' && currentStatus !== statusFilter) return false
      }

      return true
    })
  }, [divisions, searchQuery, yearFilter, statusFilter, slotsByDivision, approvalState])

  // Selected Division Data & DragDropGrid mapped slots
  const selectedDivision = useMemo(() => {
    return divisions.find((d) => d.id === selectedDivisionId) || null
  }, [divisions, selectedDivisionId])

  const selectedDivisionSlots = useMemo<DragSlotItem[]>(() => {
    if (!selectedDivisionId) return []
    const rawSlots = slotsByDivision.get(selectedDivisionId) || []
    return rawSlots.map((s) => ({
      id: s.id,
      term_id: s.term_id,
      division_id: s.division_id,
      division_name: selectedDivision?.name,
      batch_id: s.batch_id,
      batch_name:
        s.batches?.name ||
        selectedDivision?.batches?.find((b) => b.id === s.batch_id)?.name ||
        (s.batch_id ? 'Lab Batch' : undefined),
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      session_type: s.session_type,
      source_type: s.source_type,
      course_id: s.course_id,
      course_code: s.courses?.code,
      course_name: s.courses?.name,
      faculty_id: s.faculty_id,
      faculty_name: s.users?.full_name,
      room_id: s.room_id,
      room_code: s.rooms?.name || s.rooms?.code,
      is_locked: !!s.is_locked,
    }))
  }, [selectedDivisionId, slotsByDivision, selectedDivision])

  // Submit department timetable for HOD approval
  const handleSubmitReview = async () => {
    if (!selectedDepartment || !activeTermId) return

    if (
      !confirm(
        'Submit the generated timetable for HOD approval? Once submitted, the HOD will review the schedule.'
      )
    ) {
      return
    }

    setSubmittingApproval(true)
    try {
      const res = await api.post<{ status: string }>('/timetable/approvals/submit', {
        term_id: activeTermId,
        department_id: selectedDepartment.id,
      })
      setApprovalState((prev) => ({
        ...prev,
        status: (res.status as any) || 'pending_approval',
      }))
      setToastMessage({
        type: 'success',
        message: 'Timetable submitted for HOD review successfully!',
      })
      // Refresh local slots to reflect updated status
      fetchDepartmentTimetable(activeTermId, selectedDepartment.id)
    } catch (err) {
      setToastMessage({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Error submitting timetable for approval.',
      })
    } finally {
      setSubmittingApproval(false)
    }
  }

  // Handle open editor
  const handleOpenEditor = (divisionId: string) => {
    setSelectedDivisionId(divisionId)
    // Optional shallow route update
    window.history.pushState(null, '', `?division_id=${divisionId}`)
  }

  // Handle return to catalog view
  const handleBackToCatalog = () => {
    setSelectedDivisionId(null)
    window.history.pushState(null, '', window.location.pathname)
  }

  // Export state
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  const exportFileName = useMemo(() => {
    const base = (selectedDivision?.name || 'timetable').replace(/[^\w-]+/g, '_')
    return `${base}_timetable`
  }, [selectedDivision])

  const captureGridCanvas = async () => {
    const el = exportRef.current
    if (!el) throw new Error('Timetable is not ready for export yet.')
    const html2canvas = (await import('html2canvas')).default
    return html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      width: el.scrollWidth,
      height: el.scrollHeight,
    })
  }

  const handleDownloadPNG = async () => {
    setExporting('png')
    try {
      const canvas = await captureGridCanvas()
      const link = document.createElement('a')
      link.download = `${exportFileName}.png`
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      setToastMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not export the timetable as PNG.',
      })
    } finally {
      setExporting(null)
    }
  }

  const handleDownloadPDF = async () => {
    setExporting('pdf')
    try {
      const canvas = await captureGridCanvas()
      const imgData = canvas.toDataURL('image/png')
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 24
      const ratio = Math.min(
        (pageWidth - margin * 2) / canvas.width,
        (pageHeight - margin * 2) / canvas.height
      )
      const imgW = canvas.width * ratio
      const imgH = canvas.height * ratio
      pdf.addImage(imgData, 'PNG', (pageWidth - imgW) / 2, (pageHeight - imgH) / 2, imgW, imgH)
      pdf.save(`${exportFileName}.pdf`)
    } catch (err) {
      setToastMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Could not export the timetable as PDF.',
      })
    } finally {
      setExporting(null)
    }
  }

  // Active term object
  const activeTerm = terms.find((t) => t.id === activeTermId)

  // ==========================================
  // VIEW: EDIT TIMETABLE (EDITOR MODE)
  // ==========================================
  if (selectedDivisionId && selectedDivision) {
    const divRawSlots = slotsByDivision.get(selectedDivisionId) || []
    const divTheoryCount = divRawSlots.filter((s) => s.session_type === 'theory').length
    const divLabCount = divRawSlots.filter((s) => s.session_type === 'lab').length
    const divMdmCount = divRawSlots.filter(
      (s) => s.source_type === 'mdm' || s.source_type === 'pe'
    ).length
    const divStatus =
      divRawSlots.length === 0
        ? 'not_generated'
        : approvalState?.status || divRawSlots[0]?.status || 'draft'
    const statusCfg = STATUS_BADGE_CONFIG[divStatus] || STATUS_BADGE_CONFIG.draft

    return (
      <div className="-m-4 sm:-m-6 lg:-m-8 min-h-full bg-white p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-fade-in ${
              toastMessage.type === 'success'
                ? 'bg-success-50 border-success/50 text-success-700'
                : 'bg-danger-50 border-danger/50 text-danger-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-success-700" />
            ) : (
              <AlertCircle className="w-5 h-5 text-danger-700" />
            )}
            <span className="text-sm font-medium">{toastMessage.message}</span>
          </div>
        )}

        {/* Top Navigation & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToCatalog}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-line hover:border-brand-600/50 hover:bg-sand/80 text-muted hover:text-charcoal text-xs font-semibold tracking-wide transition-all shadow-sm group"
            >
              <ArrowLeft className="w-4 h-4 text-brand-700 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to All Timetables</span>
            </button>

            <span className="text-muted text-sm hidden sm:inline">•</span>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Department:</span>
              <span className="text-xs font-semibold text-charcoal">
                {selectedDepartment?.name || 'Department'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Division Switcher Dropdown */}
            <div className="flex items-center gap-2 bg-white border border-line rounded-xl px-3 py-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-brand-700" />
              <span className="text-muted font-medium">Switch Division:</span>
              <select
                value={selectedDivisionId}
                onChange={(e) => handleOpenEditor(e.target.value)}
                className="bg-transparent text-charcoal font-semibold focus:outline-none text-xs cursor-pointer"
              >
                {divisions.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white text-charcoal">
                    {d.name} ({YEAR_LEVEL_LABELS[d.year_level] || d.academic_years?.name || 'Third Year (TY)'})
                  </option>
                ))}
              </select>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-1 bg-white border border-line rounded-xl p-1">
              <button
                onClick={handleDownloadPNG}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-sand text-charcoal text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download timetable as PNG"
              >
                <Download className="w-3.5 h-3.5 text-brand-700" />
                <span>{exporting === 'png' ? 'Exporting...' : 'PNG'}</span>
              </button>
              <span className="w-px h-4 bg-line" />
              <button
                onClick={handleDownloadPDF}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-sand text-charcoal text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download timetable as PDF"
              >
                <FileText className="w-3.5 h-3.5 text-brand-700" />
                <span>{exporting === 'pdf' ? 'Exporting...' : 'PDF'}</span>
              </button>
            </div>

            {/* Submit for Review Button */}
            <button
              onClick={handleSubmitReview}
              disabled={submittingApproval || divRawSlots.length === 0}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md ${
                divRawSlots.length === 0
                  ? 'bg-sand text-muted cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-600 text-charcoal shadow-charcoal/15'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingApproval ? 'Submitting...' : 'Submit for Review'}</span>
            </button>
          </div>
        </div>

        {/* Division Editor Header Banner */}
        <div className="p-5 rounded-2xl bg-white border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-charcoal flex items-center gap-2">
                <span>{selectedDivision.name}</span>
                <span className="text-muted text-lg font-normal">Timetable</span>
              </h1>
              <Badge variant="primary" dot>
                {YEAR_LEVEL_LABELS[selectedDivision.year_level] || selectedDivision.academic_years?.name || 'Third Year (TY)'}
              </Badge>
              <Badge variant={statusCfg.variant} dot={statusCfg.dot}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted">
              Academic Term: <span className="text-charcoal font-medium">{activeTerm?.name || 'Current Term'}</span> •{' '}
              {selectedDivision.student_count || 80} Students •{' '}
              {selectedDivision.batches?.length || 3} Batches
              {selectedDivision.class_teacher_name && (
                <span> • Class Teacher: <strong className="text-charcoal font-medium">{selectedDivision.class_teacher_name}</strong></span>
              )}
            </p>
          </div>

          {/* Quick Slot Metrics Strip */}
          <div className="flex items-center gap-2 bg-sand p-2 rounded-xl border border-line/80 text-xs">
            <div className="px-3 py-1 border-r border-line text-center">
              <div className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Slots</div>
              <div className="text-sm font-black text-charcoal">{selectedDivisionSlots.length}</div>
            </div>
            <div className="px-3 py-1 border-r border-line text-center">
              <div className="text-[10px] text-muted uppercase tracking-wider font-semibold">Theory</div>
              <div className="text-sm font-bold text-charcoal">{divTheoryCount}</div>
            </div>
            <div className="px-3 py-1 border-r border-line text-center">
              <div className="text-[10px] text-muted uppercase tracking-wider font-semibold">Labs</div>
              <div className="text-sm font-bold text-success-700">{divLabCount}</div>
            </div>
            <div className="px-3 py-1 text-center">
              <div className="text-[10px] text-muted uppercase tracking-wider font-semibold">MDM / PE</div>
              <div className="text-sm font-bold text-charcoal">{divMdmCount}</div>
            </div>
          </div>
        </div>

        {/* Drag Drop Grid Component */}
        {selectedDivisionSlots.length > 0 ? (
          <div className="space-y-4">
            <DragDropGrid
              key={selectedDivisionId}
              variant="plain"
              initialSlots={selectedDivisionSlots}
              onSlotsUpdated={(updated) => {
                // Keep the allDepartmentSlots updated in sync
                setAllDepartmentSlots((prev) => {
                  const updatedIds = new Set(updated.map((u) => u.id))
                  const rest = prev.filter((s) => !updatedIds.has(s.id))
                  return [...rest, ...updated]
                })
              }}
            />
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-sand border border-line space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-sand border border-line flex items-center justify-center text-muted">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-charcoal">No Timetable Generated for {selectedDivision.name}</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                This division does not have any scheduled slots in {activeTerm?.name || 'this term'}. Run the OR-Tools solver to auto-generate the timetable.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => router.push('/dept-tt-coordinator/generate')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-semibold text-xs tracking-wide shadow-lg shadow-charcoal/15 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Go to Timetable Generator</span>
              </button>
              <button
                onClick={handleBackToCatalog}
                className="px-4 py-2 rounded-xl bg-sand hover:bg-line text-charcoal font-medium text-xs transition-colors"
              >
                View Other Divisions
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Hidden print view used for PDF / PNG export (parked behind the
            opaque page background so it never paints on screen). */}
        <div
          ref={exportRef}
          aria-hidden="true"
          style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, pointerEvents: 'none' }}
        >
          <TimetablePrintView
            slots={selectedDivisionSlots}
            divisionName={selectedDivision.name}
            departmentName={selectedDepartment?.name || 'Department'}
            termName={activeTerm?.name || 'Current Term'}
            yearLabel={
              YEAR_LEVEL_LABELS[selectedDivision.year_level] ||
              selectedDivision.academic_years?.name ||
              'Third Year (TY)'
            }
            studentCount={selectedDivision.student_count}
            batchCount={selectedDivision.batches?.length}
            classTeacher={selectedDivision.class_teacher_name}
          />
        </div>
      </div>
    )
  }

  // ==========================================
  // VIEW: CATALOG / DIRECTORY OF TIMETABLES
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-success-50 border-success/50 text-success-700'
              : 'bg-danger-50 border-danger/50 text-danger-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-success-700" />
          ) : (
            <AlertCircle className="w-5 h-5 text-danger-700" />
          )}
          <span className="text-sm font-medium">{toastMessage.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-charcoal">
              Department Timetable Editor
            </h1>
            <Badge variant="primary">
              {selectedDepartment?.name || 'Department Coordinator'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Select an available division timetable below to open the interactive drag-and-drop editor and manage schedules.
          </p>
        </div>

        {/* Header Actions: Term Switcher & Generator Link */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Academic Term Dropdown */}
          <div className="flex items-center gap-2 bg-sand border border-line rounded-xl px-3 py-1.5 text-xs shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-brand-700" />
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

          {/* Refresh Button */}
          <button
            onClick={() => {
              if (activeTermId && selectedDepartment) {
                fetchDepartmentTimetable(activeTermId, selectedDepartment.id)
              }
            }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white border border-line hover:border-muted/60 text-muted hover:text-charcoal transition-colors"
            title="Refresh Timetables"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-700' : ''}`} />
          </button>

          {/* Generator Direct Link */}
          <button
            onClick={() => router.push('/dept-tt-coordinator/generate')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-semibold text-xs tracking-wide shadow-md shadow-charcoal/15 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate New</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Divisions"
          value={summaryMetrics.totalDivs}
          subtitle={`Department of ${selectedDepartment?.code || 'Dept'}`}
          icon={Layers}
          iconColor="text-brand-700"
        />
        <StatCard
          title="Scheduled Slots"
          value={summaryMetrics.totalSlots}
          subtitle={`${summaryMetrics.theorySlots} Theory • ${summaryMetrics.labSlots} Labs`}
          icon={Clock}
          iconColor="text-success-700"
        />
        <StatCard
          title="Common Sessions"
          value={summaryMetrics.commonSlots}
          subtitle="MDM & Elective Blocks"
          icon={BookOpen}
          iconColor="text-charcoal"
        />
        <StatCard
          title="Overall Status"
          value={
            summaryMetrics.overallStatus === 'published'
              ? 'Published'
              : summaryMetrics.overallStatus === 'pending_approval'
              ? 'In Review'
              : summaryMetrics.totalSlots > 0
              ? 'Draft Ready'
              : 'Unscheduled'
          }
          subtitle={
            summaryMetrics.totalSlots > 0
              ? '100% Conflict Free'
              : 'Awaiting generation'
          }
          icon={CheckCircle2}
          iconColor={summaryMetrics.totalSlots > 0 ? 'text-success-700' : 'text-muted'}
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-sand border border-line/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by division name, code, year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-sand border border-line rounded-xl pl-9 pr-4 py-2 text-xs text-charcoal placeholder-muted focus:outline-none focus:border-brand-700 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 bg-sand border border-line rounded-xl px-3 py-1.5 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted" />
            <span className="text-muted">Year:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-transparent text-charcoal font-medium focus:outline-none text-xs cursor-pointer"
            >
              <option value="all" className="bg-white">All Years</option>
              <option value="1" className="bg-white">FY (Year 1)</option>
              <option value="2" className="bg-white">SY (Year 2)</option>
              <option value="3" className="bg-white">TY (Year 3)</option>
              <option value="4" className="bg-white">Final (Year 4)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-sand border border-line rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-muted" />
            <span className="text-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-charcoal font-medium focus:outline-none text-xs cursor-pointer"
            >
              <option value="all" className="bg-white">All Statuses</option>
              <option value="draft" className="bg-white">Draft</option>
              <option value="pending_approval" className="bg-white">Pending Review</option>
              <option value="published" className="bg-white">Published</option>
              <option value="not_generated" className="bg-white">No Timetable</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || yearFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setYearFilter('all')
                setStatusFilter('all')
              }}
              className="px-2.5 py-1.5 text-xs text-brand-700 hover:text-brand-700 font-medium transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Directory Grid: Division Timetable Cards */}
      {loading ? (
        <div className="p-12 text-center text-muted space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-700" />
          <p className="text-xs">Loading available department timetables...</p>
        </div>
      ) : filteredDivisions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDivisions.map((div) => {
            const divSlots = slotsByDivision.get(div.id) || []
            const hasSlots = divSlots.length > 0
            const theoryCount = divSlots.filter((s) => s.session_type === 'theory').length
            const labCount = divSlots.filter((s) => s.session_type === 'lab').length
            const mdmCount = divSlots.filter(
              (s) => s.source_type === 'mdm' || s.source_type === 'pe'
            ).length

            // Faculty count involved
            const facultySet = new Set(divSlots.map((s) => s.faculty_id).filter(Boolean))
            // Active days count
            const activeDays = new Set(divSlots.map((s) => s.day_of_week))

            const currentStatus =
              divSlots.length === 0
                ? 'not_generated'
                : approvalState?.status || divSlots[0]?.status || 'draft'
            const statusConfig = STATUS_BADGE_CONFIG[currentStatus] || STATUS_BADGE_CONFIG.draft

            return (
              <div
                key={div.id}
                onClick={() => handleOpenEditor(div.id)}
                className="group relative flex flex-col justify-between rounded-2xl bg-white border border-line hover:border-brand-600/50 p-5 shadow-lg transition-all duration-200 hover:shadow-charcoal/10 cursor-pointer overflow-hidden"
              >
                {/* Accent glow on hover */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-tint blur-2xl group-hover:bg-tint transition-all pointer-events-none" />

                <div className="space-y-4">
                  {/* Card Header: Division Name + Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black tracking-tight text-charcoal group-hover:text-brand-700 transition-colors">
                          {div.name}
                        </h2>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-sand text-muted font-semibold border border-line/60">
                          {YEAR_LEVEL_LABELS[div.year_level] || div.academic_years?.name || 'Third Year (TY)'}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {div.academic_years?.name || `${activeTerm?.name || 'Academic Term'}`}
                      </p>
                    </div>

                    <Badge variant={statusConfig.variant} dot={statusConfig.dot}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Division Info Strip: Capacity, Batches, Teacher */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2.5 px-3 rounded-xl bg-sand border border-line/80">
                    <div className="flex items-center gap-2 text-muted">
                      <Users className="w-3.5 h-3.5 text-brand-700" />
                      <span>{div.student_count || 85} Students</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                      <Layers className="w-3.5 h-3.5 text-charcoal" />
                      <span>{div.batches?.length || 3} Batches</span>
                    </div>
                    {div.class_teacher_name && (
                      <div className="col-span-2 text-muted text-[11px] truncate mt-1 pt-1 border-t border-line/60">
                        Class Teacher: <span className="text-charcoal font-medium">{div.class_teacher_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Timetable Slot Statistics breakdown */}
                  {hasSlots ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-xl bg-sand border border-line text-center">
                          <div className="text-[10px] text-muted uppercase font-semibold">Total</div>
                          <div className="text-base font-extrabold text-charcoal mt-0.5">{divSlots.length}</div>
                          <div className="text-[10px] text-muted">Slots</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-sand border border-line text-center">
                          <div className="text-[10px] text-charcoal uppercase font-semibold">Theory</div>
                          <div className="text-base font-extrabold text-charcoal mt-0.5">{theoryCount}</div>
                          <div className="text-[10px] text-muted">1-Hr</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-sand border border-line text-center">
                          <div className="text-[10px] text-success-700 uppercase font-semibold">Labs</div>
                          <div className="text-base font-extrabold text-success-700 mt-0.5">{labCount}</div>
                          <div className="text-[10px] text-muted">2-Hr</div>
                        </div>
                      </div>

                      {/* Day Coverage Badges & Faculty Count */}
                      <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted uppercase mr-1">Days:</span>
                          {[1, 2, 3, 4, 5, 6].map((dayNum) => {
                            const dayLetter = ['M', 'T', 'W', 'T', 'F', 'S'][dayNum - 1]
                            const isActive = activeDays.has(dayNum)
                            return (
                              <span
                                key={dayNum}
                                className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-tint text-brand-700 border border-brand/40'
                                    : 'bg-white text-muted'
                                }`}
                              >
                                {dayLetter}
                              </span>
                            )
                          })}
                        </div>
                        <span className="text-muted font-medium">
                          {facultySet.size} Faculty
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 px-4 rounded-xl bg-sand border border-dashed border-line text-center space-y-1.5">
                      <Calendar className="w-5 h-5 mx-auto text-muted" />
                      <p className="text-xs font-semibold text-muted">No Timetable Generated</p>
                      <p className="text-[11px] text-muted">Run solver to schedule courses for this division</p>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 mt-4 border-t border-line/80 flex items-center justify-between">
                  <span className="text-[11px] text-muted font-medium group-hover:text-charcoal transition-colors">
                    {hasSlots ? 'Interactive Drag & Drop' : 'Awaiting Schedule Generation'}
                  </span>

                  {hasSlots ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEditor(div.id)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand group-hover:bg-brand-600 text-charcoal font-semibold text-xs tracking-wide shadow-md shadow-charcoal/15 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Timetable</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push('/dept-tt-coordinator/generate')
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sand hover:bg-line text-muted font-medium text-xs tracking-wide transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-700" />
                      <span>Generate</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-sand border border-line space-y-3">
          <Layers className="w-8 h-8 mx-auto text-muted" />
          <h3 className="text-sm font-bold text-charcoal">No Divisions Found Matching Filters</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Try adjusting your search criteria or clear the filters to see all available timetables.
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setYearFilter('all')
              setStatusFilter('all')
            }}
            className="px-3.5 py-1.5 rounded-xl bg-sand hover:bg-line text-charcoal text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  )
}

export default function EditTimetablePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-muted space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-700" />
          <p className="text-xs">Loading Timetable Management System...</p>
        </div>
      }
    >
      <EditTimetableContent />
    </Suspense>
  )
}
