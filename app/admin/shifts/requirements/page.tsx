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
import { Settings, Plus, Trash2, Building2 } from 'lucide-react'

interface Office {
  id: string
  name: string
  address: string | null
}

interface Requirement {
  id: string
  date: string
  requiredCount: number
  startTime: string
  endTime: string
  notes: string | null
  office: {
    id: string
    name: string
  }
}

export default function RequirementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [offices, setOffices] = useState<Office[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    officeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    requiredCount: 3,
    startTime: '18:00',
    endTime: '03:00',
    notes: '',
    excludeWeekends: false,
  })

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

  const fetchRequirements = useCallback(async () => {
    try {
      const today = new Date()
      const future = new Date(today)
      future.setDate(future.getDate() + 30)

      const response = await fetch(
        `/api/admin/office-requirements?startDate=${today.toISOString().split('T')[0]}&endDate=${future.toISOString().split('T')[0]}`
      )
      const data = await response.json()
      if (response.ok) {
        setRequirements(data.requirements)
      }
    } catch (error) {
      console.error('Failed to fetch requirements:', error)
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

    fetchOffices()
    fetchRequirements()
  }, [session, status, router, fetchOffices, fetchRequirements])

  const handleCreateRequirements = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.officeId) {
      alert('営業所を選択してください')
      return
    }

    try {
      const response = await fetch('/api/admin/office-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        setShowCreateForm(false)
        fetchRequirements()
        setFormData({
          officeId: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          requiredCount: 3,
          startTime: '18:00',
          endTime: '03:00',
          notes: '',
          excludeWeekends: false,
        })
      } else {
        alert(data.error || '作成に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleDeleteRequirement = async (id: string) => {
    if (!confirm('この設定を削除しますか？')) return

    try {
      const response = await fetch(`/api/admin/office-requirements?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchRequirements()
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
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

  // 営業所ごとにグループ化
  const requirementsByOffice = requirements.reduce((acc, req) => {
    const officeId = req.office.id
    if (!acc[officeId]) {
      acc[officeId] = {
        officeName: req.office.name,
        requirements: [],
      }
    }
    acc[officeId].requirements.push(req)
    return acc
  }, {} as Record<string, { officeName: string; requirements: Requirement[] }>)

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
        <AdminNav />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              必要人数設定
            </h1>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              一括設定
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            各営業所の日別必要人数を設定します
          </p>
        </div>

        {/* 営業所ごとの設定一覧 */}
        <div className="space-y-6">
          {Object.keys(requirementsByOffice).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">必要人数の設定がまだありません</p>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    最初の設定を追加
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            Object.entries(requirementsByOffice).map(([officeId, data]) => (
              <Card key={officeId}>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {data.officeName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">日付</th>
                          <th className="text-left py-2 px-2">必要人数</th>
                          <th className="text-left py-2 px-2">時間帯</th>
                          <th className="text-left py-2 px-2">メモ</th>
                          <th className="text-right py-2 px-2">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.requirements.slice(0, 10).map((req) => (
                          <tr key={req.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2">
                              {new Date(req.date).toLocaleDateString('ja-JP')}
                            </td>
                            <td className="py-2 px-2 font-semibold">
                              {req.requiredCount}名
                            </td>
                            <td className="py-2 px-2 text-gray-600">
                              {req.startTime} - {req.endTime}
                            </td>
                            <td className="py-2 px-2 text-gray-600 text-xs">
                              {req.notes || '-'}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <Button
                                onClick={() => handleDeleteRequirement(req.id)}
                                variant="outline"
                                className="h-8 px-2"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.requirements.length > 10 && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        他 {data.requirements.length - 10} 件
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 一括作成フォーム */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>必要人数を一括設定</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRequirements} className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">開始日 *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">終了日 *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="requiredCount">必要人数 *</Label>
                  <Input
                    id="requiredCount"
                    type="number"
                    min="1"
                    value={formData.requiredCount}
                    onChange={(e) => setFormData({ ...formData, requiredCount: parseInt(e.target.value) })}
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
                    placeholder="例：通常シフト"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="excludeWeekends"
                    type="checkbox"
                    checked={formData.excludeWeekends}
                    onChange={(e) => setFormData({ ...formData, excludeWeekends: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="excludeWeekends" className="cursor-pointer">
                    週末（土日）を除外
                  </Label>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    一括設定
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
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

