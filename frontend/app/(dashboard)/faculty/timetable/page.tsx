'use client'

import React, { useState, useEffect } from 'react'
import { GridView, GridSlotItem } from '../../../../components/timetable/GridView'
import { UserCheck, Clock, BookOpen } from 'lucide-react'
import { api } from '../../../../lib/api'
import { useAuth } from '../../../../context/AuthContext'

// Removed FACULTY_SCHEDULE_SLOTS

export default function FacultyTimetablePage() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<GridSlotItem[]>([])
  const [activeTermId, setActiveTermId] = useState('')

  useEffect(() => {
    if (user?.user_id) {
      api.get<any[]>('/settings/academic-terms').then(terms => {
        const activeTerm = terms.find(t => t.is_current) || terms[0]
        if (activeTerm) {
          setActiveTermId(activeTerm.id)
          // Fetch slots for this faculty
          api.get<any[]>(`/timetable?term_id=${activeTerm.id}&faculty_id=${user.user_id}`)
            .then(data => {
              const mapped: GridSlotItem[] = (data as any[]).map(s => ({
                id: s.id,
                day_of_week: s.day_of_week,
                start_time: s.start_time,
                end_time: s.end_time,
                session_type: s.session_type,
                course_code: s.courses?.code || s.source_type || '',
                course_name: s.courses?.name || '',
                faculty_name: s.users?.full_name || user.email || '',
                room_code: s.rooms?.name || s.rooms?.code || 'Classroom',
                division_name: s.divisions?.name || s.division_name || 'N/A',
                batch_name: s.batch_id ? 'B' : undefined
              }))
              setSlots(mapped)
            }).catch(console.error)
        }
      }).catch(console.error)
    }
  }, [user])

  return (
    <div className="space-y-6">
      {/* Faculty Summary Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-tint/60 to-sand border border-line shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-tint border border-brand/40 flex items-center justify-center font-bold text-lg text-brand-700">
            AS
          </div>
          <div>
            <h1 className="text-lg font-bold text-charcoal tracking-tight">
              {user?.email || 'Faculty'} — Personal Teaching Schedule
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Department of Computer Engineering • AY 2026-2027 Odd Term
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3.5 py-2 rounded-xl bg-white border border-line/80 text-center">
            <div className="text-[10px] text-muted font-medium uppercase">Weekly Workload</div>
            <div className="text-sm font-bold text-brand-700 font-mono">11 / 16 Hours</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-white border border-line/80 text-center">
            <div className="text-[10px] text-muted font-medium uppercase">Total Sessions</div>
            <div className="text-sm font-bold text-success-700 font-mono">{slots.length} Sessions</div>
          </div>
        </div>
      </div>

      {/* Weekly Grid View */}
      <GridView
        slots={slots}
        title="Faculty Weekly Timetable"
        subtitle="Individual assigned theory lectures and laboratory sessions"
        showFilters={false}
      />
    </div>
  )
}
