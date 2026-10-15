'use client'

import React, { useState } from 'react'
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Building,
  Users,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { api, ApiError } from '../../../../lib/api'
import { useAuth } from '../../../../context/AuthContext'

interface ElectiveOption {
  id: string
  code: string
  title: string
  instructor: string
  room: string
  capacity: number
  enrolled: number
  description: string
  topics: string[]
}

const SAMPLE_PE_OPTIONS: ElectiveOption[] = []

export default function StudentPeSelectionPage() {
  const { user } = useAuth()
  const [options, setOptions] = useState<ElectiveOption[]>([])
  const [selectedOptionId, setSelectedOptionId] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeTermId, setActiveTermId] = useState<string>('')

  React.useEffect(() => {
    // Fetch options and my selection
    Promise.all([
      api.get<any[]>('/electives/options'),
      api.get<any[]>('/electives/selections/me')
    ]).then(([opts, selections]) => {
      setOptions(opts.map(o => ({
        id: o.id,
        code: o.course_code,
        title: o.course_title,
        instructor: o.faculty_name,
        room: o.theory_room_id || 'TBD',
        capacity: o.capacity,
        enrolled: 0,
        description: 'Syllabus info not provided.',
        topics: []
      })))
      
      if (opts.length > 0) setActiveTermId(opts[0].term_id)

      if (selections.length > 0) {
        setSelectedOptionId(selections[0].elective_option_id)
        setIsSubmitted(true)
      }
    }).catch(err => console.error(err))
  }, [])

  const handleConfirmSelection = async () => {
    try {
      await api.post('/electives/selections', {
        elective_option_id: selectedOptionId,
        term_id: activeTermId || '00000000-0000-0000-0000-000000000001' // Mock term if no active options
      })
      setIsSubmitted(true)
      const selected = options.find((o) => o.id === selectedOptionId)
      setToast(
        `Successfully confirmed registration for ${selected?.title}! Your timetable schedule has been updated.`
      )
      setTimeout(() => setToast(null), 5000)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error saving selection')
    }
  }

  const activeOption = options.find((o) => o.id === selectedOptionId)

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-tint border border-brand/30 text-brand-700">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
              Program Elective (PE) Track Selection
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Student: <span className="text-brand-700 font-semibold">{user?.email}</span> • Division TE-1 (Sem 5)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isSubmitted ? 'success' : 'warning'} dot>
            {isSubmitted ? 'Registration Confirmed' : 'Selection Pending'}
          </Badge>
        </div>
      </div>

      {/* Confirmation Toast */}
      {toast && (
        <div className="p-4 rounded-xl bg-success-50 border border-success/40 text-success-700 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-success-700 shrink-0" />
          {toast}
        </div>
      )}

      {/* Status Notice */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-tint/40 via-sand/20 to-sand border border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            Synchronized Elective Window (AY 2026-27)
          </span>
          <h2 className="text-base font-bold text-charcoal tracking-tight">
            Common Time Block: Mon, Wed, Fri • 11:00 AM - 12:00 PM
          </h2>
          <p className="text-xs text-muted">
            Choose exactly one track. Your chosen track automatically populates into your weekly division timetable.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-charcoal">3 Tracks Available</div>
            <div className="text-[11px] text-muted">Limited Capacity</div>
          </div>
          <button
            onClick={handleConfirmSelection}
            disabled={!selectedOptionId}
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-semibold text-xs shadow-lg shadow-charcoal/15 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitted ? 'Update Registration' : 'Confirm Elective Choice'}
          </button>
        </div>
      </div>

      {/* Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {options.map((opt) => {
          const isSelected = selectedOptionId === opt.id
          const seatsRemaining = opt.capacity - opt.enrolled
          const isFull = seatsRemaining <= 0
          return (
            <div
              key={opt.id}
              onClick={() => !isFull && setSelectedOptionId(opt.id)}
              className={`rounded-2xl border p-5 shadow-xl transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                isSelected
                  ? 'bg-tint border-brand-600 shadow-charcoal/10 ring-1 ring-brand-700/50'
                  : 'bg-white border-line hover:border-muted/60'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-brand text-charcoal text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Selected
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sand border border-line text-muted">
                    {opt.code}
                  </span>
                  <Badge variant={seatsRemaining <= 3 ? 'danger' : 'purple'}>
                    {seatsRemaining} Seats Left
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-bold text-charcoal tracking-tight leading-snug">
                    {opt.title}
                  </h3>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-muted pt-2 border-t border-line/80">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted" />
                    <span>Instructor: <strong className="text-charcoal">{opt.instructor}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-muted" />
                    <span>Allocated Venue: <strong className="text-charcoal">{opt.room}</strong></span>
                  </div>
                </div>

                {/* Syllabus Highlights */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">
                    Syllabus Modules
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {opt.topics.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-sand/60 border border-line/60 text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-4 border-t border-line/80 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-muted">Quota: </span>
                  <span className="text-charcoal font-medium">
                    {opt.enrolled} / {opt.capacity}
                  </span>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-brand-600 bg-brand text-charcoal'
                      : 'border-line bg-sand'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
