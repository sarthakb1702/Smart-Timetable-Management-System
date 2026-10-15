'use client'

import { useCallback, useEffect, useState } from 'react'
import { Zap, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { API_V1 } from '@/lib/api'

interface UserRecord {
  role: string
}

interface DemoAccount {
  email: string
  full_name: string
  role: string
  role_label: string
  department_name: string | null
}

const ROLE_HOME: Record<string, string> = {
  superadmin: '/superadmin/users',
  college_tt_coordinator: '/college-tt-coordinator/global-overview',
  dept_tt_coordinator: '/dept-tt-coordinator/courses',
  hod: '/hod/faculty',
  faculty: '/faculty/timetable',
  student: '/student/timetable',
}

const ROLE_BADGE: Record<string, string> = {
  superadmin: 'bg-purple-950/70 text-purple-300 border-purple-500/30',
  college_tt_coordinator: 'bg-indigo-950/70 text-indigo-300 border-indigo-500/30',
  hod: 'bg-amber-950/70 text-amber-300 border-amber-500/30',
  dept_tt_coordinator: 'bg-sky-950/70 text-sky-300 border-sky-500/30',
  faculty: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30',
  student: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<DemoAccount[]>([])
  const [showQuickLogin, setShowQuickLogin] = useState(true)
  const [quickLoginLoadingEmail, setQuickLoginLoadingEmail] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return

    let cancelled = false

    async function loadDemoAccounts() {
      try {
        const res = await fetch(`${API_V1}/auth/demo-accounts`)
        if (!res.ok) return
        const data = (await res.json()) as DemoAccount[]
        if (!cancelled && Array.isArray(data)) setAccounts(data)
      } catch {
        // Backend not running — quick login simply stays hidden.
      }
    }

    loadDemoAccounts()
    return () => {
      cancelled = true
    }
  }, [])

  const completeLogin = useCallback(
    async (userId: string) => {
      const { data, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (userError) {
        throw new Error('Failed to fetch user role. Please contact admin.')
      }

      const role = (data as unknown as UserRecord | null)?.role

      if (!role) {
        throw new Error('User role not configured. Please contact admin.')
      }

      await supabase.auth.getSession()

      // Small delay to allow Supabase to flush auth cookies to document.cookie
      setTimeout(() => {
        window.location.href = ROLE_HOME[role] ?? '/'
      }, 1000)
    },
    [supabase]
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Login failed. No user record returned.')
        setLoading(false)
        return
      }

      setLoading(false)
      await completeLogin(authData.user.id)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  const handleQuickLogin = async (account: DemoAccount) => {
    setError(null)
    setEmail(account.email)
    setQuickLoginLoadingEmail(account.email)

    try {
      // 1. Request dev login token from backend
      const res = await fetch(`${API_V1}/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to authenticate via quick dev login.')
      }

      const { hashed_token, verification_type } = (await res.json()) as {
        hashed_token: string
        verification_type: string
      }

      // 2. Verify token with Supabase client to establish real browser session
      const { data: authData, error: authError } = await supabase.auth.verifyOtp({
        token_hash: hashed_token,
        type: (verification_type as any) || 'magiclink',
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Quick login failed. No user record returned.')
      }

      // 3. Complete login and redirect to appropriate role dashboard
      await completeLogin(authData.user.id)
    } catch (err: any) {
      console.error('Quick login error:', err)
      setError(err.message || 'Quick login failed. Please sign in with password.')
      setQuickLoginLoadingEmail(null)
    }
  }

  const grouped = accounts.reduce<Record<string, DemoAccount[]>>((acc, account) => {
    ;(acc[account.role] ||= []).push(account)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-[#090D16] text-white p-4 py-10">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="bg-[#111726] p-8 rounded-2xl border border-gray-800 shadow-2xl space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-white">Smart Timetable System</h1>
            <p className="text-sm text-gray-400">Sign in with institutional credentials</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase text-gray-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordinator@test.com"
                className="w-full px-4 py-2.5 bg-[#0B0F19] border border-gray-800 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#0B0F19] border border-gray-800 rounded-lg focus:outline-none focus:border-indigo-500 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!quickLoginLoadingEmail}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>
        </div>

        {accounts.length > 0 && (
          <div className="bg-[#111726] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowQuickLogin((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                <Zap className="w-4 h-4 text-amber-400" />
                Quick Login (Dev)
                <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30">
                  {accounts.length}
                </span>
              </span>
              {showQuickLogin ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {showQuickLogin && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-800 pt-4">
                <p className="text-[11px] text-gray-500 text-center">
                  Click any account below for instant 1-click dev login.
                </p>

                {Object.entries(grouped).map(([role, list]) => (
                  <div key={role} className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {list[0].role_label}
                    </p>
                    <div className="space-y-1.5">
                      {list.map((account) => {
                        const isCurrentLoading = quickLoginLoadingEmail === account.email
                        return (
                          <button
                            key={account.email}
                            type="button"
                            onClick={() => handleQuickLogin(account)}
                            disabled={loading || !!quickLoginLoadingEmail}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all disabled:opacity-50 text-left ${
                              isCurrentLoading
                                ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50'
                                : 'bg-[#0B0F19] border-gray-800 hover:border-indigo-500/60 hover:bg-indigo-950/20'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-[11px] font-bold text-indigo-300 shrink-0">
                              {isCurrentLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                              ) : (
                                account.full_name?.[0]?.toUpperCase() || account.email[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white truncate flex items-center gap-2">
                                <span>{account.full_name || account.email}</span>
                                {isCurrentLoading && (
                                  <span className="text-[10px] text-indigo-400 animate-pulse font-normal">
                                    Logging in...
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 truncate">
                                {account.email}
                                {account.department_name
                                  ? ` · ${account.department_name}`
                                  : ''}
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0 ${
                                ROLE_BADGE[role] ?? ROLE_BADGE.student
                              }`}
                            >
                              {account.role_label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}