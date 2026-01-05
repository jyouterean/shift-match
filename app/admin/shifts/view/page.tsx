'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AdminNav from '@/components/admin-nav'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, MapPin } from 'lucide-react'

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  user: {
    id: string
    name: string
  }
  office: {
    id: string
    name: string
  } | null
  route: {
    id: string
    name: string
  } | null
  status: string
}

export default function ShiftViewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const fetchShifts = useCallback(async () => {
    try {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const response = await fetch(
        `/api/admin/shifts?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}&status=CONFIRMED`
      )
      const data = await response.json()
      if (response.ok) {
        setShifts(data.shifts)
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      router.push('/staff/dashboard')
      return
    }

    fetchShifts()
  }, [session, status, router, fetchShifts])

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const groupedShifts = shifts.reduce((acc, shift) => {
    const date = new Date(shift.date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(shift)
    return acc
  }, {} as Record<string, Shift[]>)

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
      
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            確定シフト閲覧
          </h1>
          <p className="text-sm sm:text-base text-gray-600">確定済みのシフトを閲覧できます</p>
        </div>

        {/* 月切替 */}
        <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow mb-6">
          <Button
            onClick={previousMonth}
            variant="outline"
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-5 w-5" />
            前月
          </Button>
          
          <h2 className="text-xl font-bold text-gray-900">
            {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
          </h2>
          
          <Button
            onClick={nextMonth}
            variant="outline"
            className="flex items-center gap-1"
          >
            次月
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* シフト一覧 */}
        {Object.keys(groupedShifts).length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>確定済みシフトがありません</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedShifts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dayShifts]) => (
                <Card key={date} className="shadow-md">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                      {date}
                      <span className="ml-auto text-sm font-normal text-gray-600">
                        {dayShifts.length}名
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 bg-white">
                    <div className="space-y-3">
                      {dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-4 w-4 text-gray-600" />
                              <span className="font-semibold text-gray-900">{shift.user.name}</span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">⏰ {shift.startTime} - {shift.endTime}</span>
                              </div>
                              {shift.office && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  <span>{shift.office.name}</span>
                                </div>
                              )}
                              {shift.route && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    {shift.route.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              確定
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

