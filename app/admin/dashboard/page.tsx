'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import AdminNav from '@/components/admin-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, Users, Building2, Calendar, FileText, MessageSquare, Bell, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalOffices: number
  totalShifts: number
  todayShifts: number
  totalReports: number
  pendingReports: number
  totalMessages: number
  unreadNotifications: number
}

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

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null)
  const [salesPeriod, setSalesPeriod] = useState('month')

  // データ取得を並列化（高速化・ローディング画面なし）
  const fetchAllData = useCallback(async () => {
    try {
      // 統計データのみ先に取得（優先）
      const statsRes = await fetch('/api/admin/dashboard/stats', {
        cache: 'no-store',
      })
      const statsData = await statsRes.json()
      
      if (statsRes.ok) {
        setStats(statsData.stats)
      }

      // 売上データは後から取得（バックグラウンド）
      fetch(`/api/admin/dashboard/sales?period=${salesPeriod}`, {
        cache: 'no-store',
      })
        .then(res => res.json())
        .then(data => {
          if (data) {
            setSalesStats(data)
          }
        })
        .catch(err => console.error('Sales stats error:', err))
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }, [salesPeriod])

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

    fetchAllData()
  }, [session, status, router, fetchAllData])

  // ローディング画面を完全に削除（即座に表示）
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

  const userActiveRate = stats ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0
  const reportApprovalRate = stats && stats.totalReports > 0 
    ? Math.round(((stats.totalReports - stats.pendingReports) / stats.totalReports) * 100) 
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg">
              <LayoutDashboard className="h-8 w-8 text-white" />
            </div>
            ダッシュボード
          </h1>
          <p className="text-gray-600 ml-16">リアルタイム業務分析</p>
        </div>

        {stats && (
          <>
            {/* メイン統計カード（クリック可能） */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Users className="h-7 w-7" />}
                title="総メンバー"
                value={stats.totalUsers}
                subtitle={`有効: ${stats.activeUsers}人`}
                gradient="from-blue-500 to-cyan-500"
                trend={userActiveRate >= 80 ? 'up' : 'down'}
                trendValue={`${userActiveRate}%`}
                href="/admin/members"
              />
              <StatCard
                icon={<Building2 className="h-7 w-7" />}
                title="営業所"
                value={stats.totalOffices}
                gradient="from-purple-500 to-pink-500"
                href="/admin/offices"
              />
              <StatCard
                icon={<Calendar className="h-7 w-7" />}
                title="総シフト"
                value={stats.totalShifts}
                subtitle={`今日: ${stats.todayShifts}件`}
                gradient="from-green-500 to-emerald-500"
                href="/admin/shifts"
              />
              <StatCard
                icon={<FileText className="h-7 w-7" />}
                title="総日報"
                value={stats.totalReports}
                subtitle={`承認待ち: ${stats.pendingReports}件`}
                gradient="from-orange-500 to-red-500"
                trend={stats.pendingReports > 0 ? 'alert' : 'ok'}
                href="/admin/reports"
              />
              <StatCard
                icon={<MessageSquare className="h-7 w-7" />}
                title="メッセージ"
                value={stats.totalMessages}
                gradient="from-pink-500 to-rose-500"
                href="/admin/chat"
              />
              <StatCard
                icon={<Bell className="h-7 w-7" />}
                title="未読通知"
                value={stats.unreadNotifications}
                gradient="from-yellow-500 to-amber-500"
                trend={stats.unreadNotifications > 0 ? 'alert' : 'ok'}
                href="/admin/notifications"
              />
            </div>

            {/* 分析セクション */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* ユーザーアクティブ率 */}
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-blue-600" />
                    ユーザーアクティブ率
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-bold text-blue-600">{userActiveRate}%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {stats.activeUsers}/{stats.totalUsers}人が有効
                        </p>
                      </div>
                      {userActiveRate >= 80 ? (
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      ) : (
                        <TrendingDown className="h-8 w-8 text-orange-600" />
                      )}
                    </div>
                    {/* プログレスバー */}
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${userActiveRate}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 日報承認率 */}
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-green-600" />
                    日報処理率
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-bold text-green-600">{reportApprovalRate}%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {stats.totalReports - stats.pendingReports}/{stats.totalReports}件処理済み
                        </p>
                      </div>
                      {reportApprovalRate >= 80 ? (
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      ) : (
                        <TrendingDown className="h-8 w-8 text-orange-600" />
                      )}
                    </div>
                    {/* プログレスバー */}
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${reportApprovalRate}%` }}
                      />
                    </div>
                    {stats.pendingReports > 0 && (
                      <p className="text-sm text-orange-600 font-medium">
                        ⚠️ {stats.pendingReports}件の日報が承認待ちです
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 業務分布 */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-6 w-6 text-purple-600" />
                  業務分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* シフト */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">シフト数</span>
                      <span className="text-lg font-bold text-gray-900">{stats.totalShifts}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                        style={{ width: `${Math.min((stats.totalShifts / (stats.totalUsers * 20)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 日報 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">日報数</span>
                      <span className="text-lg font-bold text-gray-900">{stats.totalReports}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                        style={{ width: `${Math.min((stats.totalReports / (stats.totalUsers * 20)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* メッセージ */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">メッセージ数</span>
                      <span className="text-lg font-bold text-gray-900">{stats.totalMessages}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full"
                        style={{ width: `${Math.min((stats.totalMessages / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 売上分析セクション */}
            {salesStats && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-7 w-7 text-green-600" />
                    売上分析
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSalesPeriod('week')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        salesPeriod === 'week'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      今週
                    </button>
                    <button
                      onClick={() => setSalesPeriod('month')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        salesPeriod === 'month'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      今月
                    </button>
                    <button
                      onClick={() => setSalesPeriod('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        salesPeriod === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      全期間
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  {/* 総売上 */}
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

                  {/* 平均売上 */}
                  <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                    <CardContent className="pt-6">
                      <h3 className="text-sm opacity-90 mb-2">1日報あたり平均売上</h3>
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

                  {/* トップパフォーマー */}
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

                <div className="grid md:grid-cols-2 gap-6">
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
                          {salesStats.userSales.slice(0, 10).map((user, index) => (
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
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, subtitle, gradient, trend, trendValue, href }: {
  icon: React.ReactNode
  title: string
  value: number
  subtitle?: string
  gradient: string
  trend?: 'up' | 'down' | 'alert' | 'ok'
  trendValue?: string
  href?: string
}) {
  const cardContent = (
    <Card className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-0 overflow-hidden group cursor-pointer">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
      <CardContent className="pt-6 relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          {trend && (
            <div className="flex flex-col items-end">
              {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-600" />}
              {trend === 'down' && <TrendingDown className="h-5 w-5 text-orange-600" />}
              {trend === 'alert' && <Bell className="h-5 w-5 text-red-600 animate-pulse" />}
              {trend === 'ok' && <Activity className="h-5 w-5 text-green-600" />}
              {trendValue && (
                <span className={`text-xs font-medium mt-1 ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-orange-600' : 
                  'text-gray-600'
                }`}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>
        <h3 className="text-sm text-gray-600 mb-1 font-medium">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value.toLocaleString()}</p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  return cardContent
}

