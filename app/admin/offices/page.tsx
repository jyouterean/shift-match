'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AdminNav from '@/components/admin-nav'
import { Building2, Plus, Edit, Trash2, Users } from 'lucide-react'

interface Office {
  id: string
  name: string
  address?: string
  _count: {
    users: number
  }
}

export default function AdminOfficesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [offices, setOffices] = useState<Office[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingOffice, setEditingOffice] = useState<Office | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
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
    } finally {
      setIsLoading(false)
    }
  }, [])

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

    fetchOffices()
  }, [session, status, router, fetchOffices])

  const handleCreateOffice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (response.ok) {
        setShowCreateForm(false)
        setFormData({ name: '', address: '' })
        fetchOffices()
        alert('営業所を作成しました')
      } else {
        alert(data.error || '作成に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleUpdateOffice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOffice) return

    try {
      const response = await fetch('/api/admin/offices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOffice.id,
          ...formData,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setEditingOffice(null)
        fetchOffices()
        alert('営業所情報を更新しました')
      } else {
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleDeleteOffice = async (id: string, name: string) => {
    if (!confirm(`${name}を削除しますか？`)) return

    try {
      const response = await fetch(`/api/admin/offices?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (response.ok) {
        fetchOffices()
        alert('営業所を削除しました')
      } else {
        alert(data.error || '削除に失敗しました')
      }
    } catch (error) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              営業所管理
            </h1>
            <p className="text-sm sm:text-base text-gray-600">営業所を管理します（{offices.length}か所）</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            追加
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offices.map((office) => (
            <Card key={office.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {office.name}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingOffice(office)
                        setFormData({
                          name: office.name,
                          address: office.address || '',
                        })
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteOffice(office.id, office.name)}
                      className="text-red-600 hover:bg-red-50"
                      disabled={office._count.users > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {office.address && (
                    <p className="text-gray-600">📍 {office.address}</p>
                  )}
                  <p className="text-gray-500 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    所属メンバー: {office._count.users}人
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => router.push(`/admin/offices/${office.id}/requirements`)}
                  >
                    📅 必要人数設定
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {offices.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>営業所がありません</p>
              <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                最初の営業所を作成
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 作成モーダル */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200 bg-white">
            <CardHeader>
              <CardTitle>営業所追加</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOffice} className="space-y-4">
                <div>
                  <Label htmlFor="create-name">営業所名 *</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="例: 東京営業所"
                  />
                </div>

                <div>
                  <Label htmlFor="create-address">住所</Label>
                  <Input
                    id="create-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="例: 東京都渋谷区..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">作成</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 編集モーダル */}
      {editingOffice && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200 bg-white">
            <CardHeader>
              <CardTitle>営業所編集</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateOffice} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">営業所名 *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-address">住所</Label>
                  <Input
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">更新</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingOffice(null)}
                    className="flex-1"
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
  )
}
