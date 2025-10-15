'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AdminNav from '@/components/admin-nav'
import { ErrorBoundary } from '@/components/error-boundary'
import { Plus, Trash2, Edit, Calendar, Users, Building2 } from 'lucide-react'

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

export default function ManageShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [formData, setFormData] = useState({
    userId: '',
    officeId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '03:00',
    notes: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const [shiftsRes, usersRes, officesRes] = await Promise.all([
        fetch('/api/admin/shifts'),
        fetch('/api/admin/members'),
        fetch('/api/admin/offices'),
      ])

      const [shiftsData, usersData, officesData] = await Promise.all([
        shiftsRes.json(),
        usersRes.json(),
        officesRes.json(),
      ])

      if (shiftsRes.ok) setShifts(shiftsData.shifts || [])
      if (usersRes.ok) setUsers(usersData.users || [])
      if (officesRes.ok) setOffices(officesData.offices || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
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

    fetchData()
  }, [session, status, router, fetchData])

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.userId || !formData.officeId) {
      alert('従業員と営業所を選択してください')
      return
    }

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`)
      let endDateTime = new Date(`${formData.date}T${formData.endTime}:00`)
      
      // 終了時刻が開始時刻より前の場合は翌日
      if (endDateTime <= startDateTime) {
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
      }

      const response = await fetch('/api/admin/shifts', {
        method: editingShift ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingShift ? { id: editingShift.id } : {}),
          userId: formData.userId,
          officeId: formData.officeId,
          date: formData.date,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          notes: formData.notes,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        setShowCreateForm(false)
        setEditingShift(null)
        setFormData({
          userId: '',
          officeId: '',
          date: new Date().toISOString().split('T')[0],
          startTime: '18:00',
          endTime: '03:00',
          notes: '',
        })
        fetchData()
      } else {
        alert(data.error || '保存に失敗しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  const handleDeleteShift = async (id: string) => {
    if (!confirm('このシフトを削除しますか？')) return

    try {
      const response = await fetch(`/api/admin/shifts?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchData()
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    }
  }

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift)
    setFormData({
      userId: shift.user.id,
      officeId: shift.office.id,
      date: shift.date.split('T')[0],
      startTime: new Date(shift.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }),
      endTime: new Date(shift.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }),
      notes: shift.notes || '',
    })
    setShowCreateForm(true)
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

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
        <AdminNav />
        
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                  シフト一覧管理
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {shifts.length}件のシフト
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditingShift(null)
                  setFormData({
                    userId: '',
                    officeId: '',
                    date: new Date().toISOString().split('T')[0],
                    startTime: '18:00',
                    endTime: '03:00',
                    notes: '',
                  })
                  setShowCreateForm(true)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                新規作成
              </Button>
            </div>
          </div>

          {/* シフト一覧 */}
          <div className="space-y-3">
            {shifts.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">シフトがまだ登録されていません</p>
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      最初のシフトを作成
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              shifts.map((shift) => (
                <Card key={shift.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <div className="text-xs text-gray-500">日付</div>
                          <div className="font-semibold">
                            {new Date(shift.date).toLocaleDateString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short',
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            従業員
                          </div>
                          <div className="font-semibold">{shift.user.name}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            営業所
                          </div>
                          <div className="font-semibold">{shift.office.name}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">時間</div>
                          <div className="font-semibold text-sm">
                            {new Date(shift.startTime).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' - '}
                            {new Date(shift.endTime).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleEditShift(shift)}
                          variant="outline"
                          className="h-9 px-3"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteShift(shift.id)}
                          variant="outline"
                          className="h-9 px-3 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {shift.notes && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        📝 {shift.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* 作成・編集フォーム */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>
                  {editingShift ? 'シフトを編集' : '新規シフト作成'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateShift} className="space-y-4">
                  <div>
                    <Label htmlFor="userId">従業員 *</Label>
                    <select
                      id="userId"
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      required
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="">選択してください</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="officeId">営業所 *</Label>
                    <select
                      id="officeId"
                      value={formData.officeId}
                      onChange={(e) => setFormData({ ...formData, officeId: e.target.value })}
                      required
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="">選択してください</option>
                      {offices.map((office) => (
                        <option key={office.id} value={office.id}>
                          {office.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="date">日付 *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">開始時刻 *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">終了時刻 *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">メモ（任意）</Label>
                    <Input
                      id="notes"
                      type="text"
                      placeholder="備考があれば入力"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {editingShift ? '更新' : '作成'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false)
                        setEditingShift(null)
                      }}
                      variant="outline"
                    >
                      キャンセル
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

export const dynamic = 'force-dynamic'

