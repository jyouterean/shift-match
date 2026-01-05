'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import AdminNav from '@/components/admin-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp, Users, Building2, Calendar, DollarSign, Search, Download } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface SalesStats {
  totalSales: number
  totalReports: number
  userSales: Array<{
    name: string
    amount: number
    count: number
  }>
  officeSales: Array<{
    name: string
    amount: number
    count: number
  }>
  period: string
}

interface DetailedReport {
  id: string
  date: string
  user: {
    name: string
  }
  office: {
    name: string
  }
  totalAmount: number
  items: Array<{
    priceType: {
      name: string
      unitPrice: number
    }
    quantity: number
  }>
}

export default function AdminSalesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null)
  const [detailedReports, setDetailedReports] = useState<DetailedReport[]>([])
  const [salesPeriod, setSalesPeriod] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary')

  // 売上データ取得
  const fetchSalesData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/dashboard/sales?period=${salesPeriod}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (res.ok && data) {
        setSalesStats(data)
      }
    } catch (err) {
      console.error('Sales stats error:', err)
    }
  }, [salesPeriod])

  // 詳細レポート取得
  const fetchDetailedReports = useCallback(async () => {
    try {
      let url = '/api/admin/reports?status=APPROVED'
      
      if (startDate) {
        url += `&startDate=${startDate}T00:00:00.000Z`
      }
      if (endDate) {
        url += `&endDate=${endDate}T23:59:59.999Z`
      }

      const res = await fetch(url, {
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (res.ok && data.reports) {
        const reportsWithTotal = data.reports.map((report: any) => ({
          ...report,
          totalAmount: report.items.reduce((sum: number, item: any) => {
            return sum + (item.priceType.unitPrice * item.quantity)
          }, 0)
        }))
        setDetailedReports(reportsWithTotal)
      }
    } catch (err) {
      console.error('Detailed reports error:', err)
    }
  }, [startDate, endDate])

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

    fetchSalesData()
    fetchDetailedReports()
  }, [session, status, router, fetchSalesData, fetchDetailedReports])

  useEffect(() => {
    if (session?.user && (session.user.role === 'OWNER' || session.user.role === 'ADMIN')) {
      fetchSalesData()
    }
  }, [salesPeriod, session, fetchSalesData])

  // フィルタリング
  const filteredReports = detailedReports.filter(report => {
    if (!searchQuery) return true
    return (
      report.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.office.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  if (status === 'loading') {
    return (
      <>
        <AdminNav />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
          <div className="container mx-auto px-4 py-6">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            売上分析
          </h1>
          <p className="text-gray-600 ml-16">詳細な売上データと統計情報</p>
        </div>

        {/* 期間選択 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={salesPeriod === 'week' ? 'default' : 'outline'}
                  onClick={() => setSalesPeriod('week')}
                  className={salesPeriod === 'week' ? 'bg-green-600' : ''}
                >
                  今週
                </Button>
                <Button
                  size="sm"
                  variant={salesPeriod === 'month' ? 'default' : 'outline'}
                  onClick={() => setSalesPeriod('month')}
                  className={salesPeriod === 'month' ? 'bg-green-600' : ''}
                >
                  今月
                </Button>
                <Button
                  size="sm"
                  variant={salesPeriod === 'all' ? 'default' : 'outline'}
                  onClick={() => setSalesPeriod('all')}
                  className={salesPeriod === 'all' ? 'bg-green-600' : ''}
                >
                  全期間
                </Button>
              </div>

              <div className="flex gap-2 items-end flex-1">
                <div className="flex-1 min-w-[150px]">
                  <Label htmlFor="start-date">開始日</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Label htmlFor="end-date">終了日</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <Button onClick={fetchDetailedReports} variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  検索
                </Button>
                <Button
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                    fetchDetailedReports()
                  }}
                  variant="outline"
                >
                  クリア
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ビューモード切り替え */}
        <div className="flex gap-2 mb-6">
          <Button
            size="sm"
            variant={viewMode === 'summary' ? 'default' : 'outline'}
            onClick={() => setViewMode('summary')}
            className={viewMode === 'summary' ? 'bg-green-600' : ''}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            サマリー
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'detailed' ? 'default' : 'outline'}
            onClick={() => setViewMode('detailed')}
            className={viewMode === 'detailed' ? 'bg-green-600' : ''}
          >
            <Calendar className="h-4 w-4 mr-2" />
            詳細リスト
          </Button>
        </div>

        {salesStats && viewMode === 'summary' && (
          <>
            {/* サマリーカード */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card className="shadow-xl border-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                <CardContent className="pt-6">
                  <h3 className="text-sm opacity-90 mb-2">総売上</h3>
                  <p className="text-4xl font-bold">
                    ¥{salesStats.totalSales.toLocaleString()}
                  </p>
                  <p className="text-sm opacity-90 mt-2">
                    {salesStats.totalReports}件の承認済み日報
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                <CardContent className="pt-6">
                  <h3 className="text-sm opacity-90 mb-2">平均売上/日報</h3>
                  <p className="text-4xl font-bold">
                    ¥{salesStats.totalReports > 0 ? Math.round(salesStats.totalSales / salesStats.totalReports).toLocaleString() : 0}
                  </p>
                  <p className="text-sm opacity-90 mt-2">
                    {salesPeriod === 'week' && '今週'}
                    {salesPeriod === 'month' && '今月'}
                    {salesPeriod === 'all' && '全期間'}の平均
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardContent className="pt-6">
                  <h3 className="text-sm opacity-90 mb-2">トップパフォーマー</h3>
                  {salesStats.userSales.length > 0 ? (
                    <>
                      <p className="text-2xl font-bold">{salesStats.userSales[0].name}</p>
                      <p className="text-3xl font-bold">
                        ¥{salesStats.userSales[0].amount.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg">データなし</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ランキング */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* 個人売上ランキング */}
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    個人売上ランキング
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {salesStats.userSales.length > 0 ? (
                    <div className="space-y-3">
                      {salesStats.userSales.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-700' :
                              index === 2 ? 'bg-orange-400 text-orange-900' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.count}件</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-green-600">
                              ¥{user.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              平均 ¥{Math.round(user.amount / user.count).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">データがありません</p>
                  )}
                </CardContent>
              </Card>

              {/* 営業所売上ランキング */}
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    営業所売上ランキング
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {salesStats.officeSales.length > 0 ? (
                    <div className="space-y-3">
                      {salesStats.officeSales.map((office, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-300 text-gray-700' :
                              index === 2 ? 'bg-orange-400 text-orange-900' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{office.name}</p>
                              <p className="text-xs text-gray-500">{office.count}件</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-purple-600">
                              ¥{office.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              平均 ¥{Math.round(office.amount / office.count).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">データがありません</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {viewMode === 'detailed' && (
          <Card className="shadow-xl border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  日報別売上詳細
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="名前・営業所で検索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredReports.length > 0 ? (
                <div className="space-y-3">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{report.user.name}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(report.date), 'yyyy年M月d日(E)', { locale: ja })} - {report.office.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ¥{report.totalAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">明細:</p>
                        <div className="space-y-1">
                          {report.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">
                                {item.priceType.name} × {item.quantity}
                              </span>
                              <span className="font-medium text-gray-900">
                                ¥{(item.priceType.unitPrice * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">データがありません</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
