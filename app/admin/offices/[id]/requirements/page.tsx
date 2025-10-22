'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import AdminNav from '@/components/admin-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Copy,
  Building2,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Office {
  id: string
  name: string
  address?: string
}

interface Requirement {
  date: string
  requiredCount: number
  startTime: string
  endTime: string
  notes?: string
}

export default function OfficeRequirementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const officeId = params.id as string

  const [office, setOffice] = useState<Office | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [requirements, setRequirements] = useState<Record<string, Requirement>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // 一括編集用
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [bulkData, setBulkData] = useState({
    requiredCount: 3,
    startTime: '09:00',
    endTime: '18:00',
    notes: '',
  })

  // 曜日一括選択用
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(new Set())

  // 認証チェック
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
  }, [session, status, router])

  // 営業所情報とデータ取得（並列化で高速化）
  const fetchData = useCallback(async () => {
    if (!officeId) return
    
    setIsLoading(true)
    try {
      const month = format(currentMonth, 'yyyy-MM')
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

      // 2つのAPIを並列取得（高速化）
      const [officeRes, reqRes] = await Promise.all([
        fetch('/api/admin/offices'),
        fetch(`/api/admin/office-requirements?officeId=${officeId}&startDate=${startDate}&endDate=${endDate}`)
      ])

      // レスポンスを並列パース
      const [officeData, reqData] = await Promise.all([
        officeRes.json(),
        reqRes.json()
      ])

      // 営業所情報
      if (officeRes.ok) {
        const foundOffice = officeData.offices.find((o: Office) => o.id === officeId)
        if (foundOffice) {
          setOffice(foundOffice)
        }
      }

      // 必要人数
      if (reqRes.ok && reqData.requirements) {
        const reqMap: Record<string, Requirement> = {}
        reqData.requirements.forEach((req: any) => {
          const dateStr = req.date.split('T')[0]
          reqMap[dateStr] = {
            date: dateStr,
            requiredCount: req.requiredCount,
            startTime: req.startTime || '09:00',
            endTime: req.endTime || '18:00',
            notes: req.notes || '',
          }
        })
        setRequirements(reqMap)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [officeId, currentMonth])

  useEffect(() => {
    if (session && (session.user.role === 'OWNER' || session.user.role === 'ADMIN')) {
      fetchData()
    }
  }, [session, fetchData])

  // 月の移動
  const previousMonth = () => setCurrentMonth(prev => subMonths(prev, 1))
  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))

  // カレンダーの日付配列生成（月曜始まり）
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // 日付セル変更
  const handleDayChange = (dateStr: string, field: keyof Requirement, value: any) => {
    setRequirements(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        date: dateStr,
        [field]: value,
      }
    }))
  }

  // 曜日選択
  const handleWeekdayToggle = (weekday: number) => {
    setSelectedWeekdays(prev => {
      const newSet = new Set(prev)
      if (newSet.has(weekday)) {
        newSet.delete(weekday)
      } else {
        newSet.add(weekday)
      }
      return newSet
    })
  }

  // 曜日まとめて選択
  const selectByWeekdays = () => {
    const dates = new Set<string>()
    calendarDays.forEach(day => {
      if (day.getMonth() === currentMonth.getMonth()) {
        const weekday = getDay(day)
        // getDay: 0=日曜, 1=月曜, ..., 6=土曜
        // selectedWeekdaysも同じ形式
        if (selectedWeekdays.has(weekday)) {
          dates.add(format(day, 'yyyy-MM-dd'))
        }
      }
    })
    setSelectedDates(dates)
  }

  // 一括適用
  const applyBulk = () => {
    const newReqs = { ...requirements }
    selectedDates.forEach(dateStr => {
      newReqs[dateStr] = {
        date: dateStr,
        requiredCount: bulkData.requiredCount,
        startTime: bulkData.startTime,
        endTime: bulkData.endTime,
        notes: bulkData.notes,
      }
    })
    setRequirements(newReqs)
    setSelectedDates(new Set())
    setBulkEditMode(false)
    alert(`${selectedDates.size}日分を一括設定しました`)
  }

  // 保存
  const handleSave = async () => {
    if (!officeId) return

    setIsSaving(true)
    try {
      // 月内の日付で設定がある日のみ送信
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      const monthDates = eachDayOfInterval({ start: monthStart, end: monthEnd })
      
      const dataToSave = monthDates
        .map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          return requirements[dateStr]
        })
        .filter(Boolean)

      const response = await fetch('/api/admin/office-requirements/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officeId,
          requirements: dataToSave,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        alert(data.message || '保存しました')
        fetchData()
      } else {
        alert(data.error || '保存に失敗しました')
      }
    } catch (err) {
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsSaving(false)
    }
  }

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

  if (!office) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
        <AdminNav />
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">営業所が見つかりません</p>
              <Button className="mt-4" onClick={() => router.push('/admin/offices')}>
                営業所一覧に戻る
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      <AdminNav />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/offices')}>
              ← 戻る
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            {office.name} - 必要人数設定
          </h1>
          <p className="text-gray-600 mt-1">カレンダーで月ごとの必要人数を一括編集できます</p>
        </div>

        {/* ヘッダー：月ナビ＋一括編集 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                  前月
                </Button>
                <h2 className="text-xl font-semibold text-gray-800 min-w-[150px] text-center">
                  {format(currentMonth, 'yyyy年M月', { locale: ja })}
                </h2>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  次月
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={bulkEditMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBulkEditMode(!bulkEditMode)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  一括編集
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </Button>
              </div>
            </div>

            {/* 一括編集モード */}
            {bulkEditMode && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-blue-900">一括編集モード</h3>
                
                {/* 曜日選択 */}
                <div>
                  <Label className="mb-2 block">曜日で選択:</Label>
                  <div className="flex gap-2 mb-2">
                    {['日', '月', '火', '水', '木', '金', '土'].map((day, idx) => (
                      <button
                        key={day}
                        onClick={() => handleWeekdayToggle(idx)}
                        className={`px-3 py-1 rounded ${
                          selectedWeekdays.has(idx)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" onClick={selectByWeekdays} variant="outline">
                    選択した曜日の日付を選択
                  </Button>
                </div>

                {/* 一括設定値 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="bulk-count">必要人数</Label>
                    <Input
                      id="bulk-count"
                      type="number"
                      min="0"
                      value={bulkData.requiredCount}
                      onChange={(e) => setBulkData({ ...bulkData, requiredCount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-start">開始時刻</Label>
                    <Input
                      id="bulk-start"
                      type="time"
                      value={bulkData.startTime}
                      onChange={(e) => setBulkData({ ...bulkData, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-end">終了時刻</Label>
                    <Input
                      id="bulk-end"
                      type="time"
                      value={bulkData.endTime}
                      onChange={(e) => setBulkData({ ...bulkData, endTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bulk-notes">備考</Label>
                    <Input
                      id="bulk-notes"
                      value={bulkData.notes}
                      onChange={(e) => setBulkData({ ...bulkData, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={applyBulk}
                    disabled={selectedDates.size === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    選択した{selectedDates.size}日に適用
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDates(new Set())
                      setBulkEditMode(false)
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* カレンダー */}
        <Card>
          <CardContent className="p-4">
            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['月', '火', '水', '木', '金', '土', '日'].map((day, idx) => (
                <div
                  key={day}
                  className={`text-center font-semibold py-2 ${
                    idx === 5 ? 'text-blue-600' : idx === 6 ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((dayDate: Date) => {
                const dateStr = format(dayDate, 'yyyy-MM-dd')
                const isCurrentMonth = dayDate.getMonth() === currentMonth.getMonth()
                const req = requirements[dateStr] || { date: dateStr, requiredCount: 0, startTime: '09:00', endTime: '18:00', notes: '' }
                const isSelected = selectedDates.has(dateStr)

                return (
                  <div
                    key={dateStr}
                    className={`min-h-[140px] border-2 rounded-lg p-2 transition-all ${
                      !isCurrentMonth ? 'bg-gray-50 opacity-50' :
                      isSelected ? 'bg-blue-100 border-blue-500' :
                      req.requiredCount > 0 ? 'bg-white border-green-300' : 'bg-white border-gray-200'
                    } ${bulkEditMode && isCurrentMonth ? 'cursor-pointer hover:border-blue-400' : ''}`}
                    onClick={() => {
                      if (bulkEditMode && isCurrentMonth) {
                        setSelectedDates(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(dateStr)) {
                            newSet.delete(dateStr)
                          } else {
                            newSet.add(dateStr)
                          }
                          return newSet
                        })
                      }
                    }}
                  >
                    {/* 日付 */}
                    <div className="text-sm font-semibold text-gray-700 mb-1">
                      {dayDate.getDate()}
                    </div>

                    {/* 編集フィールド */}
                    {isCurrentMonth && !bulkEditMode && (
                      <div className="space-y-1">
                        <Input
                          type="number"
                          min="0"
                          value={req.requiredCount}
                          onChange={(e) => handleDayChange(dateStr, 'requiredCount', parseInt(e.target.value) || 0)}
                          className="h-7 text-xs"
                          placeholder="人数"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Input
                          type="time"
                          value={req.startTime}
                          onChange={(e) => handleDayChange(dateStr, 'startTime', e.target.value)}
                          className="h-7 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Input
                          type="time"
                          value={req.endTime}
                          onChange={(e) => handleDayChange(dateStr, 'endTime', e.target.value)}
                          className="h-7 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* 一括編集モード時の表示 */}
                    {isCurrentMonth && bulkEditMode && (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">人数: {req.requiredCount}</p>
                        <p>{req.startTime} - {req.endTime}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

