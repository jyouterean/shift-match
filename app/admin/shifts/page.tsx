'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminShiftsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/shifts/calendar')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">カレンダーに移動中...</p>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
