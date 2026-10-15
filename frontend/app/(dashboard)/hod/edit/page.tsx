'use client'

import React, { useState } from 'react'
import { DragDropGrid, DragSlotItem } from '../../../../components/timetable/DragDropGrid'
import { useDepartment } from '../../../../context/DepartmentContext'
import { Layers, Send } from 'lucide-react'
import { api, ApiError } from '../../../../lib/api'

export default function EditTimetablePage() {
  const { selectedDepartment } = useDepartment()
  const [activeDivision, setActiveDivision] = useState('')
  const [divisions, setDivisions] = useState<any[]>([])
  const [slots, setSlots] = useState<DragSlotItem[]>([])
  const [activeTermId, setActiveTermId] = useState('')

  React.useEffect(() => {
    if (selectedDepartment) {
      Promise.all([
        api.get<any[]>('/settings/academic-terms'),
        api.get<any[]>(`/divisions?department_id=${selectedDepartment.id}`),
      ])
        .then(([terms, divs]) => {
          const activeTerm = terms.find((t) => t.is_current) || terms[0]
          if (activeTerm) setActiveTermId(activeTerm.id)
          setDivisions(divs)
          if (divs.length > 0) setActiveDivision(divs[0].id)
        })
        .catch((err) => console.error(err))
    }
  }, [selectedDepartment])

  React.useEffect(() => {
    if (activeTermId && selectedDepartment && activeDivision) {
      api
        .get<any[]>(
          `/timetable?term_id=${activeTermId}&department_id=${selectedDepartment.id}&division_id=${activeDivision}`
        )
        .then((data) => {
          const mapped: DragSlotItem[] = data.map((s) => ({
            id: s.id,
            term_id: s.term_id,
            division_id: s.division_id,
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
            room_code: s.rooms?.code,
            is_locked: !!s.is_locked,
          }))
          setSlots(mapped)
        })
        .catch((err) => console.error(err))
    }
  }, [activeTermId, selectedDepartment, activeDivision])

  const handleSubmitReview = async () => {
    if (confirm('Submit this timetable for HOD approval?')) {
      try {
        await api.post('/timetable/approvals/submit', {
          term_id: activeTermId,
          department_id: selectedDepartment?.id,
        })
        alert('Submitted for approval!')
      } catch (err) {
        alert(err instanceof ApiError ? err.message : 'Error submitting')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-charcoal">
            Interactive Drag &amp; Drop Timetable Editor
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Department of {selectedDepartment?.name || 'Computer Engineering'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-line rounded-xl px-3 py-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-brand-700" />
            <span className="text-muted font-medium">Division:</span>
            <select
              value={activeDivision}
              onChange={(e) => setActiveDivision(e.target.value)}
              className="bg-transparent text-charcoal font-semibold focus:outline-none text-xs"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id} className="bg-white">
                  {d.name} (Year {d.year_level})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSubmitReview}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand hover:bg-brand-600 text-charcoal font-semibold text-xs tracking-wide shadow-md shadow-charcoal/15 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit for Review</span>
          </button>
        </div>
      </div>

      {slots.length > 0 ? (
        <DragDropGrid initialSlots={slots} />
      ) : (
        <div className="p-8 text-center text-muted">
          No timetable slots found for this division. Run the generator first.
        </div>
      )}
    </div>
  )
}
