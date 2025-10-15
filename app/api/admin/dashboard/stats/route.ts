import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const [
      totalUsers,
      activeUsers,
      totalOffices,
      totalShifts,
      todayShifts,
      totalReports,
      pendingReports,
      totalMessages,
      unreadNotifications,
    ] = await Promise.all([
      prisma.user.count({ where: { companyId: session.user.companyId } }),
      prisma.user.count({ where: { companyId: session.user.companyId, status: 'ACTIVE' } }),
      prisma.office.count({ where: { companyId: session.user.companyId } }),
      prisma.shift.count({ where: { companyId: session.user.companyId } }),
      prisma.shift.count({
        where: {
          companyId: session.user.companyId,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.dailyReport.count({ where: { companyId: session.user.companyId } }),
      prisma.dailyReport.count({ where: { companyId: session.user.companyId, status: 'SUBMITTED' } }),
      prisma.message.count({ where: { companyId: session.user.companyId } }),
      prisma.notification.count({
        where: {
          companyId: session.user.companyId,
          userId: session.user.id,
          isRead: false,
        },
      }),
    ])

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalOffices,
        totalShifts,
        todayShifts,
        totalReports,
        pendingReports,
        totalMessages,
        unreadNotifications,
      },
    })
  } catch (error) {
    console.error('Get admin dashboard stats error:', error)
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



