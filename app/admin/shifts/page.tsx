'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Download,
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

interface MonthCacheEntry {
  days: DaySummary[]
  availabilities: Availability[]
  deadline: string | null
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
    isAvailable: boolean // 希望日かどうか
  } | null>(null)
  
  // 割当処理中フラグ（重複防止）
  const [isAssigning, setIsAssigning] = useState(false)
  
  // 仮決定シフト（一括保存用）
  const [pendingAssignments, setPendingAssignments] = useState<Array<{
    id: string // 一時ID
    date: string
    officeId: string
    officeName: string
    memberId: string
    memberName: string
    isAvailable: boolean
  }>>([])
  
  // 日別シフト詳細ダイアログ
  const [dayDetailDialog, setDayDetailDialog] = useState<{
    open: boolean
    date: string
    shifts: any[]
  } | null>(null)
  
  // Excelプレビューダイアログ
  const [showExcelPreview, setShowExcelPreview] = useState(false)

  const monthCacheRef = useRef<Record<string, MonthCacheEntry>>({})
  const fetchAbortRef = useRef<AbortController | null>(null)

  const applyCachedMonth = useCallback((key: string) => {
    const cached = monthCacheRef.current[key]
    if (!cached) return

    setDays(cached.days)
    setAvailabilities(cached.availabilities)

    if (cached.deadline) {
      const deadlineDate = new Date(cached.deadline)
      setDeadline(deadlineDate)
      setDeadlineInput(format(deadlineDate, 'yyyy-MM-dd'))
    } else {
      setDeadline(null)
      setDeadlineInput('')
    }

    setIsLoading(false)
  }, [])

  // 認証チェック
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
  }, [session, status, router])

  useEffect(() => {
    monthCacheRef.current = {}
  }, [session?.user?.companyId])

  // データ取得（キャッシュ＋中断対応で高速化）
  const fetchData = useCallback(async () => {
    const monthKey = format(currentMonth, 'yyyy-MM')
    const year = currentMonth.getFullYear()
    const monthNum = currentMonth.getMonth() + 1
    const hasCache = Boolean(monthCacheRef.current[monthKey])

    if (!hasCache) {
      setIsLoading(true)
    }

    setError(null)

    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort()
    }

    const controller = new AbortController()
    fetchAbortRef.current = controller

    try {
      const [summaryRes, availRes, deadlineRes] = await Promise.all([
        fetch(`/api/admin/shifts?month=${monthKey}`, {
          signal: controller.signal,
          cache: 'no-store',
        }),
        fetch(`/api/admin/availability?month=${monthKey}`, {
          signal: controller.signal,
          cache: 'no-store',
        }),
        fetch(`/api/admin/shift-deadline?year=${year}&month=${monthNum}`, {
          signal: controller.signal,
          cache: 'no-store',
        }),
      ])

      const [summaryData, availData, deadlineData] = await Promise.all([
        summaryRes.json(),
        availRes.json(),
        deadlineRes.json(),
      ])

      if (!summaryRes.ok) {
        setError(summaryData.error || 'データの取得に失敗しました')
      }

      const previous = monthCacheRef.current[monthKey] || {
        days: [] as DaySummary[],
        availabilities: [] as Availability[],
        deadline: null as string | null,
      }

      const cacheEntry: MonthCacheEntry = {
        days: summaryRes.ok ? (summaryData.days || []) : previous.days,
        availabilities: availRes.ok ? (availData.availabilities || []) : previous.availabilities,
        deadline: deadlineRes.ok && deadlineData?.deadline
          ? deadlineData.deadline.deadlineDate
          : previous.deadline,
      }

      monthCacheRef.current[monthKey] = cacheEntry
      applyCachedMonth(monthKey)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return
      }
      console.error('Failed to fetch data:', err)
      setError('データの取得中にエラーが発生しました')
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [currentMonth, applyCachedMonth])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
      return
    }

    const monthKey = format(currentMonth, 'yyyy-MM')
    if (monthCacheRef.current[monthKey]) {
      applyCachedMonth(monthKey)
    }

    fetchData()

    return () => {
      fetchAbortRef.current?.abort()
    }
  }, [session, status, currentMonth, fetchData, applyCachedMonth])

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
  const handleDayClick = async (dateStr: string) => {
    const day = days.find(d => d.date === dateStr)
    if (!day) return

    // 選択中のメンバーがいる場合は割当ダイアログ
    if (selectedMember) {
      const member = availabilities.find(a => a.memberId === selectedMember)
      if (!member) return

      const defaultOffice = day.offices.find(o => o.status === 'SHORTAGE') || day.offices[0]
      if (defaultOffice) {
        // 希望日かどうかをチェック
        const isAvailable = member.availableDates.includes(dateStr)
        
        setAssignDialog({
          open: true,
          date: dateStr,
          officeId: defaultOffice.officeId,
          isAvailable, // 希望日かどうかを記録
        })
      }
    } else {
      // メンバー未選択の場合は日別シフト詳細を表示
      await fetchDayShifts(dateStr)
    }
  }
  
  // 日別シフト詳細を取得
  const fetchDayShifts = async (dateStr: string) => {
    try {
      // 日付文字列を正しくフォーマット（YYYY-MM-DD T00:00:00Z形式）
      const startDateTime = `${dateStr}T00:00:00.000Z`
      const endDateTime = `${dateStr}T23:59:59.999Z`
      
      const res = await fetch(`/api/admin/shifts?startDate=${startDateTime}&endDate=${endDateTime}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (res.ok) {
        // 既存のシフト + 仮決定のシフトをマージ
        const existingShifts = data.shifts || []
        const pendingForDay = pendingAssignments
          .filter(p => p.date === dateStr)
          .map(p => ({
            id: p.id,
            date: dateStr,
            startTime: `${dateStr}T09:00:00`,
            endTime: `${dateStr}T18:00:00`,
            status: 'PENDING' as const,
            user: {
              id: p.memberId,
              name: `${p.memberName} (仮決定)`,
              email: '',
            },
            office: {
              id: p.officeId,
              name: p.officeName,
            },
            notes: '',
          }))
        
        setDayDetailDialog({
          open: true,
          date: dateStr,
          shifts: [...existingShifts, ...pendingForDay]
        })
      } else {
        alert('シフト情報の取得に失敗しました')
      }
    } catch (error) {
      console.error('Fetch day shifts error:', error)
      alert('エラーが発生しました')
    }
  }
  
  // シフトを削除（既存シフトまたは仮決定シフト）
  const handleDeleteShift = async (shiftId: string, shiftStatus?: string) => {
    // 仮決定シフトの場合はローカルで削除
    if (shiftStatus === 'PENDING') {
      handleRemovePendingAssignment(shiftId)
      if (dayDetailDialog) {
        await fetchDayShifts(dayDetailDialog.date)
      }
      return
    }
    
    // 既存シフトの場合はAPIで削除
    if (!confirm('このシフトを削除してもよろしいですか？')) return
    
    try {
      const res = await fetch('/api/admin/shifts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: shiftId })
      })
      
      if (res.ok) {
        // ダイアログ内のシフトリストを更新
        if (dayDetailDialog) {
          await fetchDayShifts(dayDetailDialog.date)
        }
        // カレンダーデータも再取得
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || 'シフトの削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete shift error:', error)
      alert('エラーが発生しました')
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

  // 割当を仮決定リストに追加
  const handleAssign = () => {
    if (!assignDialog || !selectedMember) return

    const member = availabilities.find(a => a.memberId === selectedMember)
    if (!member) return

    const day = days.find(d => d.date === assignDialog.date)
    if (!day) return

    const office = day.offices.find(o => o.officeId === assignDialog.officeId)
    if (!office) return

    // 希望日でない場合は確認ダイアログを表示
    if (!assignDialog.isAvailable) {
      const confirmed = confirm(
        '⚠️ この日は希望日ではありません。\n' +
        'それでも仮決定してもよろしいですか？'
      )
      if (!confirmed) {
        return
      }
    }

    // 仮決定リストに追加
    const newAssignment = {
      id: `temp-${Date.now()}-${Math.random()}`,
      date: assignDialog.date,
      officeId: assignDialog.officeId,
      officeName: office.officeName,
      memberId: selectedMember,
      memberName: member.memberName,
      isAvailable: assignDialog.isAvailable,
    }

    setPendingAssignments(prev => [...prev, newAssignment])
    setAssignDialog(null)
  }
  
  // 仮決定を一括保存
  const handleSavePendingAssignments = async () => {
    if (pendingAssignments.length === 0) {
      alert('保存するシフトがありません')
      return
    }

    if (!confirm(`${pendingAssignments.length}件のシフトを一括保存しますか？`)) {
      return
    }

    setIsAssigning(true)

    try {
      const promises = pendingAssignments.map(assignment =>
        fetch('/api/admin/shifts/assignment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: assignment.date,
            officeId: assignment.officeId,
            memberId: assignment.memberId,
          }),
        })
      )

      const results = await Promise.all(promises)
      const failedCount = results.filter(r => !r.ok).length

      if (failedCount === 0) {
        alert(`${pendingAssignments.length}件のシフトを保存しました`)
        setPendingAssignments([])
        fetchData()
      } else {
        alert(`一部のシフト保存に失敗しました（失敗: ${failedCount}件）`)
        // 成功したものは削除して、失敗したものだけ残す
        const failedAssignments = await Promise.all(
          pendingAssignments.map(async (assignment, index) => {
            if (results[index].ok) return null
            return assignment
          })
        )
        setPendingAssignments(failedAssignments.filter(Boolean) as typeof pendingAssignments)
        fetchData()
      }
    } catch (err) {
      console.error('Bulk save error:', err)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsAssigning(false)
    }
  }
  
  // 仮決定をキャンセル
  const handleCancelPendingAssignments = () => {
    if (pendingAssignments.length === 0) return
    
    if (confirm(`${pendingAssignments.length}件の仮決定をキャンセルしますか？`)) {
      setPendingAssignments([])
    }
  }
  
  // 個別の仮決定を削除
  const handleRemovePendingAssignment = (id: string) => {
    setPendingAssignments(prev => prev.filter(p => p.id !== id))
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
                    
                    {/* シフト確認（Excel出力）ボタン */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold"
                      title="シフト表をプレビュー・Excel出力"
                      onClick={() => setShowExcelPreview(true)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      シフト確認
                    </Button>
                  </div>
                </div>

                {/* 凡例 */}
                <div className="flex gap-4 text-sm mb-3">
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
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-dashed border-purple-700"></div>
                    <span>仮決定</span>
                  </div>
                </div>

                {/* 仮決定の一括保存・キャンセルボタン */}
                {pendingAssignments.length > 0 && (
                  <div className="flex gap-2 items-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex-1 text-sm font-medium text-purple-900">
                      💾 {pendingAssignments.length}件のシフトが仮決定されています
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSavePendingAssignments}
                      disabled={isAssigning}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isAssigning ? '保存中...' : '一括保存'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelPendingAssignments}
                      disabled={isAssigning}
                      className="border-purple-300 text-purple-700"
                    >
                      キャンセル
                    </Button>
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
                    const day = days.find(d => d.date === dateStr)
                    const isCurrentMonth = dayDate.getMonth() === currentMonth.getMonth()
                    const isFiltered = calendarFilter !== 'all' && day && !filteredDays.find(d => d.date === dateStr)

                    // 選択中メンバーの可日かチェック
                    const selectedMemberData = selectedMember ? availabilities.find(a => a.memberId === selectedMember) : null
                    const isAvailableDay = selectedMemberData?.availableDates.includes(dateStr)
                    
                    // この日の仮決定シフト数
                    const pendingCount = pendingAssignments.filter(p => p.date === dateStr).length

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
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-semibold ${
                              !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              {dayDate.getDate()}
                            </span>
                            {pendingCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded border border-purple-700">
                                +{pendingCount}
                              </span>
                            )}
                          </div>
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
                  {/* 希望日でない場合の警告 */}
                  {!assignDialog.isAvailable && (
                    <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex items-start gap-3">
                      <div className="text-amber-600 mt-0.5">⚠️</div>
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900 mb-1">希望日ではありません</p>
                        <p className="text-sm text-amber-700">
                          この従業員は{format(new Date(assignDialog.date), 'M月d日', { locale: ja })}を希望日として登録していません。
                          割当を実行する前に確認してください。
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* 希望日の場合の確認表示 */}
                  {assignDialog.isAvailable && (
                    <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-4 flex items-start gap-3">
                      <div className="text-emerald-600 mt-0.5">✓</div>
                      <div className="flex-1">
                        <p className="font-semibold text-emerald-900 mb-1">希望日です</p>
                        <p className="text-sm text-emerald-700">
                          この従業員は{format(new Date(assignDialog.date), 'M月d日', { locale: ja })}を希望日として登録しています。
                        </p>
                      </div>
                    </div>
                  )}

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
                    <Button 
                      onClick={handleAssign} 
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      💾 仮決定
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setAssignDialog(null)} 
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

        {/* 日別シフト詳細ダイアログ */}
        {dayDetailDialog && (
          <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl shadow-2xl border-2 border-blue-200 bg-white max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {format(new Date(dayDetailDialog.date), 'yyyy年M月d日(E)', { locale: ja })} のシフト
                  </h3>
                  <button
                    onClick={() => setDayDetailDialog(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {dayDetailDialog.shifts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>この日のシフトはまだ登録されていません</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayDetailDialog.shifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                          shift.status === 'PENDING' 
                            ? 'bg-purple-50 border-purple-200 border-2 border-dashed hover:bg-purple-100' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-900">{shift.user?.name || '不明'}</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {shift.office?.name || '未配属'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              shift.status === 'PENDING' ? 'bg-purple-100 text-purple-700 border border-purple-300' :
                              shift.status === 'SCHEDULED' ? 'bg-amber-100 text-amber-700' :
                              shift.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                              shift.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {shift.status === 'PENDING' ? '💾 仮決定' :
                               shift.status === 'SCHEDULED' ? '予定' :
                               shift.status === 'IN_PROGRESS' ? '進行中' :
                               shift.status === 'COMPLETED' ? '完了' :
                               shift.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')}
                            {shift.notes && <span className="ml-3 text-gray-500">備考: {shift.notes}</span>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`ml-4 ${
                            shift.status === 'PENDING'
                              ? 'border-purple-300 text-purple-600 hover:bg-purple-100'
                              : 'border-red-300 text-red-600 hover:bg-red-50'
                          }`}
                          onClick={() => handleDeleteShift(shift.id, shift.status)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {shift.status === 'PENDING' ? '取消' : '削除'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDayDetailDialog(null)}
                  >
                    閉じる
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Excelプレビューダイアログ */}
        {showExcelPreview && (
          <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-5xl shadow-2xl border-2 border-blue-200 bg-white max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {format(currentMonth, 'yyyy年M月', { locale: ja })} シフト表プレビュー
                  </h3>
                  <button
                    onClick={() => setShowExcelPreview(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  以下の内容でExcelファイルを出力します。問題なければ「Excel出力」ボタンをクリックしてください。
                </p>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📊 出力内容</h4>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                      <li>対象月: {format(currentMonth, 'yyyy年M月', { locale: ja })}</li>
                      <li>スタッフ別の日別シフト一覧</li>
                      <li>営業所、勤務時間を含む</li>
                      <li>営業所別の日別人数集計</li>
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📄 ファイル形式</h4>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                      <li>形式: CSV (Excel互換)</li>
                      <li>エンコード: UTF-8 (BOM付き)</li>
                      <li>ファイル名: シフト表_{format(currentMonth, 'yyyy年M月', { locale: ja })}.csv</li>
                      <li>文字化け: なし（Excelで直接開けます）</li>
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 活用方法</h4>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                      <li>ダウンロード後、Excelで開いて確認・編集</li>
                      <li>印刷して事務所に掲示</li>
                      <li>スタッフへの共有（PDF変換推奨）</li>
                      <li>勤怠管理・給与計算の資料として活用</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                    <strong>📌 注意:</strong> 個人情報が含まれるため、取り扱いには十分ご注意ください。
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowExcelPreview(false)}
                >
                  キャンセル
                </Button>
                <a
                  href={`/api/admin/shifts/export-excel?month=${format(currentMonth, 'yyyy-MM')}`}
                  download={`シフト表_${format(currentMonth, 'yyyy年M月', { locale: ja })}.csv`}
                  onClick={() => setShowExcelPreview(false)}
                >
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Download className="h-4 w-4 mr-2" />
                    Excel出力
                  </Button>
                </a>
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
