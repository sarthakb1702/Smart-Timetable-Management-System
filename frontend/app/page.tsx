'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
      Redirecting to Smart Timetable Portal...
    </div>
  )
}
