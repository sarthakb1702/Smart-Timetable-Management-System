'use client'

import React, { useState, useEffect } from 'react'
import { api } from '../../../../lib/api'
import { useDepartment } from '../../../../context/DepartmentContext'
import { BarChart3, Users, Building2, BookOpen } from 'lucide-react'
import { StatCard } from '../../../../components/ui/StatCard'

export default function ReportsPage() {
  const { selectedDepartment } = useDepartment()
  const [stats, setStats] = useState({
    totalSlots: 0,
    clashingSlots: 0,
    facultyLoad: 0,
    roomUtilization: 0
  })

  useEffect(() => {
    if (selectedDepartment) {
      api.get<any[]>('/settings/academic-terms').then(terms => {
        const activeTerm = terms.find(t => t.is_active) || terms[0]
        if (activeTerm) {
          api.get<any[]>(`/timetable?term_id=${activeTerm.id}&department_id=${selectedDepartment.id}`)
            .then(data => {
              // Compute real analytics
              let clashing = 0
              const slotsArr = data as any[]
              // Detect simple overlaps: same room same day overlapping times
              for (let i = 0; i < slotsArr.length; i++) {
                const a = slotsArr[i]
                for (let j = i + 1; j < slotsArr.length; j++) {
                  const b = slotsArr[j]
                  if (a.day_of_week !== b.day_of_week) continue
                  if (a.room_id !== b.room_id || !a.room_id || !b.room_id) continue
                  if (a.start_time < b.end_time && b.start_time < a.end_time) {
                    clashing++
                    break
                  }
                }
              }
              const facultyGroups = new Map<string, number>()
              for (const s of slotsArr) {
                if (!s.faculty_id) continue
                const t1 = new Date(`1970-01-01T${s.start_time}`)
                const t2 = new Date(`1970-01-01T${s.end_time}`)
                const dur = (t2.getTime() - t1.getTime()) / 3600000
                facultyGroups.set(s.faculty_id, (facultyGroups.get(s.faculty_id) || 0) + dur)
              }
              const loads = Array.from(facultyGroups.values())
              const avgLoad = loads.length ? Math.round((loads.reduce((x, y) => x + y, 0) / loads.length) * 10) / 10 : 0
              const roomGroups = new Map<string, number>()
              for (const s of slotsArr) {
                if (!s.room_id) continue
                const t1 = new Date(`1970-01-01T${s.start_time}`)
                const t2 = new Date(`1970-01-01T${s.end_time}`)
                const dur = (t2.getTime() - t1.getTime()) / 3600000
                roomGroups.set(s.room_id, (roomGroups.get(s.room_id) || 0) + dur)
              }
              const roomLoads = Array.from(roomGroups.values())
              const totalRoomHrs = roomLoads.reduce((x, y) => x + y, 0)
              const utilization = totalRoomHrs > 0 ? Math.round((totalRoomHrs / (30 * 8)) * 100) : 0
              setStats({
                totalSlots: data.length,
                clashingSlots: clashing,
                facultyLoad: Number(avgLoad),
                roomUtilization: Math.max(0, Math.min(100, utilization))
              })
            }).catch(console.error)
        }
      }).catch(console.error)
    }
  }, [selectedDepartment])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Department Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Insights on resource utilization and workload distribution
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scheduled Slots"
          value={stats.totalSlots.toString()}
          subtitle="Across all divisions"
          icon={BookOpen}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Detected Clashes"
          value={stats.clashingSlots.toString()}
          subtitle="Requires attention"
          icon={BarChart3}
          iconColor={stats.clashingSlots === 0 ? "text-emerald-400" : "text-rose-400"}
        />
        <StatCard
          title="Avg Faculty Load"
          value={`${stats.facultyLoad} hrs/wk`}
          subtitle="Across active faculty"
          icon={Users}
          iconColor="text-amber-400"
        />
        <StatCard
          title="Room Utilization"
          value={`${stats.roomUtilization}%`}
          subtitle="Peak operational capacity"
          icon={Building2}
          iconColor="text-emerald-400"
        />
      </div>
      
      <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
        <p>Detailed charts and analytics views will be rendered here.</p>
      </div>
    </div>
  )
}
