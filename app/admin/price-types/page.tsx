'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AdminNav from '@/components/admin-nav'
import { DollarSign, Plus, Edit, Trash2 } from 'lucide-react'

interface PriceType {
  id: string
  name: string
  unitPrice: number
  description?: string
  isActive: boolean
  _count: {
    reportItems: number
  }
}

export default function AdminPriceTypesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPriceType, setEditingPriceType] = useState<PriceType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    unitPrice: 0,
    description: '',
    isActive: true,
  })

  const fetchPriceTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/price-types')
      const data = await response.json()
      if (response.ok) {
        setPriceTypes(data.priceTypes)
      }
    } catch (error) {
      console.error('Failed to fetch price types:', error)
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

    fetchPriceTypes()
  }, [session, status, router, fetchPriceTypes])

  const handleCreatePriceType = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/price-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (response.ok) {
        setShowCreateForm(false)
        setFormData({ name: '', unitPrice: 0, description: '', isActive: true })
        fetchPriceTypes()
        alert('単価タイプを作成しました')
      } else {
        alert(data.error || '作成に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleUpdatePriceType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPriceType) return

    try {
      const response = await fetch('/api/admin/price-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPriceType.id,
          ...formData,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setEditingPriceType(null)
        setFormData({ name: '', unitPrice: 0, description: '', isActive: true })
        fetchPriceTypes()
        alert('単価タイプを更新しました')
      } else {
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleToggleActive = async (priceType: PriceType) => {
    try {
      const response = await fetch('/api/admin/price-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: priceType.id,
          isActive: !priceType.isActive,
        }),
      })

      if (response.ok) {
        fetchPriceTypes()
      }
    } catch (error) {
      alert('切り替えに失敗しました')
    }
  }

  const handleDeletePriceType = async (id: string, name: string) => {
    if (!confirm(`${name}を削除しますか？`)) return

    try {
      const response = await fetch(`/api/admin/price-types?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (response.ok) {
        fetchPriceTypes()
        alert('単価タイプを削除しました')
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
              <DollarSign className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              単価設定
            </h1>
            <p className="text-sm sm:text-base text-gray-600">日報で使用する単価タイプ（{priceTypes.length}種類）</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            追加
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {priceTypes.map((priceType) => (
            <Card key={priceType.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{priceType.name}</span>
                  <button
                    onClick={() => handleToggleActive(priceType)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      priceType.isActive 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {priceType.isActive ? '有効' : '無効'}
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-2xl font-bold text-blue-600">
                    ¥{priceType.unitPrice.toLocaleString()}
                  </p>
                  {priceType.description && (
                    <p className="text-sm text-gray-600">{priceType.description}</p>
                  )}
                  <p className="text-xs text-gray-500 pt-2">
                    使用: {priceType._count.reportItems}件
                  </p>
                  
                  {/* 編集・削除ボタン */}
                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPriceType(priceType)
                        setFormData({
                          name: priceType.name,
                          unitPrice: priceType.unitPrice,
                          description: priceType.description || '',
                          isActive: priceType.isActive,
                        })
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePriceType(priceType.id, priceType.name)}
                      className="flex-1 text-red-600 hover:bg-red-50"
                      disabled={priceType._count.reportItems > 0}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      削除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {priceTypes.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>単価タイプがありません</p>
              <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                最初の単価タイプを作成
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 作成モーダル */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>単価タイプ追加</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePriceType} className="space-y-4">
                <div>
                  <Label htmlFor="name">単価タイプ名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="例: 通常配送"
                  />
                </div>

                <div>
                  <Label htmlFor="unitPrice">単価（円）*</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseInt(e.target.value) || 0 })}
                    required
                    placeholder="例: 500"
                  />
                </div>

                <div>
                  <Label htmlFor="description">説明</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="例: 通常の配送単価"
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
      {editingPriceType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>単価タイプ編集</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePriceType} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">単価タイプ名 *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-unitPrice">単価（円）*</Label>
                  <Input
                    id="edit-unitPrice"
                    type="number"
                    min="0"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">説明</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label>有効/無効</Label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.isActive ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">更新</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingPriceType(null)}
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
