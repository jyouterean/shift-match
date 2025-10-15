import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 監査ログのレビュー機能
 * - 異常なパターンの検出
 * - 統計情報の提供
 * - セキュリティアラート
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 監査ログを取得
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        companyId: session.user.companyId,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 統計情報を計算
    const stats = {
      totalEvents: auditLogs.length,
      byAction: {} as Record<string, number>,
      byUser: {} as Record<string, { name: string; count: number }>,
      byDay: {} as Record<string, number>,
      criticalEvents: 0,
    }

    const alerts: Array<{
      type: 'warning' | 'error' | 'info'
      message: string
      timestamp: Date
      userId?: string
      userName?: string
    }> = []

    // アクションごとの統計
    const actionCounts: Record<string, number> = {}
    const userActionCounts: Record<string, Record<string, number>> = {}
    const ipAddresses: Record<string, number> = {}

    auditLogs.forEach((log) => {
      // アクション統計
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1

      // ユーザー統計
      if (log.user) {
        if (!stats.byUser[log.userId]) {
          stats.byUser[log.userId] = {
            name: log.user.name,
            count: 0,
          }
        }
        stats.byUser[log.userId].count++

        // ユーザーごとのアクション統計
        if (!userActionCounts[log.userId]) {
          userActionCounts[log.userId] = {}
        }
        userActionCounts[log.userId][log.action] =
          (userActionCounts[log.userId][log.action] || 0) + 1
      }

      // 日別統計
      const dateKey = log.createdAt.toISOString().split('T')[0]
      stats.byDay[dateKey] = (stats.byDay[dateKey] || 0) + 1

      // IPアドレス統計
      if (log.ipAddress) {
        ipAddresses[log.ipAddress] = (ipAddresses[log.ipAddress] || 0) + 1
      }

      // クリティカルイベントのカウント
      if (
        log.action.includes('DELETE') ||
        log.action.includes('DENIED') ||
        log.action === 'LOGIN_FAILED'
      ) {
        stats.criticalEvents++
      }
    })

    // 異常パターンの検出
    const avgEventsPerUser = Object.keys(stats.byUser).length > 0
      ? stats.totalEvents / Object.keys(stats.byUser).length
      : 0

    // 1. 異常に多いログイン失敗
    const failedLogins = actionCounts['LOGIN_FAILED'] || 0
    if (failedLogins > 10) {
      alerts.push({
        type: 'warning',
        message: `過去${days}日間で${failedLogins}回のログイン失敗が検出されました`,
        timestamp: new Date(),
      })
    }

    // 2. 異常に多いアクセス拒否
    const accessDenied = actionCounts['ACCESS_DENIED'] || 0
    if (accessDenied > 5) {
      alerts.push({
        type: 'warning',
        message: `過去${days}日間で${accessDenied}回のアクセス拒否が検出されました`,
        timestamp: new Date(),
      })
    }

    // 3. ユーザーごとの異常活動
    Object.entries(stats.byUser).forEach(([userId, data]) => {
      if (data.count > avgEventsPerUser * 3 && avgEventsPerUser > 0) {
        alerts.push({
          type: 'info',
          message: `${data.name}さんの活動が平均の3倍以上です（${data.count}件）`,
          timestamp: new Date(),
          userId,
          userName: data.name,
        })
      }

      // 削除操作が多い
      const deleteCount = Object.entries(userActionCounts[userId])
        .filter(([action]) => action.includes('DELETE'))
        .reduce((sum, [, count]) => sum + count, 0)

      if (deleteCount > 10) {
        alerts.push({
          type: 'warning',
          message: `${data.name}さんが過去${days}日間で${deleteCount}回の削除操作を実行しました`,
          timestamp: new Date(),
          userId,
          userName: data.name,
        })
      }
    })

    // 4. 同一IPから異常に多いアクセス
    Object.entries(ipAddresses).forEach(([ip, count]) => {
      if (count > 1000) {
        alerts.push({
          type: 'error',
          message: `IPアドレス ${ip} から過去${days}日間で${count}回のアクセスが検出されました（DDoS攻撃の可能性）`,
          timestamp: new Date(),
        })
      }
    })

    // 5. 短時間での大量操作
    const recentLogs = auditLogs.filter((log) => {
      const hourAgo = new Date()
      hourAgo.setHours(hourAgo.getHours() - 1)
      return log.createdAt >= hourAgo
    })

    if (recentLogs.length > 100) {
      alerts.push({
        type: 'warning',
        message: `過去1時間で${recentLogs.length}件の操作が実行されました`,
        timestamp: new Date(),
      })
    }

    // アラートを重要度順にソート
    alerts.sort((a, b) => {
      const priority = { error: 3, warning: 2, info: 1 }
      return priority[b.type] - priority[a.type]
    })

    return NextResponse.json({
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      stats,
      alerts,
      recentLogs: auditLogs.slice(0, 50), // 最新50件
    })
  } catch (error) {
    console.error('Audit log review error:', error)
    return NextResponse.json(
      { error: '監査ログレビューの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

