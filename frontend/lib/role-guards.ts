export type UserRole =
  | 'superadmin'
  | 'college_tt_coordinator'
  | 'hod'
  | 'dept_tt_coordinator'
  | 'faculty'
  | 'student'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id?: string | null
  phone?: string | null
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 100,
  college_tt_coordinator: 80,
  hod: 60,
  dept_tt_coordinator: 50,
  faculty: 30,
  student: 10,
}

export const ROUTE_PERMISSIONS: { pathPrefix: string; allowedRoles: UserRole[] }[] = [
  {
    pathPrefix: '/superadmin',
    allowedRoles: ['superadmin'],
  },
  {
    pathPrefix: '/college-tt-coordinator',
    allowedRoles: ['superadmin', 'college_tt_coordinator'],
  },
  {
    pathPrefix: '/dept-tt-coordinator',
    allowedRoles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator'],
  },
  {
    pathPrefix: '/hod',
    allowedRoles: ['superadmin', 'college_tt_coordinator', 'hod'],
  },
  {
    pathPrefix: '/faculty',
    allowedRoles: ['superadmin', 'college_tt_coordinator', 'hod', 'dept_tt_coordinator', 'faculty'],
  },
  {
    pathPrefix: '/student',
    allowedRoles: ['student', 'superadmin'],
  },
]

export function canAccessRoute(role: UserRole | null | undefined, pathname: string): boolean {
  if (!role) return false

  // Find most specific route rule matching pathname
  const matchingRule = ROUTE_PERMISSIONS.find((rule) =>
    pathname.startsWith(rule.pathPrefix)
  )

  if (!matchingRule) {
    // If no explicit prefix rule, allow authenticated dashboard root
    return pathname.startsWith('/dashboard') || pathname === '/'
  }

  return matchingRule.allowedRoles.includes(role)
}

export function getDefaultDashboardRoute(role: UserRole): string {
  switch (role) {
    case 'superadmin':
      return '/superadmin/settings'
    case 'college_tt_coordinator':
      return '/college-tt-coordinator/global-overview'
    case 'hod':
    case 'dept_tt_coordinator':
      return '/dept-tt-coordinator/generate'
    case 'faculty':
      return '/faculty/timetable'
    case 'student':
      return '/student/timetable'
    default:
      return '/login'
  }
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'superadmin':
      return 'Super Administrator'
    case 'college_tt_coordinator':
      return 'College TT Coordinator'
    case 'hod':
      return 'Head of Department (HOD)'
    case 'dept_tt_coordinator':
      return 'Dept TT Coordinator'
    case 'faculty':
      return 'Faculty Member'
    case 'student':
      return 'Student'
    default:
      return 'User'
  }
}

export function isGlobalCoordinator(role?: UserRole | null): boolean {
  return role === 'superadmin' || role === 'college_tt_coordinator'
}

export function isDepartmentAdmin(role?: UserRole | null): boolean {
  return role === 'hod' || role === 'dept_tt_coordinator'
}
