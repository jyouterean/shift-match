'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AdminNav from '@/components/admin-nav'
import { ErrorBoundary } from '@/components/error-boundary'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wand2,
} from 'lucide-react'

interface CalendarDay {
  date: string
  totalRequired: number
  totalAssigned: number
  totalAvailable: number
  status: 'empty' | 'inactive' | 'fulfilled' | 'partial' | 'pending' | 'shortage'
  offices: Record<string, any>
}

interface DayDetail {
  date: string
  summary: {
    totalRequired: number
    totalAssigned: number
    totalShortage: number
  }
  offices: Array<{
    officeId: string
    officeName: string
    requiredCount: number
    startTime: string
    endTime: string
    assignedShifts: any[]
    availableUsers: any[]
    emptySlots: number
  }>
  availabilities: Array<{
    availabilityId: string
    userId: string
    userName: string
    userEmail: string
    userOfficeId: string | null
    notes: string | null
  }>
}

export default function ShiftCalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [offices, setOffices] = useState<Array<{ id: string; name: string; address: string | null }>>([])
  const [selectedAvailability, setSelectedAvailability] = useState<any>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const fetchCalendarData = useCallback(async () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDate = firstDay.toISOString().split('T')[0]
    const endDate = lastDay.toISOString().split('T')[0]

    try {
      const response = await fetch(
        `/api/admin/shifts/calendar?startDate=${startDate}&endDate=${endDate}`,
        {
          cache: 'no-store', // キャッシュを無効化して常に最新データを取得
          headers: {
            'Cache-Control': 'no-cache',
          }
        }
      )
      const data = await response.json()
      if (response.ok) {
        setCalendarData(data.calendar)
        console.log('Calendar data loaded:', data.calendar.length, 'days')
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth])

  const fetchOffices = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/offices')
      const data = await response.json()
      if (response.ok) {
        setOffices(data.offices)
      }
    } catch (error) {
      console.error('Failed to fetch offices:', error)
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

    fetchCalendarData()
    fetchOffices()
  }, [session, status, router, fetchCalendarData, fetchOffices])

  const handleDateClick = async (dateStr: string) => {
    setSelectedDate(dateStr)
    setShowDetailModal(true)

    try {
      const response = await fetch(`/api/admin/shifts/${dateStr}`)
      const data = await response.json()
      if (response.ok) {
        setDayDetail(data)
      }
    } catch (error) {
      console.error('Failed to fetch day detail:', error)
    }
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleAssignToOffice = async (officeId: string) => {
    if (!selectedAvailability || !dayDetail) return

    const office = offices.find(o => o.id === officeId)
    if (!office) return

    // その営業所の時間帯を取得（必要人数設定から）
    const officeRequirement = dayDetail.offices.find(o => o.officeId === officeId)
    const startTime = officeRequirement?.startTime || '18:00'
    const endTime = officeRequirement?.endTime || '03:00'

    try {
      const startDateTime = new Date(`${dayDetail.date}T${startTime}:00`)
      let endDateTime = new Date(`${dayDetail.date}T${endTime}:00`)
      if (endDateTime <= startDateTime) {
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
      }

      const response = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedAvailability.userId,
          officeId: officeId,
          date: dayDetail.date,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          notes: `希望提出から割当: ${office.name}`,
        }),
      })

      if (response.ok) {
        setShowAssignModal(false)
        setSelectedAvailability(null)
        handleDateClick(dayDetail.date)
        fetchCalendarData()
        alert(`${selectedAvailability.userName}さんを${office.name}に割り当てました`)
      } else {
        const data = await response.json()
        alert(data.error || '割当に失敗しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return 'bg-green-100 border-green-400 text-green-900'
      case 'partial':
        return 'bg-yellow-100 border-yellow-400 text-yellow-900'
      case 'shortage':
        return 'bg-red-100 border-red-400 text-red-900'
      case 'pending':
        return 'bg-blue-100 border-blue-400 text-blue-900'
      case 'inactive':
        return 'bg-gray-100 border-gray-300 text-gray-500'
      default:
        return 'bg-white border-gray-200 text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'shortage':
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  // カレンダーのグリッドを生成
  const generateCalendarGrid = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayOfWeek = firstDay.getDay()

    const days: (CalendarDay | null)[] = []

    // 空白セルを追加
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // 日付セルを追加
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = calendarData.find(d => d.date === dateStr)
      
      if (dayData) {
        days.push(dayData)
      } else {
        days.push({
          date: dateStr,
          totalRequired: 0,
          totalAssigned: 0,
          totalAvailable: 0,
          status: 'empty',
          offices: {},
        })
      }
    }

    return days
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  const calendarGrid = generateCalendarGrid()
  const monthName = currentMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
        <AdminNav />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              シフトカレンダー
            </h1>
          </div>

          {/* 月切替 */}
          <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow">
            <Button
              onClick={previousMonth}
              variant="outline"
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-5 w-5" />
              前月
            </Button>
            
            <div className="text-xl font-bold text-gray-900">{monthName}</div>

            <Button
              onClick={nextMonth}
              variant="outline"
              className="flex items-center gap-1"
            >
              次月
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* フィルタと凡例 */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              onClick={() => setFilterStatus('all')}
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              className="text-xs px-3 py-2 h-auto whitespace-nowrap"
            >
              全て
            </Button>
            <Button
              onClick={() => setFilterStatus('shortage')}
              variant={filterStatus === 'shortage' ? 'default' : 'outline'}
              className="text-xs px-3 py-2 h-auto whitespace-nowrap"
            >
              不足のみ
            </Button>
            <Button
              onClick={() => setFilterStatus('fulfilled')}
              variant={filterStatus === 'fulfilled' ? 'default' : 'outline'}
              className="text-xs px-3 py-2 h-auto whitespace-nowrap"
            >
              充足済のみ
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded"></div>
              <span>充足</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-400 rounded"></div>
              <span>一部充足</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-400 rounded"></div>
              <span>不足</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-400 rounded"></div>
              <span>申請のみ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-300 rounded"></div>
              <span>非稼働</span>
            </div>
          </div>
        </div>

        {/* カレンダーグリッド */}
        <Card>
          <CardContent className="p-2 sm:p-4">
            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                <div
                  key={day}
                  className={`text-center font-bold py-2 text-sm ${
                    index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarGrid.map((day, index) => {
                // フィルタ適用
                const shouldShow = filterStatus === 'all' || 
                  (filterStatus === 'shortage' && day && (day.status === 'shortage' || day.status === 'partial')) ||
                  (filterStatus === 'fulfilled' && day && day.status === 'fulfilled')
                
                return (
                  <div
                    key={index}
                    onClick={() => day && day.status !== 'empty' && handleDateClick(day.date)}
                    className={`
                      min-h-[80px] sm:min-h-[100px] p-2 rounded-lg border-2 transition-all
                      ${day ? getStatusColor(day.status) : 'bg-gray-50 border-gray-100'}
                      ${day && day.status !== 'empty' && day.status !== 'inactive' ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''}
                      ${!shouldShow && day ? 'opacity-30' : ''}
                    `}
                  >
                    {day && (
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-lg">
                          {new Date(day.date).getDate()}
                        </span>
                        {getStatusIcon(day.status)}
                      </div>
                      
                      {day.status !== 'empty' && day.status !== 'inactive' && (
                        <div className="flex-1 space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="font-semibold">
                              {day.totalAssigned}/{day.totalRequired}
                            </span>
                          </div>
                          {day.totalRequired > day.totalAssigned && (
                            <div className="text-red-700 font-bold">
                              不足: {day.totalRequired - day.totalAssigned}名
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* FAB - 一括操作ボタン */}
        <div className="fixed bottom-24 right-6 flex flex-col gap-3">
          <Button
            onClick={() => router.push('/admin/shifts/calendar/auto-assign')}
            className="rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* 日別詳細モーダル */}
      {showDetailModal && dayDetail && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-5xl my-8">
            <Card>
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {new Date(dayDetail.date + 'T00:00:00').toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </h2>
                  <Button
                    onClick={() => {
                      setShowDetailModal(false)
                      setDayDetail(null)
                    }}
                    variant="outline"
                    className="text-sm"
                  >
                    閉じる
                  </Button>
                </div>

                {/* 集計情報 */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-gray-600">必要人数</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">
                      {dayDetail.summary.totalRequired}名
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-gray-600">割当済</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {dayDetail.summary.totalAssigned}名
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-gray-600">不足</div>
                    <div className="text-xl sm:text-2xl font-bold text-red-600">
                      {dayDetail.summary.totalShortage}名
                    </div>
                  </div>
                </div>

                {/* 希望提出者一覧 */}
                {dayDetail.availabilities && dayDetail.availabilities.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-lg text-blue-900 mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      希望提出者（{dayDetail.availabilities.length}名）
                    </h3>
                    <p className="text-sm text-blue-700 mb-3">
                      従業員が希望を提出しています。営業所を選択してシフトに割り当ててください。
                    </p>
                    <div className="space-y-2">
                      {dayDetail.availabilities.map((avail) => (
                        <div
                          key={avail.availabilityId}
                          className="flex items-center justify-between bg-white border-2 border-blue-200 rounded-lg p-3"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{avail.userName}</div>
                            <div className="text-xs text-gray-600">{avail.userEmail}</div>
                            {avail.notes && (
                              <div className="text-xs text-gray-500 mt-1">📝 {avail.notes}</div>
                            )}
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedAvailability(avail)
                              setShowAssignModal(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-sm h-9 px-4"
                          >
                            営業所を割当
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 営業所別詳細 */}
                <div className="space-y-4">
                  {dayDetail.offices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-2">この日は営業所の必要人数が設定されていません</p>
                      <Button
                        onClick={() => router.push('/admin/shifts/requirements')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        必要人数を設定
                      </Button>
                    </div>
                  ) : (
                    dayDetail.offices.map((office) => (
                      <div key={office.officeId} className="border-2 rounded-lg p-3 sm:p-4 bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-base sm:text-lg text-gray-900">
                              {office.officeName}
                            </h3>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1">
                              {office.startTime} - {office.endTime} / 必要: {office.requiredCount}名
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            office.emptySlots === 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {office.emptySlots === 0 ? '充足' : `不足${office.emptySlots}名`}
                          </div>
                        </div>

                        {/* 割当済みシフト */}
                        <div className="space-y-2 mb-3">
                          {office.assignedShifts.map((shift: any) => (
                            <div 
                              key={shift.id} 
                              className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="font-semibold text-gray-900">{shift.userName}</span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {new Date(shift.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                  {' - '}
                                  {new Date(shift.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                  {shift.routeName && ` / ${shift.routeName}`}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={async () => {
                                    if (confirm('このシフトをキャンセルしますか？')) {
                                      try {
                                        const response = await fetch(`/api/admin/shifts?id=${shift.id}`, {
                                          method: 'DELETE',
                                        })
                                        if (response.ok) {
                                          handleDateClick(dayDetail.date)
                                          fetchCalendarData()
                                        }
                                      } catch (error) {
                                        alert('削除に失敗しました')
                                      }
                                    }
                                  }}
                                  variant="outline"
                                  className="text-xs h-8 px-2"
                                >
                                  削除
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 希望提出者（未割当） */}
                        {office.availableUsers.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-gray-700 mb-2">
                              希望提出済み（未割当）
                            </div>
                            <div className="space-y-2">
                              {office.availableUsers.map((user: any) => (
                                <div 
                                  key={user.userId}
                                  className="flex items-center justify-between bg-blue-50 border border-blue-200 p-2 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm">{user.userName}</span>
                                  </div>
                                  <Button
                                    onClick={async () => {
                                      try {
                                        const startTime = new Date(`${dayDetail.date}T${office.startTime}:00`)
                                        let endTime = new Date(`${dayDetail.date}T${office.endTime}:00`)
                                        if (endTime <= startTime) {
                                          endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
                                        }

                                        const response = await fetch('/api/admin/shifts', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            userId: user.userId,
                                            officeId: office.officeId,
                                            date: dayDetail.date,
                                            startTime: startTime.toISOString(),
                                            endTime: endTime.toISOString(),
                                            notes: '希望提出から割当',
                                          }),
                                        })
                                        
                                        if (response.ok) {
                                          handleDateClick(dayDetail.date)
                                          fetchCalendarData()
                                        } else {
                                          alert('割当に失敗しました')
                                        }
                                      } catch (error) {
                                        alert('エラーが発生しました')
                                      }
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-xs h-8 px-3"
                                  >
                                    割当
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 空き枠表示 */}
                        {office.emptySlots > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-red-700">
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-semibold">
                                  空き枠: {office.emptySlots}名
                                </span>
                              </div>
                              <Button
                                onClick={() => {
                                  // 手動割当機能（候補者一覧から選択）
                                  alert('候補者選択機能は次のバージョンで実装予定です')
                                }}
                                variant="outline"
                                className="text-xs h-8"
                              >
                                手動割当
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* 一括操作ボタン */}
                {dayDetail.offices.length > 0 && (
                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={async () => {
                        if (confirm('この日のシフトを自動割当しますか？')) {
                          try {
                            const response = await fetch('/api/admin/shifts/auto-assign', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                startDate: dayDetail.date,
                                endDate: dayDetail.date,
                              }),
                            })
                            const data = await response.json()
                            if (response.ok) {
                              alert(data.message)
                              handleDateClick(dayDetail.date)
                              fetchCalendarData()
                            } else {
                              alert(data.error)
                            }
                          } catch (error) {
                            alert('エラーが発生しました')
                          }
                        }
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      この日を自動割当
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 営業所選択モーダル */}
      {showAssignModal && selectedAvailability && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200 bg-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">営業所を選択</h3>
                <Button
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedAvailability(null)
                  }}
                  variant="outline"
                  className="text-sm"
                >
                  キャンセル
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">{selectedAvailability.userName}</span>
                </div>
                <div className="text-sm text-blue-700">{selectedAvailability.userEmail}</div>
                {selectedAvailability.notes && (
                  <div className="text-sm text-blue-600 mt-2">
                    📝 {selectedAvailability.notes}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  この従業員をどの営業所に割り当てますか？
                </p>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {offices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    営業所が登録されていません
                  </div>
                ) : (
                  offices.map((office) => {
                    const officeDetail = dayDetail?.offices.find(o => o.officeId === office.id)
                    const isFull = officeDetail && officeDetail.emptySlots === 0

                    return (
                      <button
                        key={office.id}
                        onClick={() => handleAssignToOffice(office.id)}
                        disabled={isFull}
                        className={`
                          w-full text-left p-4 rounded-lg border-2 transition-all
                          ${isFull 
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' 
                            : 'bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer active:scale-98'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-1">
                              {office.name}
                            </div>
                            {office.address && (
                              <div className="text-xs text-gray-600 mb-2">
                                📍 {office.address}
                              </div>
                            )}
                            {officeDetail && (
                              <div className="text-xs text-gray-600">
                                勤務時間: {officeDetail.startTime} - {officeDetail.endTime}
                                <br />
                                必要人数: {officeDetail.requiredCount}名 / 
                                割当済: {officeDetail.assignedShifts.length}名
                              </div>
                            )}
                          </div>
                          {isFull ? (
                            <div className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-semibold ml-2">
                              満員
                            </div>
                          ) : officeDetail ? (
                            <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold ml-2">
                              空き{officeDetail.emptySlots}
                            </div>
                          ) : (
                            <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold ml-2">
                              選択可
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
      </div>
    </ErrorBoundary>
  )
}

export const dynamic = 'force-dynamic'

