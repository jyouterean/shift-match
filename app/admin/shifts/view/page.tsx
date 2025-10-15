'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdminNav from '@/components/admin-nav'
import { Calendar, Users, Building2, Clock } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
}

interface Office {
  id: string
  name: string
}

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  notes?: string
  user: User
  office: Office
}

export default function ViewShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const fetchShifts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/shifts')
      const data = await response.json()
      if (response.ok) {
        setShifts(data.shifts)
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      router.push('/staff/dashboard')
      return
    }

    fetchShifts()
  }, [session, status, router, fetchShifts])

  const filteredShifts = shifts.filter(shift => 
    shift.date.startsWith(selectedMonth) && shift.status === 'APPROVED'
  )

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            確定シフト一覧
          </h1>
          <p className="text-sm sm:text-base text-gray-600">承認済みのシフトを閲覧できます</p>
        </div>

        {/* 月選択 */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">表示月:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <span className="text-sm text-gray-600">
                {filteredShifts.length}件のシフト
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {filteredShifts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>選択した月に確定したシフトはありません</p>
              </CardContent>
            </Card>
          ) : (
            filteredShifts.map((shift) => (
              <Card key={shift.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-900">
                          {new Date(shift.date + 'T00:00:00').toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </h3>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{shift.user.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{shift.office.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{shift.startTime} - {shift.endTime}</span>
                        </div>
                        {shift.notes && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            📝 {shift.notes}
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          確定済み
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

