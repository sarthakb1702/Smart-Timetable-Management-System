'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '../lib/supabase/client'
import { UserRole, isGlobalCoordinator } from '../lib/role-guards'

export interface Department {
  id: string
  name: string
  code: string
}

interface DepartmentContextType {
  departments: Department[]
  selectedDepartment: Department | null
  setSelectedDepartment: (dept: Department | null) => void
  isGlobalUser: boolean
  isLoading: boolean
  userRole: UserRole | null
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined)

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-cs-1', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: 'dept-it-2', name: 'Information Technology', code: 'IT' },
  { id: 'dept-ece-3', name: 'Electronics & Communication', code: 'ECE' },
  { id: 'dept-mech-4', name: 'Mechanical Engineering', code: 'MECH' },
  { id: 'dept-civil-5', name: 'Civil Engineering', code: 'CIVIL' },
]

export const DepartmentProvider = ({ children }: { children: ReactNode }) => {
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(DEFAULT_DEPARTMENTS[0])
  const [isGlobalUser, setIsGlobalUser] = useState<boolean>(true)
  const [userRole, setUserRole] = useState<UserRole | null>('superadmin')
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function initContext() {
      setIsLoading(true)
      const supabase = createClient()

      try {
        // 1. Get current auth user
        const { data: { user } } = await supabase.auth.getUser()

        let currentRole: UserRole = 'superadmin'
        let userDeptId: string | null = null

        if (user) {
          const { data: profile } = await (supabase as any)
            .from('users')
            .select('role, department_id')
            .eq('id', user.id)
            .single()

          if (profile) {
            currentRole = (profile.role as UserRole) || 'student'
            userDeptId = profile.department_id || null
          }
        }

        setUserRole(currentRole)
        const global = isGlobalCoordinator(currentRole)
        setIsGlobalUser(global)

        // 2. Fetch all departments
        const { data: deptData, error } = await (supabase as any)
          .from('departments')
          .select('id, name, code')
          .order('name')

        let loadedDepts = DEFAULT_DEPARTMENTS
        if (!error && deptData && deptData.length > 0) {
          loadedDepts = deptData
          setDepartments(loadedDepts)
        }

        // 3. Assign selected department
        if (global) {
          // If global coordinator, remember saved preference from localStorage or default to first
          const savedId = typeof window !== 'undefined' ? localStorage.getItem('selected_dept_id') : null
          const matched = loadedDepts.find((d) => d.id === savedId) || loadedDepts[0]
          setSelectedDepartment(matched)
        } else if (userDeptId) {
          // Scoped departmental user: lock to their assigned department
          const assigned = loadedDepts.find((d) => d.id === userDeptId) || loadedDepts[0]
          setSelectedDepartment(assigned)
        } else {
          setSelectedDepartment(loadedDepts[0])
        }
      } catch (err) {
        console.warn('DepartmentContext: Using fallback offline defaults', err)
      } finally {
        setIsLoading(false)
      }
    }

    initContext()
  }, [])

  const handleSelectDepartment = (dept: Department | null) => {
    // Only allow global users (superadmin / college coordinator) to change department
    if (!isGlobalUser && selectedDepartment) {
      console.warn('Department selection is locked for department-scoped users.')
      return
    }
    setSelectedDepartment(dept)
    if (dept && typeof window !== 'undefined') {
      localStorage.setItem('selected_dept_id', dept.id)
    }
  }

  return (
    <DepartmentContext.Provider
      value={{
        departments,
        selectedDepartment,
        setSelectedDepartment: handleSelectDepartment,
        isGlobalUser,
        isLoading,
        userRole,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  )
}

export function useDepartment() {
  const context = useContext(DepartmentContext)
  if (!context) {
    throw new Error('useDepartment must be used within a DepartmentProvider')
  }
  return context
}
