'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface UserRecord {
  role: string
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

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

      // 2. Fetch role safely without TypeScript 'never' errors
      const { data, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (userError) {
        console.error('Database role error:', userError)
      }

      const userData = data as unknown as UserRecord | null
      const role = userData?.role

      // 3. Ensure Session Sync Before Navigation
      await supabase.auth.getSession()

      // 4. Route destination based on role
      const targetPath =
        role === 'dept_tt_coordinator' ||
        role === 'college_tt_coordinator' ||
        role === 'superadmin'
          ? '/coordinator/dashboard'
          : '/'

      // Soft redirect to maintain app state and trigger middleware properly
      router.push(targetPath)
      router.refresh()
    } catch (err: any) {
      console.error('Login exception:', err)
      setError(err.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090D16] text-white p-4">
      <div className="w-full max-w-md space-y-6 bg-[#111726] p-8 rounded-2xl border border-gray-800 shadow-2xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-white">Smart Timetable System</h1>
          <p className="text-sm text-gray-400">Sign in with institutional credentials</p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-lg">
            {error}
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
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}