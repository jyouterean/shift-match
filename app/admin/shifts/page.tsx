'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Search,
  Plus,
  X,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'

// 型定義
type OfficeStatus = 'FILLED' | 'PARTIAL' | 'SHORTAGE' | 'APPLIED' | 'IDLE'
type DayStatus = 'FILLED' | 'PARTIAL' | 'SHORTAGE' | 'APPLIED' | 'IDLE'

interface OfficeDay {
  officeId: string
  officeName: string
  required: number
  assigned: number
  hasApplications: boolean
  status: OfficeStatus
}

interface DaySummary {
  date: string
  offices: OfficeDay[]
  dayStatus: DayStatus
}

interface Availability {
  memberId: string
  memberName: string
  memberEmail: string
  memberPhone?: string
  officeId?: string
  officeName?: string
  availableDates: string[]
}

// 営業所の安定色生成（HSL）
function getOfficeColor(officeId: string): string {
  let hash = 0
  for (let i = 0; i < officeId.length; i++) {
    hash = officeId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 60%, 55%)`
}

// ステータスに応じたスタイル
const statusStyles = {
  FILLED: 'bg-emerald-50 border-emerald-300',
  PARTIAL: 'bg-amber-50 border-amber-300',
  SHORTAGE: 'bg-rose-50 border-rose-300',
  APPLIED: 'bg-sky-50 border-sky-300',
  IDLE: 'bg-gray-100 border-gray-300 text-gray-400',
}

const statusDotColors = {
  FILLED: 'bg-emerald-500',
  PARTIAL: 'bg-amber-500',
  SHORTAGE: 'bg-rose-500',
  APPLIED: 'bg-sky-500',
  IDLE: 'bg-gray-400',
}

export default function AdminShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [days, setDays] = useState<DaySummary[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 左ペイン：個人選択
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'candidates'>('all')
  
  // 右ペイン：フィルタ
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'shortage' | 'filled'>('all')
  
  // シフト締切
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false)
  const [deadlineInput, setDeadlineInput] = useState('')
  
  // 割当ダイアログ
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean
    date: string
    officeId: string
  } | null>(null)

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

  // データ取得
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const month = format(currentMonth, 'yyyy-MM')
      const year = currentMonth.getFullYear()
      const monthNum = currentMonth.getMonth() + 1
      
      // 月サマリー取得
      const summaryRes = await fetch(`/api/admin/shifts?month=${month}`)
      const summaryData = await summaryRes.json()
      
      if (summaryRes.ok) {
        setDays(summaryData.days || [])
      } else {
        setError(summaryData.error || 'データの取得に失敗しました')
      }

      // 個人の出勤可能日取得
      const availRes = await fetch(`/api/admin/availability?month=${month}`)
      const availData = await availRes.json()
      
      if (availRes.ok) {
        setAvailabilities(availData.availabilities || [])
      }

      // シフト締切取得
      const deadlineRes = await fetch(`/api/admin/shift-deadline?year=${year}&month=${monthNum}`)
      const deadlineData = await deadlineRes.json()
      
      if (deadlineRes.ok && deadlineData.deadline) {
        setDeadline(new Date(deadlineData.deadline.deadlineDate))
        setDeadlineInput(format(new Date(deadlineData.deadline.deadlineDate), 'yyyy-MM-dd'))
      } else {
        setDeadline(null)
        setDeadlineInput('')
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [currentMonth])

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
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // 月曜始まり
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // 個人リストのフィルタリング
  const filteredMembers = useMemo(() => {
    let filtered = availabilities

    // 検索
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.memberEmail.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // 不足補充候補フィルタ
    if (filterType === 'candidates') {
      const shortageDates = days
        .filter(d => d.dayStatus === 'SHORTAGE' || d.dayStatus === 'PARTIAL')
        .map(d => d.date)
      
      filtered = filtered.filter(m => 
        m.availableDates.some(date => shortageDates.includes(date))
      )
    }

    return filtered
  }, [availabilities, searchQuery, filterType, days])

  // カレンダーフィルタ適用
  const filteredDays = useMemo(() => {
    if (calendarFilter === 'all') return days
    if (calendarFilter === 'shortage') {
      return days.filter(d => d.dayStatus === 'SHORTAGE' || d.dayStatus === 'PARTIAL')
    }
    if (calendarFilter === 'filled') {
      return days.filter(d => d.dayStatus === 'FILLED')
    }
    return days
  }, [days, calendarFilter])

  // 日付セルのクリック
  const handleDayClick = (dateStr: string) => {
    const day = days.find(d => d.date === dateStr)
    if (!day) return

    // 選択中のメンバーがその日を「可能」としている場合、割当ダイアログを開く
    if (selectedMember) {
      const member = availabilities.find(a => a.memberId === selectedMember)
      if (member && member.availableDates.includes(dateStr)) {
        // デフォルトの営業所を選択
        const defaultOffice = day.offices.find(o => o.status === 'SHORTAGE') || day.offices[0]
        if (defaultOffice) {
          setAssignDialog({
            open: true,
            date: dateStr,
            officeId: defaultOffice.officeId,
          })
        }
      }
    }
  }

  // シフト締切設定
  const handleSetDeadline = async () => {
    if (!deadlineInput) {
      alert('締切日を選択してください')
      return
    }

    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1

      const res = await fetch('/api/admin/shift-deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month,
          deadlineDate: deadlineInput,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setDeadline(new Date(deadlineInput))
        setShowDeadlineDialog(false)
        alert('シフト締切を設定しました')
      } else {
        alert(data.error || 'シフト締切の設定に失敗しました')
      }
    } catch (error) {
      console.error('Set deadline error:', error)
      alert('シフト締切の設定中にエラーが発生しました')
    }
  }

  // シフト締切削除
  const handleDeleteDeadline = async () => {
    if (!confirm('シフト締切を削除しますか？')) return

    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1

      const res = await fetch(`/api/admin/shift-deadline?year=${year}&month=${month}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok) {
        setDeadline(null)
        setDeadlineInput('')
        setShowDeadlineDialog(false)
        alert('シフト締切を削除しました')
      } else {
        alert(data.error || 'シフト締切の削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete deadline error:', error)
      alert('シフト締切の削除中にエラーが発生しました')
    }
  }

  // 割当実行
  const handleAssign = async () => {
    if (!assignDialog || !selectedMember) return

    try {
      const res = await fetch('/api/admin/shifts/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: assignDialog.date,
          officeId: assignDialog.officeId,
          memberId: selectedMember,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'シフトが割り当てられました')
        setAssignDialog(null)
        fetchData() // データを再取得
      } else {
        alert(data.error || '割当に失敗しました')
      }
    } catch (err) {
      alert('ネットワークエラーが発生しました')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50" style={{ minWidth: '1280px' }}>
      <AdminNav />

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <CalendarIcon className="h-8 w-8 text-blue-600" />
          シフトカレンダー
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* PC横2ペインレイアウト */}
        <div className="grid grid-cols-[420px_1fr] gap-4">
          {/* 左ペイン：個人リスト */}
          <div className="sticky top-4 h-[calc(100vh-140px)] overflow-hidden flex flex-col">
            <Card className="flex-1 flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  ドライバー / スタッフ
                </h2>
                
                {/* 検索 */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="名前・メールで検索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* クイックフィルタ */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilterType('all')}
                    className="flex-1"
                  >
                    全員
                  </Button>
                  <Button
                    size="sm"
                    variant={filterType === 'candidates' ? 'default' : 'outline'}
                    onClick={() => setFilterType('candidates')}
                    className="flex-1"
                  >
                    不足補充候補
                  </Button>
                </div>
              </div>

              {/* メンバーリスト */}
              <CardContent className="flex-1 overflow-y-auto p-0">
                {filteredMembers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    メンバーが見つかりません
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.memberId}
                      className={`p-3 border-b cursor-pointer hover:bg-blue-50 transition-colors ${
                        selectedMember === member.memberId ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
                      }`}
                      onClick={() => setSelectedMember(member.memberId === selectedMember ? null : member.memberId)}
                    >
                      <div className="font-medium text-gray-900">{member.memberName}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {member.officeName || '未所属'} • {member.memberEmail}
                      </div>
                      {member.availableDates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {member.availableDates.slice(0, 10).map((dateStr) => {
                            const day = new Date(dateStr).getDate()
                            return (
                              <span
                                key={dateStr}
                                className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded"
                              >
                                {day}
                              </span>
                            )
                          })}
                          {member.availableDates.length > 10 && (
                            <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              +{member.availableDates.length - 10}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右ペイン：カレンダー */}
          <div className="flex flex-col gap-4">
            {/* ヘッダー：月ナビ＋フィルタ＋凡例 */}
            <Card>
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

                  {/* フィルタ + 締切ボタン */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={calendarFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setCalendarFilter('all')}
                    >
                      全て
                    </Button>
                    <Button
                      size="sm"
                      variant={calendarFilter === 'shortage' ? 'default' : 'outline'}
                      onClick={() => setCalendarFilter('shortage')}
                    >
                      不足のみ
                    </Button>
                    <Button
                      size="sm"
                      variant={calendarFilter === 'filled' ? 'default' : 'outline'}
                      onClick={() => setCalendarFilter('filled')}
                    >
                      充足済み
                    </Button>
                    
                    {/* 締切設定ボタン */}
                    <Button
                      size="sm"
                      variant={deadline ? 'default' : 'outline'}
                      onClick={() => setShowDeadlineDialog(true)}
                      className="ml-2"
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {deadline ? `締切: ${format(deadline, 'M/d', { locale: ja })}` : '締切設定'}
                    </Button>
                  </div>
                </div>

                {/* 凡例 */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span>充足</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span>一部充足</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span>不足</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                    <span>申請のみ</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span>非稼働</span>
                  </div>
                </div>
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
                    const day = days.find(d => d.date === dateStr)
                    const isCurrentMonth = dayDate.getMonth() === currentMonth.getMonth()
                    const isFiltered = calendarFilter !== 'all' && day && !filteredDays.find(d => d.date === dateStr)

                    // 選択中メンバーの可日かチェック
                    const selectedMemberData = selectedMember ? availabilities.find(a => a.memberId === selectedMember) : null
                    const isAvailableDay = selectedMemberData?.availableDates.includes(dateStr)

                    return (
                      <div
                        key={dateStr}
                        className={`min-h-[120px] border-2 rounded-lg p-2 cursor-pointer transition-all ${
                          !isCurrentMonth ? 'bg-gray-50 opacity-50' :
                          isFiltered ? 'opacity-30 pointer-events-none' :
                          day ? statusStyles[day.dayStatus] : 'bg-white border-gray-200'
                        } ${
                          isAvailableDay ? 'ring-2 ring-green-500 ring-offset-2' : ''
                        }`}
                        onClick={() => isCurrentMonth && !isFiltered && handleDayClick(dateStr)}
                      >
                        {/* 日付とステータスドット */}
                        <div className="flex items-start justify-between mb-1">
                          <span className={`text-sm font-semibold ${
                            !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                          }`}>
                            {dayDate.getDate()}
                          </span>
                          {day && (
                            <div className={`w-2 h-2 rounded-full ${statusDotColors[day.dayStatus]}`}></div>
                          )}
                        </div>

                        {/* 拠点別行 */}
                        {day && isCurrentMonth && (
                          <div className="space-y-1 text-xs">
                            {day.offices.slice(0, 3).map((office) => (
                              <div key={office.officeId} className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: getOfficeColor(office.officeId) }}
                                ></div>
                                <span className="truncate" style={{ color: getOfficeColor(office.officeId) }}>
                                  {office.officeName}
                                </span>
                                <span className="text-gray-600">👥 {office.assigned}/{office.required}</span>
                                {office.assigned < office.required && (
                                  <span className="text-rose-600 font-semibold">
                                    (-{office.required - office.assigned})
                                  </span>
                                )}
                              </div>
                            ))}
                            {day.offices.length > 3 && (
                              <div className="text-gray-500 italic">+{day.offices.length - 3}拠点</div>
                            )}
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

        {/* FAB */}
        <button
          className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          onClick={() => router.push('/admin/shifts/requirements')}
          title="必要人数設定"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* 割当ダイアログ */}
        {assignDialog && (
          <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200 bg-white">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">シフト割当</h3>
                  <button onClick={() => setAssignDialog(null)}>
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                    <Input value={assignDialog.date} disabled />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">営業所</label>
                    <select
                      value={assignDialog.officeId}
                      onChange={(e) => setAssignDialog({ ...assignDialog, officeId: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      {days.find(d => d.date === assignDialog.date)?.offices.map(office => (
                        <option key={office.officeId} value={office.officeId}>
                          {office.officeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メンバー</label>
                    <Input value={availabilities.find(a => a.memberId === selectedMember)?.memberName || ''} disabled />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleAssign} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      割当
                    </Button>
                    <Button variant="outline" onClick={() => setAssignDialog(null)} className="flex-1">
                      キャンセル
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* シフト締切設定ダイアログ */}
        {showDeadlineDialog && (
          <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200 bg-white">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    シフト希望締切設定
                  </h3>
                  <button
                    onClick={() => setShowDeadlineDialog(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {format(currentMonth, 'yyyy年M月', { locale: ja })} の締切日
                    </label>
                    <Input
                      type="date"
                      value={deadlineInput}
                      onChange={(e) => setDeadlineInput(e.target.value)}
                      className="w-full"
                      min={format(currentMonth, 'yyyy-MM-01')}
                      max={format(endOfMonth(currentMonth), 'yyyy-MM-dd')}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      この日までにスタッフがシフト希望を提出する必要があります
                    </p>
                  </div>

                  {deadline && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        現在の締切: <strong>{format(deadline, 'yyyy年M月d日', { locale: ja })}</strong>
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSetDeadline} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      {deadline ? '締切を更新' : '締切を設定'}
                    </Button>
                    {deadline && (
                      <Button
                        variant="outline"
                        onClick={handleDeleteDeadline}
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        締切を削除
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowDeadlineDialog(false)}
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
