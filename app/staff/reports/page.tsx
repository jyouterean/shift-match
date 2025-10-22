'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import StaffNav from '@/components/staff-nav'
import { FileText, Plus, CheckCircle, Clock, XCircle } from 'lucide-react'

interface PriceType {
  id: string
  name: string
  unitPrice: number
}

interface ReportItem {
  priceType: PriceType
  quantity: number
}

interface Report {
  id: string
  date: string
  route: string
  startTime: string
  endTime: string
  breakMinutes: number
  workMinutes: number
  deliveryCount: number
  notes?: string
  status: string
  createdAt: string
  items?: ReportItem[]
}

export default function StaffReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    officeId: '',
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
    deliveryCount: 0,
    notes: '',
  })
  const [offices, setOffices] = useState<Array<{ id: string; name: string }>>([])
  const [priceItems, setPriceItems] = useState<{ priceTypeId: string; quantity: number | string }[]>([
    { priceTypeId: '', quantity: '' }
  ])
  const [showAddPriceTypeForm, setShowAddPriceTypeForm] = useState(false)
  const [newPriceTypeData, setNewPriceTypeData] = useState({
    name: '',
    unitPrice: 0,
    description: '',
  })

  // データ取得を並列化（高速化）
  const fetchAllData = useCallback(async () => {
    setIsLoading(true)
    try {
      // 3つのAPIを並列取得
      const [reportsRes, priceTypesRes, companiesRes] = await Promise.all([
        fetch('/api/staff/reports'),
        fetch('/api/staff/price-types'),
        fetch('/api/companies')
      ])

      // レスポンスを並列パース
      const [reportsData, priceTypesData, companiesData] = await Promise.all([
        reportsRes.json(),
        priceTypesRes.json(),
        companiesRes.json()
      ])

      // 日報データ
      if (reportsRes.ok) {
        setReports(reportsData.reports)
      }

      // 単価タイプ
      if (priceTypesRes.ok) {
        setPriceTypes(priceTypesData.priceTypes)
      }

      // 営業所情報
      if (companiesRes.ok && companiesData.company) {
        setOffices(companiesData.company.offices || [])
        // 自分のofficeIdがあれば自動選択
        if (session?.user.officeId) {
          setFormData(prev => ({ ...prev, officeId: session.user.officeId || '' }))
        } else if (companiesData.company.offices && companiesData.company.offices.length > 0) {
          // officeIdがない場合は最初の営業所を選択
          setFormData(prev => ({ ...prev, officeId: companiesData.company.offices[0].id }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session])

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

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const validItems = priceItems
        .filter(item => item.priceTypeId && item.quantity)
        .map(item => ({
          priceTypeId: item.priceTypeId,
          quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity as string)
        }))
        .filter(item => item.quantity > 0)
      
      // 営業所名を取得
      const selectedOffice = offices.find(o => o.id === formData.officeId)
      
      const response = await fetch('/api/staff/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          route: selectedOffice?.name || '営業所未選択',
          officeId: formData.officeId,
          startTime: `${formData.date}T${formData.startTime}:00`,
          endTime: `${formData.date}T${formData.endTime}:00`,
          breakMinutes: formData.breakMinutes,
          deliveryCount: formData.deliveryCount,
          notes: formData.notes,
          items: validItems.length > 0 ? validItems : undefined,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setShowCreateForm(false)
        setFormData({
          date: new Date().toISOString().split('T')[0],
          officeId: session?.user.officeId || '',
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          deliveryCount: 0,
          notes: '',
        })
        setPriceItems([{ priceTypeId: '', quantity: '' }])
        fetchAllData()
        alert('日報を提出しました')
      } else {
        alert(data.error || '提出に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const addPriceItem = () => {
    setPriceItems([...priceItems, { priceTypeId: '', quantity: '' }])
  }

  const removePriceItem = (index: number) => {
    setPriceItems(priceItems.filter((_, i) => i !== index))
  }

  const updatePriceItem = (index: number, field: string, value: any) => {
    const updated = [...priceItems]
    updated[index] = { ...updated[index], [field]: value }
    setPriceItems(updated)
  }

  const calculateTotalAmount = () => {
    return priceItems.reduce((total, item) => {
      const priceType = priceTypes.find(pt => pt.id === item.priceTypeId)
      if (priceType) {
        const quantity = typeof item.quantity === 'number' ? item.quantity : (item.quantity ? parseInt(item.quantity) : 0)
        return total + (priceType.unitPrice * quantity)
      }
      return total
    }, 0)
  }

  const handleAddPriceType = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/staff/price-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPriceTypeData),
      })

      const data = await response.json()
      if (response.ok) {
        setShowAddPriceTypeForm(false)
        setNewPriceTypeData({ name: '', unitPrice: 0, description: '' })
        fetchAllData()
        alert('新しい単価タイプを追加しました')
      } else {
        alert(data.error || '追加に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!confirm('この日報を削除しますか？')) return

    try {
      const response = await fetch(`/api/staff/reports?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (response.ok) {
        fetchAllData()
        alert('日報を削除しました')
      } else {
        alert(data.error || '削除に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '承認済み'
      case 'REJECTED':
        return '却下'
      case 'DRAFT':
        return '下書き'
      default:
        return '承認待ち'
    }
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
        <div className="mb-6 sm:mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
              マイ日報
            </h1>
            <p className="text-sm sm:text-base text-gray-600">日報を提出します（{reports.length}件）</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>

        {/* 日報一覧 */}
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{new Date(report.date).toLocaleDateString('ja-JP')}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(report.status)}
                    <span className="text-sm font-normal text-gray-600">
                      {getStatusText(report.status)}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">ルート</p>
                    <p className="font-medium">{report.route}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">配送数</p>
                    <p className="font-medium">{report.deliveryCount}件</p>
                  </div>
                  <div>
                    <p className="text-gray-500">勤務時間</p>
                    <p className="font-medium">
                      {new Date(report.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(report.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">実働時間</p>
                    <p className="font-medium">{Math.floor(report.workMinutes / 60)}時間{report.workMinutes % 60}分</p>
                  </div>
                </div>
                {report.items && report.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">単価明細</p>
                    <div className="space-y-1">
                      {report.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.priceType.name} × {item.quantity}
                          </span>
                          <span className="font-medium">
                            ¥{(item.priceType.unitPrice * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-base pt-2 border-t">
                        <span>合計</span>
                        <span className="text-green-600">
                          ¥{report.items.reduce((sum, item) => sum + (item.priceType.unitPrice * item.quantity), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {report.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-gray-600">{report.notes}</p>
                  </div>
                )}
                
                {/* 削除ボタン（未承認の日報のみ） */}
                {report.status === 'SUBMITTED' && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteReport(report.id)}
                      className="w-full text-red-600 hover:bg-red-50"
                    >
                      この日報を削除
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {reports.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>日報がありません</p>
              <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={() => setShowCreateForm(true)}>
                最初の日報を提出
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 作成モーダル */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8 shadow-2xl border-2 border-blue-200 bg-white">
            <CardHeader>
              <CardTitle>日報提出</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateReport} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label htmlFor="officeId">営業所 *</Label>
                    <select
                      id="officeId"
                      value={formData.officeId}
                      onChange={(e) => setFormData({ ...formData, officeId: e.target.value })}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">選択してください</option>
                      {offices.map((office) => (
                        <option key={office.id} value={office.id}>
                          {office.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                  <div>
                    <Label htmlFor="breakMinutes">休憩（分）</Label>
                    <Input
                      id="breakMinutes"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.breakMinutes}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        setFormData({ ...formData, breakMinutes: val === '' ? 0 : parseInt(val) })
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="deliveryCount">配送数</Label>
                  <Input
                    id="deliveryCount"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.deliveryCount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      setFormData({ ...formData, deliveryCount: val === '' ? 0 : parseInt(val) })
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                  />
                </div>

                {/* 単価×個数 */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label>単価明細</Label>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => setShowAddPriceTypeForm(true)} 
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        単価タイプ追加
                      </Button>
                      <Button type="button" size="sm" onClick={addPriceItem} variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        明細追加
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {priceItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">単価タイプ</Label>
                          <select
                            value={item.priceTypeId}
                            onChange={(e) => updatePriceItem(index, 'priceTypeId', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">選択してください</option>
                            {priceTypes.map((pt) => (
                              <option key={pt.id} value={pt.id}>
                                {pt.name} (¥{pt.unitPrice})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <Label className="text-xs">個数</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '')
                              updatePriceItem(index, 'quantity', val === '' ? '' : parseInt(val))
                            }}
                            onFocus={(e) => e.target.select()}
                            placeholder="個数"
                          />
                        </div>
                        <div className="w-28 text-right">
                          <Label className="text-xs">小計</Label>
                          <p className="text-sm font-bold">
                            ¥{(priceTypes.find(pt => pt.id === item.priceTypeId)?.unitPrice || 0) * (typeof item.quantity === 'number' ? item.quantity : (item.quantity ? parseInt(item.quantity) : 0))}
                          </p>
                        </div>
                        {priceItems.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removePriceItem(index)}
                            className="text-red-600"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">合計金額</p>
                        <p className="text-2xl font-bold text-green-600">
                          ¥{calculateTotalAmount().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">備考</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="特記事項があれば..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">提出</Button>
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

      {/* 単価タイプ追加モーダル */}
      {showAddPriceTypeForm && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200 bg-white">
            <CardHeader>
              <CardTitle>新しい単価タイプを追加</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPriceType} className="space-y-4">
                <div>
                  <Label htmlFor="new-price-name">単価タイプ名 *</Label>
                  <Input
                    id="new-price-name"
                    value={newPriceTypeData.name}
                    onChange={(e) => setNewPriceTypeData({ ...newPriceTypeData, name: e.target.value })}
                    required
                    placeholder="例: 特急配送"
                  />
                </div>

                <div>
                  <Label htmlFor="new-price-unit">単価（円）*</Label>
                  <Input
                    id="new-price-unit"
                    type="number"
                    min="0"
                    value={newPriceTypeData.unitPrice}
                    onChange={(e) => setNewPriceTypeData({ ...newPriceTypeData, unitPrice: parseInt(e.target.value) || 0 })}
                    required
                    placeholder="例: 800"
                  />
                </div>

                <div>
                  <Label htmlFor="new-price-desc">説明</Label>
                  <Input
                    id="new-price-desc"
                    value={newPriceTypeData.description}
                    onChange={(e) => setNewPriceTypeData({ ...newPriceTypeData, description: e.target.value })}
                    placeholder="例: 急ぎの配送"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    追加
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddPriceTypeForm(false)}
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
