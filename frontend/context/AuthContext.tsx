'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '../lib/supabase/client'

export interface AuthUser {
  user_id: string
  email: string
  role?: string | null
  department_id?: string | null
  division_id?: string | null
  full_name?: string | null
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function loadUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser && !cancelled) {
          const { data: profile } = await (supabase as any)
            .from('users')
            .select('role, department_id, division_id, full_name')
            .eq('id', authUser.id)
            .maybeSingle()

          setUser({
            user_id: authUser.id,
            email: authUser.email || '',
            role: profile?.role ?? null,
            department_id: profile?.department_id ?? null,
            division_id: profile?.division_id ?? null,
            full_name: profile?.full_name ?? authUser.email?.split('@')[0] ?? null,
          })
        }
      } catch {
        // Leave user as null when not authenticated / backend unavailable.
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
  }, [])

  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
