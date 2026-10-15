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
  Sliders,
  BarChart3,
  Bell,
  CheckCircle2,
} from 'lucide-react'
import { DepartmentProvider, useDepartment } from '@/context/DepartmentContext'
import { AuthProvider } from '@/context/AuthContext'
import { getRoleDisplayName, UserRole } from '@/lib/role-guards'
import { createClient } from '@/utils/supabase/client'

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
  { name: 'Global Overview', href: '/college-tt-coordinator/global-overview', icon: Layers, roles: ['superadmin', 'college_tt_coordinator'] },
  { name: 'MDM Central Slots', href: '/college-tt-coordinator/mdm-slots', icon: Clock, roles: ['superadmin', 'college_tt_coordinator'] },
  { name: 'Shared Labs & Rooms', href: '/college-tt-coordinator/shared-resources', icon: Building, roles: ['superadmin', 'college_tt_coordinator'] },

  // Dept Coordinator & HOD
  { name: 'Generate Timetable', href: '/dept-tt-coordinator/generate', icon: Sparkles, roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'] },
  { name: 'Interactive Grid Edit', href: '/dept-tt-coordinator/edit', icon: Edit3, roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'] },
  { name: 'Approval Workflows', href: '/dept-tt-coordinator/approve', icon: CheckSquare, roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'] },
  { name: 'Department Rooms', href: '/dept-tt-coordinator/resources', icon: Building, roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'] },
  { name: 'Core Courses', href: '/dept-tt-coordinator/courses', icon: BookOpen, roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'] },
  { name: 'Faculty Directory', href: '/hod/faculty', roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'], icon: Users },
  { name: 'Divisions & Batches', href: '/hod/divisions', roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'], icon: Layers },
  { name: 'Program Electives', href: '/dept-tt-coordinator/electives', roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'], icon: Sliders },
  { name: 'Reports & Analytics', href: '/hod/reports', roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'], icon: BarChart3 },

  // Faculty
  { name: 'My Teaching Schedule', href: '/faculty/timetable', icon: Calendar, roles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator', 'faculty'] },

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

  const activeRole: UserRole | null = userRole

  const visibleNavItems = activeRole
    ? ALL_NAV_ITEMS.filter((item) => item.roles.includes(activeRole))
    : []

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="h-screen bg-ivory text-charcoal flex flex-col antialiased overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="h-16 shrink-0 border-b border-line bg-white/90 backdrop-blur-md z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-muted hover:text-charcoal hover:bg-sand lg:hidden transition-colors"
            aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-sm">
              <Calendar className="w-5 h-5 text-charcoal" />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-[15px] tracking-tight text-charcoal block leading-tight">
                Smart Timetable
              </span>
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-brand-700">
                AI Scheduling System
              </span>
            </div>
          </Link>
        </div>

        {/* Department picker & controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sand border border-line text-xs font-medium text-charcoal/80">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>AY 2026-27 • Term 1 (Odd)</span>
          </div>

          <div className="relative">
            {isGlobalUser ? (
              <div>
                <button
                  onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-line hover:border-brand/50 hover:bg-sand/60 text-xs sm:text-sm font-semibold text-charcoal transition-colors"
                  id="department-picker-button"
                  aria-haspopup="menu"
                  aria-expanded={deptDropdownOpen}
                >
                  <Building className="w-4 h-4 text-brand-700 shrink-0" />
                  <span className="max-w-[130px] sm:max-w-[190px] truncate">
                    {selectedDepartment ? selectedDepartment.name : 'Select Department'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted shrink-0 transition-transform ${deptDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {deptDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDeptDropdownOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-line shadow-xl py-1.5 z-50 animate-fade-in">
                      <div className="px-3 py-1.5 border-b border-line text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Select Active Department
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {departments.map((dept) => (
                          <button
                            key={dept.id}
                            onClick={() => {
                              setSelectedDepartment(dept)
                              setDeptDropdownOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                              selectedDepartment?.id === dept.id
                                ? 'bg-tint text-brand-700 font-semibold'
                                : 'text-charcoal/90 hover:bg-sand/70'
                            }`}
                          >
                            <span className="truncate">{dept.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sand text-muted border border-line ml-2">
                              {dept.code}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand border border-line text-xs font-semibold text-charcoal">
                <Building className="w-3.5 h-3.5 text-brand-700" />
                <span className="max-w-[160px] truncate">
                  {selectedDepartment ? selectedDepartment.name : 'My Department'}
                </span>
              </div>
            )}
          </div>

          <button
            className="p-2 relative rounded-lg text-muted hover:text-charcoal hover:bg-sand transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand border border-white" />
          </button>

          <div className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-tint text-brand-700 border border-brand/25">
            {activeRole ? getRoleDisplayName(activeRole) : 'User'}
          </div>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-muted hover:text-danger-700 hover:bg-danger-50 border border-transparent hover:border-danger/20 transition-colors"
            title="Sign Out"
            id="signout-btn"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Mobile scrim */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-16 bg-charcoal/40 backdrop-blur-[2px] z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-charcoal flex flex-col transition-transform duration-200 lg:static lg:top-0 lg:bottom-auto lg:translate-x-0 lg:h-full ${
            sidebarOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'
          }`}
          aria-label="Main navigation"
        >
          <div className="p-3 border-b border-white/10">
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center font-bold text-xs text-charcoal shrink-0">
                {activeRole ? activeRole[0].toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-ivory truncate">
                  Authenticated User
                </div>
                <div className="text-[10px] text-ivory/50 truncate capitalize">
                  {activeRole ? activeRole.replace('_', ' ') : 'unknown'}
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto min-h-0 p-3 space-y-0.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-brand/15 text-ivory'
                      : 'text-ivory/60 hover:text-ivory hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-brand" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand' : 'text-ivory/50'}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-white/10">
            <div className="px-3 py-2 rounded-lg bg-success/10 border border-success/25 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success-200 shrink-0" />
              <div className="text-[11px] text-success-200">OR-Tools Solver Online</div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-ivory p-4 sm:p-6 lg:p-8">          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DepartmentProvider>
        <DashboardContent>{children}</DashboardContent>
      </DepartmentProvider>
    </AuthProvider>
  )
}
