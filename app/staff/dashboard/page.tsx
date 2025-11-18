'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import StaffNav from '@/components/staff-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, Calendar, FileText, Bell, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { DashboardSkeleton } from '@/components/loading-skeleton'

interface DashboardStats {
  totalShifts: number
  upcomingShifts: number
  totalReports: number
  pendingReports: number
  unreadNotifications: number
}

export default function StaffDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(false) // ローディング画面を無効化

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/staff/dashboard/stats', {
        cache: 'no-store', // 常に最新データを取得
      })
      const data = await response.json()
      if (response.ok) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
    // ローディング状態を削除
  }, [])

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

    fetchStats()
  }, [session, status, router, fetchStats])

  if (status === 'loading' || isLoading) {
    return (
      <>
        <StaffNav />
        <DashboardSkeleton />
      </>
    )
  }

  const reportCompletionRate = stats && stats.totalReports > 0
    ? Math.round(((stats.totalReports - stats.pendingReports) / stats.totalReports) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pb-20">
      <StaffNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg">
              <LayoutDashboard className="h-8 w-8 text-white" />
            </div>
            マイダッシュボード
          </h1>
          <p className="text-gray-600 ml-16">こんにちは、{session?.user.name}さん</p>
        </div>

        {stats && (
          <>
            {/* メイン統計カード（クリック可能） */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <StatCard
                icon={<Calendar className="h-7 w-7" />}
                title="マイシフト"
                value={stats.totalShifts}
                subtitle={`今後: ${stats.upcomingShifts}件`}
                gradient="from-green-500 to-emerald-500"
                href="/staff/shifts"
              />
              <StatCard
                icon={<FileText className="h-7 w-7" />}
                title="マイ日報"
                value={stats.totalReports}
                subtitle={`承認待ち: ${stats.pendingReports}件`}
                gradient="from-blue-500 to-cyan-500"
                trend={stats.pendingReports > 0 ? 'pending' : 'ok'}
                href="/staff/reports"
              />
              <StatCard
                icon={<Bell className="h-7 w-7" />}
                title="未読通知"
                value={stats.unreadNotifications}
                gradient="from-orange-500 to-red-500"
                trend={stats.unreadNotifications > 0 ? 'alert' : 'ok'}
                href="/staff/notifications"
              />
            </div>

            {/* 分析セクション */}
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  あなたの業務状況
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 日報提出率 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">日報提出率</h4>
                        <p className="text-sm text-gray-600">承認済み日報の割合</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-600">{reportCompletionRate}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${reportCompletionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* 今後のシフト */}
                  {stats.upcomingShifts > 0 && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-6 w-6 text-blue-600" />
                        <div>
                          <h4 className="font-semibold text-blue-900">今後のシフト</h4>
                          <p className="text-sm text-blue-700">{stats.upcomingShifts}件の予定されたシフトがあります</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 承認待ち日報 */}
                  {stats.pendingReports > 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-yellow-600" />
                        <div>
                          <h4 className="font-semibold text-yellow-900">承認待ち</h4>
                          <p className="text-sm text-yellow-700">{stats.pendingReports}件の日報が承認待ちです</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 全て承認済み */}
                  {stats.pendingReports === 0 && stats.totalReports > 0 && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <h4 className="font-semibold text-green-900">素晴らしい！</h4>
                          <p className="text-sm text-green-700">全ての日報が処理されています</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, subtitle, gradient, trend, href }: {
  icon: React.ReactNode
  title: string
  value: number
  subtitle?: string
  gradient: string
  trend?: 'pending' | 'alert' | 'ok'
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
            <div>
              {trend === 'pending' && <Clock className="h-5 w-5 text-yellow-600" />}
              {trend === 'alert' && <Bell className="h-5 w-5 text-red-600 animate-pulse" />}
              {trend === 'ok' && <CheckCircle className="h-5 w-5 text-green-600" />}
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

