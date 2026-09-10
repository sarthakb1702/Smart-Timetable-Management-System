'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Calendar,
  Layers,
  Users,
  Settings,
  BookOpen,
  Building,
  GraduationCap,
  Sparkles,
  Edit3,
  CheckSquare,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Clock,
  ShieldAlert,
  Sliders,
  CheckCircle2,
} from 'lucide-react'
import { DepartmentProvider, useDepartment } from '../../context/DepartmentContext'
import { getRoleDisplayName, UserRole } from '../../lib/role-guards'
import { createClient } from '../../lib/supabase/client'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  roles: UserRole[]
}

const ALL_NAV_ITEMS: NavItem[] = [
  // Superadmin
  { name: 'College Settings', href: '/superadmin/settings', icon: Settings, roles: ['superadmin'] },
  { name: 'User Management', href: '/superadmin/users', icon: Users, roles: ['superadmin'] },
  { name: 'MDM Courses', href: '/superadmin/mdm-courses', icon: BookOpen, roles: ['superadmin'] },

  // College Coordinator
  { name: 'Global Overview', href: '/college-coordinator/global-overview', icon: Layers, roles: ['superadmin', 'college_coordinator'] },
  { name: 'MDM Central Slots', href: '/college-coordinator/mdm-slots', icon: Clock, roles: ['superadmin', 'college_coordinator'] },
  { name: 'Shared Labs & Rooms', href: '/college-coordinator/shared-resources', icon: Building, roles: ['superadmin', 'college_coordinator'] },

  // Dept Coordinator & HOD
  { name: 'Generate Timetable', href: '/dept/generate', icon: Sparkles, roles: ['superadmin', 'college_coordinator', 'hod', 'dept_coordinator'] },
  { name: 'Interactive Grid Edit', href: '/dept/edit', icon: Edit3, roles: ['superadmin', 'college_coordinator', 'hod', 'dept_coordinator'] },
  { name: 'Approval Workflows', href: '/dept/approve', icon: CheckSquare, roles: ['superadmin', 'college_coordinator', 'hod', 'dept_coordinator'] },
  { name: 'Department Rooms', href: '/dept/resources', icon: Building, roles: ['superadmin', 'college_coordinator', 'hod', 'dept_coordinator'] },
  { name: 'Core Courses', href: '/dept/courses', icon: BookOpen, roles: ['superadmin', 'college_coordinator', 'hod', 'dept_coordinator'] },
  { name: 'Faculty Directory', href: '/dept/faculty', roles: ['superadmin', 'college_coordinator', 'hod', 'dept_coordinator'], icon: Users },
  { name: 'Divisions & Batches', href: '/dept/divisions', roles: ['superadmin', 'college_coordinator', 'hod', 'dept_coordinator'], icon: Layers },
  { name: 'Program Electives', href: '/dept/electives', roles: ['superadmin', 'college_coordinator', 'hod', 'dept_coordinator'], icon: Sliders },

  // Faculty
  { name: 'My Teaching Schedule', href: '/faculty/timetable', icon: Calendar, roles: ['superadmin', 'college_coordinator', 'hod', 'dept_coordinator', 'faculty'] },

  // Student
  { name: 'Division Timetable', href: '/student/timetable', icon: Calendar, roles: ['student', 'superadmin'] },
  { name: 'Elective Selection (PE)', href: '/student/pe-selection', icon: GraduationCap, roles: ['student', 'superadmin'] },
]

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false)

  const {
    departments,
    selectedDepartment,
    setSelectedDepartment,
    isGlobalUser,
    userRole,
  } = useDepartment()

  const activeRole: UserRole = userRole || 'superadmin'

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(activeRole)
  )

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Toggle Navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent block leading-tight">
                Smart Timetable
              </span>
              <span className="text-[10px] font-medium tracking-wider uppercase text-indigo-400">
                AI Scheduling System
              </span>
            </div>
          </Link>
        </div>

        {/* Dynamic Department Picker & Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Term Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AY 2026-27 • Term 1 (Odd)</span>
          </div>

          {/* Department Picker Dropdown */}
          <div className="relative">
            {isGlobalUser ? (
              <div>
                <button
                  onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 hover:border-indigo-400/60 text-xs sm:text-sm font-semibold text-indigo-200 transition-all duration-150"
                  id="department-picker-button"
                >
                  <Building className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="max-w-[140px] sm:max-w-[200px] truncate">
                    {selectedDepartment ? selectedDepartment.name : 'Select Department'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                </button>

                {deptDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Select Active Department
                    </div>
                    {departments.map((dept) => (
                      <button
                        key={dept.id}
                        onClick={() => {
                          setSelectedDepartment(dept)
                          setDeptDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          selectedDepartment?.id === dept.id
                            ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{dept.name}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 ml-2">
                          {dept.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-200">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span className="max-w-[180px] truncate">
                  {selectedDepartment ? selectedDepartment.name : 'My Department'}
                </span>
              </div>
            )}
          </div>

          {/* User Role Badge */}
          <div className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {getRoleDisplayName(activeRole)}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
            title="Sign Out"
            id="signout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 pt-16 z-30 w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-0 max-lg:-translate-x-full'
          }`}
        >
          <div className="p-3 border-b border-slate-800/60">
            <div className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300">
                {activeRole[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  Authenticated User
                </div>
                <div className="text-[10px] text-slate-400 truncate capitalize">
                  {activeRole.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-slate-800/80">
            <div className="px-3 py-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-[11px] text-emerald-300">OR-Tools Solver Online</div>
            </div>
          </div>
        </aside>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DepartmentProvider>
      <DashboardContent>{children}</DashboardContent>
    </DepartmentProvider>
  )
}
