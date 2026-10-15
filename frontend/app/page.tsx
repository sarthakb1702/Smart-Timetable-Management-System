'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center text-muted text-xs font-mono">
      Redirecting to Smart Timetable Portal...
    </div>
  )
}
