'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import StaffNav from '@/components/staff-nav'
import { Calendar, MapPin, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react'

interface Shift {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  notes?: string
  office: {
    id: string
    name: string
  }
  route?: {
    id: string
    name: string
  } | null
}

interface Availability {
  id: string
  date: string
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'MAYBE'
  notes?: string
}

export default function StaffShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [view, setView] = useState<'list' | 'calendar'>('calendar')
  const [pendingChanges, setPendingChanges] = useState<Map<string, 'AVAILABLE' | 'UNAVAILABLE' | 'MAYBE' | 'DELETE'>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  // データ取得を並列化（高速化）
  const fetchAllData = useCallback(async () => {
    setIsLoading(true)
    try {
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      
      // 2つのAPIを並列取得
      const [shiftsRes, availRes] = await Promise.all([
        fetch('/api/staff/shifts'),
        fetch(`/api/staff/availability?startDate=${firstDay.toISOString()}&endDate=${lastDay.toISOString()}`)
      ])

      // レスポンスを並列パース
      const [shiftsData, availData] = await Promise.all([
        shiftsRes.json(),
        availRes.json()
      ])

      if (shiftsRes.ok) {
        setShifts(shiftsData.shifts)
      }

      if (availRes.ok) {
        setAvailabilities(availData.availabilities)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role === 'OWNER' || session.user.role === 'ADMIN') {
      router.push('/admin/dashboard')
      return
    }

    fetchAllData()
  }, [session, status, router, fetchAllData])

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const existing = availabilities.find(a => a.date.startsWith(dateStr))
    const pending = pendingChanges.get(dateStr)

    let newStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'MAYBE' | 'DELETE'
    
    // 現在の状態を判定（pending > existing）
    const currentStatus = pending || existing?.status
    
    if (!currentStatus) {
      newStatus = 'AVAILABLE'
    } else if (currentStatus === 'AVAILABLE') {
      newStatus = 'UNAVAILABLE'
    } else if (currentStatus === 'UNAVAILABLE') {
      newStatus = 'MAYBE'
    } else if (currentStatus === 'MAYBE') {
      newStatus = 'DELETE'
    } else {
      // DELETE状態からは未選択に戻る
      newStatus = 'AVAILABLE'
    }

    // pendingChangesに保存
    const newPending = new Map(pendingChanges)
    if (newStatus === 'DELETE' && !existing) {
      // 元々なかったものを削除にする場合は、pendingから削除
      newPending.delete(dateStr)
    } else {
      newPending.set(dateStr, newStatus)
    }
    setPendingChanges(newPending)
  }

  const handleSubmitAvailability = async () => {
    if (pendingChanges.size === 0) {
      alert('変更がありません')
      return
    }

    setIsSaving(true)

    try {
      const promises = []
      
      for (const [dateStr, status] of pendingChanges.entries()) {
        if (status === 'DELETE') {
          promises.push(
            fetch(`/api/staff/availability?date=${dateStr}`, {
              method: 'DELETE',
            })
          )
        } else {
          promises.push(
            fetch('/api/staff/availability', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: dateStr,
                status,
              }),
            })
          )
        }
      }

      await Promise.all(promises)
      
      setPendingChanges(new Map())
      await fetchAllData()
      alert(`${pendingChanges.size}件のシフト希望を提出しました`)
    } catch (error) {
      console.error('Submit availability error:', error)
      alert('シフト希望の提出に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelChanges = () => {
    setPendingChanges(new Map())
  }

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1, 12, 0, 0) // 正午で生成
    const lastDay = new Date(year, month + 1, 0, 12, 0, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days = []
    // 前月の空白
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    // 当月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i, 12, 0, 0)) // 正午で生成してタイムゾーン問題を回避
    }
    return days
  }

  const getAvailabilityForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return availabilities.find(a => a.date.startsWith(dateStr))
  }

  const getShiftForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return shifts.find(s => s.date.startsWith(dateStr))
  }

  const getCellColor = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const pending = pendingChanges.get(dateStr)
    const availability = getAvailabilityForDate(date)
    const shift = getShiftForDate(date)

    if (shift) {
      return 'bg-purple-100 border-purple-300'
    }
    
    // pending状態を優先
    const status = pending || availability?.status
    
    if (!status || pending === 'DELETE') {
      return pending ? 'bg-gray-100 border-gray-300 border-2 border-dashed' : 'bg-white hover:bg-blue-50'
    }

    const baseColor = 
      status === 'AVAILABLE' ? 'bg-green-100 border-green-300' :
      status === 'UNAVAILABLE' ? 'bg-red-100 border-red-300' :
      status === 'MAYBE' ? 'bg-yellow-100 border-yellow-300' :
      'bg-white'
    
    // pending状態には点線の枠を追加
    return pending ? `${baseColor} border-2 border-dashed` : baseColor
  }

  const getCellIcon = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const pending = pendingChanges.get(dateStr)
    const availability = getAvailabilityForDate(date)
    const shift = getShiftForDate(date)

    if (shift) {
      return <Calendar className="h-4 w-4 text-purple-600" />
    }

    const status = pending || availability?.status

    if (!status || pending === 'DELETE') return null

    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'UNAVAILABLE':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'MAYBE':
        return <HelpCircle className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20">
      <StaffNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
            マイシフト
          </h1>
          <p className="text-sm sm:text-base text-gray-600">シフト確認とシフト希望登録</p>
        </div>

        {/* ビュー切り替え */}
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={view === 'calendar' ? 'default' : 'outline'}
            onClick={() => setView('calendar')}
            className={view === 'calendar' ? 'bg-green-600' : ''}
          >
            カレンダー
          </Button>
          <Button
            size="sm"
            variant={view === 'list' ? 'default' : 'outline'}
            onClick={() => setView('list')}
            className={view === 'list' ? 'bg-green-600' : ''}
          >
            リスト
          </Button>
        </div>

        {view === 'calendar' ? (
          <>
            {/* 凡例と提出ボタン */}
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3 text-xs mb-3">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                    <span>シフト確定</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>出勤可能</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>出勤不可</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <HelpCircle className="h-4 w-4 text-yellow-600" />
                    <span>未定</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 border-dashed rounded"></div>
                    <span>変更予定</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  💡 日付をタップで切り替え→「提出」ボタンで確定
                </p>
                {pendingChanges.size > 0 && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSubmitAvailability} 
                      disabled={isSaving}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? '提出中...' : `シフト希望を提出 (${pendingChanges.size}件)`}
                    </Button>
                    <Button 
                      onClick={handleCancelChanges} 
                      variant="outline"
                      disabled={isSaving}
                    >
                      キャンセル
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* カレンダー */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button onClick={previousMonth} variant="outline" size="sm">
                    ←
                  </Button>
                  <CardTitle className="text-lg">
                    {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                  </CardTitle>
                  <Button onClick={nextMonth} variant="outline" size="sm">
                    →
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                    <div
                      key={day}
                      className={`text-center text-xs font-bold py-2 ${
                        index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* カレンダーグリッド */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth().map((date, index) => (
                    <div
                      key={index}
                      className={`aspect-square flex flex-col items-center justify-center border rounded-lg transition-all cursor-pointer ${
                        date
                          ? `${getCellColor(date)} active:scale-95`
                          : 'bg-gray-50'
                      }`}
                      onClick={() => date && handleDateClick(date)}
                    >
                      {date && (
                        <>
                          <span className={`text-sm font-medium ${
                            date.getDay() === 0 ? 'text-red-600' :
                            date.getDay() === 6 ? 'text-blue-600' :
                            'text-gray-900'
                          }`}>
                            {date.getDate()}
                          </span>
                          <div className="mt-1">
                            {getCellIcon(date)}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <Card key={shift.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{new Date(shift.date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      shift.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                      shift.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                      shift.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {shift.status === 'SCHEDULED' ? '予定' :
                       shift.status === 'IN_PROGRESS' ? '進行中' :
                       shift.status === 'COMPLETED' ? '完了' : 'キャンセル'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {new Date(shift.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(shift.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{shift.office.name}</span>
                      {shift.route && <span>• {shift.route.name}</span>}
                    </div>
                    {shift.notes && (
                      <p className="text-sm text-gray-600 pt-2 border-t">{shift.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {shifts.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>確定シフトがありません</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
