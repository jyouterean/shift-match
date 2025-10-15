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

    const [
      totalShifts,
      upcomingShifts,
      totalReports,
      pendingReports,
      unreadNotifications,
    ] = await Promise.all([
      prisma.shift.count({ where: { userId: session.user.id } }),
      prisma.shift.count({
        where: {
          userId: session.user.id,
          date: { gte: new Date() },
          status: 'SCHEDULED',
        },
      }),
      prisma.dailyReport.count({ where: { userId: session.user.id } }),
      prisma.dailyReport.count({ where: { userId: session.user.id, status: 'SUBMITTED' } }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
        },
      }),
    ])

    return NextResponse.json({
      stats: {
        totalShifts,
        upcomingShifts,
        totalReports,
        pendingReports,
        unreadNotifications,
      },
    })
  } catch (error) {
    console.error('Get staff dashboard stats error:', error)
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



