'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AdminNav from '@/components/admin-nav'
import { 
  Shield, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  Users, 
  Activity,
  Calendar,
  RefreshCcw,
} from 'lucide-react'

interface AuditReview {
  period: {
    days: number
    startDate: string
    endDate: string
  }
  stats: {
    totalEvents: number
    byAction: Record<string, number>
    byUser: Record<string, { name: string; count: number }>
    byDay: Record<string, number>
    criticalEvents: number
  }
  alerts: Array<{
    type: 'warning' | 'error' | 'info'
    message: string
    timestamp: string
    userId?: string
    userName?: string
  }>
  recentLogs: any[]
}

export default function AuditLogsReviewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reviewData, setReviewData] = useState<AuditReview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState(7)

  const fetchReview = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/audit-logs/review?days=${days}`)
      const data = await response.json()
      if (response.ok) {
        setReviewData(data)
      } else {
        alert(data.error || 'レビューデータの取得に失敗しました')
      }
    } catch (error) {
      console.error('Failed to fetch review:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [days])

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

    fetchReview()
  }, [session, status, router, fetchReview])

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

  if (!reviewData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
        <AdminNav />
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600">レビューデータがありません</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Info className="h-5 w-5 text-gray-600" />
    }
  }

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const topActions = Object.entries(reviewData.stats.byAction)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const topUsers = Object.entries(reviewData.stats.byUser)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              監査ログレビュー
            </h1>
            <Button
              onClick={fetchReview}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              更新
            </Button>
          </div>
          
          {/* 期間選択 */}
          <div className="flex gap-2">
            {[7, 14, 30, 90].map((d) => (
              <Button
                key={d}
                onClick={() => setDays(d)}
                variant={days === d ? 'default' : 'outline'}
                className="text-sm"
              >
                {d}日間
              </Button>
            ))}
          </div>
        </div>

        {/* アラート */}
        {reviewData.alerts.length > 0 && (
          <Card className="mb-6 border-2 border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-yellow-900">
                <AlertTriangle className="h-5 w-5" />
                セキュリティアラート ({reviewData.alerts.length}件)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reviewData.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 border rounded-lg ${getAlertBgColor(alert.type)}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      {alert.userName && (
                        <p className="text-xs text-gray-600 mt-1">ユーザー: {alert.userName}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 統計サマリー */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総イベント数</p>
                  <p className="text-2xl font-bold text-gray-900">{reviewData.stats.totalEvents}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">クリティカルイベント</p>
                  <p className="text-2xl font-bold text-red-600">{reviewData.stats.criticalEvents}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">アクティブユーザー</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys(reviewData.stats.byUser).length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">期間</p>
                  <p className="text-2xl font-bold text-gray-900">{reviewData.period.days}日</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 詳細統計 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* トップアクション */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                上位アクション
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topActions.map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{action}</span>
                    <span className="text-sm font-semibold text-gray-900">{count}回</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* アクティブユーザー */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                アクティブユーザー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topUsers.map(([userId, data]) => (
                  <div key={userId} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{data.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{data.count}件</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* アクション */}
        <div className="mt-6 flex gap-4">
          <Button
            onClick={() => router.push('/admin/audit-logs')}
            variant="outline"
          >
            すべてのログを表示
          </Button>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

