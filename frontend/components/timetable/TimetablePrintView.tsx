'use client'

import React from 'react'
import { DAYS, TIME_SLOTS, DragSlotItem } from './DragDropGrid'

interface TimetablePrintViewProps {
  slots: DragSlotItem[]
  divisionName: string
  departmentName: string
  termName: string
  yearLabel: string
  studentCount?: number
  batchCount?: number
  classTeacher?: string | null
}

const SESSION_STYLES: Record<
  string,
  { bg: string; border: string; accent: string; label: string }
> = {
  theory: { bg: '#EFF6FF', border: '#BFDBFE', accent: '#1D4ED8', label: 'TH' },
  lab: { bg: '#ECFDF5', border: '#A7F3D0', accent: '#047857', label: 'LAB' },
  mdm: { bg: '#FFFBEB', border: '#FDE68A', accent: '#B45309', label: 'MDM' },
  pe: { bg: '#FFFBEB', border: '#FDE68A', accent: '#B45309', label: 'PE' },
}

function styleFor(slot: DragSlotItem) {
  if (slot.source_type === 'mdm') return SESSION_STYLES.mdm
  if (slot.source_type === 'pe') return SESSION_STYLES.pe
  if (slot.session_type === 'lab') return SESSION_STYLES.lab
  return SESSION_STYLES.theory
}

const GRID_LINE = '#D1D5DB'

interface CellData {
  slots: DragSlotItem[]
  span: number
  skip: boolean
}

export function TimetablePrintView({
  slots,
  divisionName,
  departmentName,
  termName,
  yearLabel,
  studentCount,
  batchCount,
  classTeacher,
}: TimetablePrintViewProps) {
  const generatedOn = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const rowSlots = TIME_SLOTS.filter((s) => s.start !== '12:00:00')

  // Build per-day columns, computing row spans so 2-hour labs occupy a single
  // merged cell instead of being duplicated across two hourly rows.
  const dayColumns: CellData[][] = DAYS.map((day) => {
    const cells: CellData[] = []
    for (let i = 0; i < rowSlots.length; i++) {
      if (cells[i]?.skip) continue
      const rowStart = rowSlots[i].start
      const starting = slots.filter(
        (s) => s.day_of_week === day.id && s.start_time === rowStart
      )
      if (starting.length === 0) {
        cells[i] = { slots: [], span: 1, skip: false }
        continue
      }
      let span = 1
      for (const slot of starting) {
        for (let j = i + 1; j < rowSlots.length; j++) {
          if (rowSlots[j].start < slot.end_time) span = Math.max(span, j - i + 1)
          else break
        }
      }
      cells[i] = { slots: starting, span, skip: false }
      for (let k = i + 1; k < i + span; k++) cells[k] = { slots: [], span: 0, skip: true }
    }
    return cells
  })

  // Row descriptor list including the lunch break row.
  type Row = { kind: 'lunch' } | { kind: 'slots'; label: string; rowIdx: number }
  const rows: Row[] = []
  let rIdx = 0
  TIME_SLOTS.forEach((tSlot) => {
    if (tSlot.start === '12:00:00') {
      rows.push({ kind: 'lunch' })
    } else {
      rows.push({ kind: 'slots', label: tSlot.label, rowIdx: rIdx })
      rIdx++
    }
  })

  const timeCellStyle: React.CSSProperties = {
    border: `1px solid ${GRID_LINE}`,
    background: '#F9FAFB',
    padding: '8px 6px',
    textAlign: 'center',
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#374151',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  }

  return (
    <div
      style={{
        width: '1120px',
        background: '#FFFFFF',
        color: '#222222',
        padding: '28px 32px 24px',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
      }}
    >
      {/* Title block */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '16px',
          borderBottom: '3px solid #FA8112',
          paddingBottom: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '0.02em', color: '#222222' }}>
            CLASS TIMETABLE
          </div>
          <div style={{ fontSize: '14px', color: '#6B665E', marginTop: '3px', fontWeight: 600 }}>
            {departmentName}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#6B665E', lineHeight: 1.5 }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#222222' }}>{divisionName}</div>
          <div>
            {termName} &nbsp;•&nbsp; {yearLabel}
          </div>
          <div>
            {typeof studentCount === 'number' ? `${studentCount} Students` : ''}
            {typeof studentCount === 'number' && typeof batchCount === 'number' ? ' • ' : ''}
            {typeof batchCount === 'number' ? `${batchCount} Batches` : ''}
          </div>
          {classTeacher ? <div>Class Teacher: {classTeacher}</div> : null}
        </div>
      </div>

      {/* Timetable grid */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          border: `1px solid ${GRID_LINE}`,
        }}
      >
        <colgroup>
          <col style={{ width: '104px' }} />
          {DAYS.map((d) => (
            <col key={d.id} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              style={{
                background: '#F3F4F6',
                border: `1px solid ${GRID_LINE}`,
                padding: '9px 6px',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#374151',
              }}
            >
              Time
            </th>
            {DAYS.map((day) => (
              <th
                key={day.id}
                style={{
                  background: '#F3F4F6',
                  border: `1px solid ${GRID_LINE}`,
                  padding: '9px 6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.03em',
                  color: '#222222',
                }}
              >
                {day.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowKey) => {
            if (row.kind === 'lunch') {
              return (
                <tr key={`lunch-${rowKey}`}>
                  <td style={timeCellStyle}>12:00 - 13:00</td>
                  <td
                    colSpan={DAYS.length}
                    style={{
                      border: `1px solid ${GRID_LINE}`,
                      background: '#F9FAFB',
                      padding: '8px 6px',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.35em',
                      textTransform: 'uppercase',
                      color: '#6B665E',
                    }}
                  >
                    Lunch Break
                  </td>
                </tr>
              )
            }

            return (
              <tr key={row.label}>
                <td style={timeCellStyle}>{row.label}</td>
                {DAYS.map((day, di) => {
                  const cell = dayColumns[di][row.rowIdx]
                  if (!cell || cell.skip) return null
                  return (
                    <td
                      key={day.id}
                      rowSpan={cell.span > 1 ? cell.span : undefined}
                      style={{
                        border: `1px solid ${GRID_LINE}`,
                        padding: '5px',
                        verticalAlign: 'top',
                        height: cell.span > 1 ? `${cell.span * 70}px` : '70px',
                      }}
                    >
                      {cell.slots.map((slot) => {
                        const st = styleFor(slot)
                        return (
                          <div
                            key={slot.id}
                            style={{
                              background: st.bg,
                              border: `1px solid ${st.border}`,
                              borderLeft: `3px solid ${st.accent}`,
                              borderRadius: '5px',
                              padding: '5px 6px',
                              marginBottom: '4px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#222222' }}>
                                {slot.course_code || slot.course_name || slot.session_type.toUpperCase()}
                              </span>
                              <span style={{ fontSize: '9px', fontWeight: 800, color: st.accent }}>
                                {st.label}
                              </span>
                            </div>
                            {slot.course_name && slot.course_code ? (
                              <div style={{ fontSize: '9.5px', color: '#6B665E', marginTop: '1px' }}>
                                {slot.course_name}
                              </div>
                            ) : null}
                            <div
                              style={{
                                marginTop: '3px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '4px',
                                fontSize: '9.5px',
                                color: '#6B665E',
                              }}
                            >
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {slot.faculty_name || '—'}
                              </span>
                              <span style={{ fontWeight: 700, color: '#222222', whiteSpace: 'nowrap' }}>
                                {slot.room_code || '—'}
                              </span>
                            </div>
                            {slot.batch_name ? (
                              <div style={{ fontSize: '9px', fontWeight: 700, color: '#047857', marginTop: '1px' }}>
                                [{slot.batch_name}]
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legend / footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '14px',
          fontSize: '10.5px',
          color: '#6B665E',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {[
            { text: 'Theory', style: SESSION_STYLES.theory },
            { text: 'Lab / Practical', style: SESSION_STYLES.lab },
            { text: 'MDM / Elective', style: SESSION_STYLES.mdm },
          ].map((item) => (
            <span key={item.text} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  background: item.style.bg,
                  border: `1px solid ${item.style.border}`,
                  borderLeft: `3px solid ${item.style.accent}`,
                }}
              />
              {item.text}
            </span>
          ))}
        </div>
        <span>Generated on {generatedOn} • Smart Timetable Management System</span>
      </div>
    </div>
  )
}

export default TimetablePrintView
