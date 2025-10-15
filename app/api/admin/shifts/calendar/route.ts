import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// カレンダー用：日別の充足率データを取得
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '期間を指定してください' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // 期間内のシフトを取得
    const shifts = await prisma.shift.findMany({
      where: {
        companyId: session.user.companyId,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        office: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    })

    // 期間内の必要人数設定を取得
    const requirements = await prisma.officeRequirement.findMany({
      where: {
        office: {
          companyId: session.user.companyId,
        },
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        office: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    })

    // 希望提出状況を取得
    const availabilities = await prisma.shiftAvailability.findMany({
      where: {
        user: {
          companyId: session.user.companyId,
        },
        date: {
          gte: start,
          lte: end,
        },
        status: 'AVAILABLE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            officeId: true,
          }
        },
      },
    })

    // 日別に集計
    const calendarData: Record<string, any> = {}
    
    // 日付のリストを作成
    const dateList: string[] = []
    const currentDate = new Date(start)
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0]
      dateList.push(dateStr)
      calendarData[dateStr] = {
        date: dateStr,
        totalRequired: 0,
        totalAssigned: 0,
        totalAvailable: 0,
        offices: {} as Record<string, any>,
        status: 'empty',
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // 必要人数を集計
    requirements.forEach((req) => {
      const dateStr = req.date.toISOString().split('T')[0]
      if (calendarData[dateStr]) {
        calendarData[dateStr].totalRequired += req.requiredCount
        calendarData[dateStr].offices[req.officeId] = {
          id: req.officeId,
          name: req.office.name,
          required: req.requiredCount,
          assigned: 0,
          available: 0,
          startTime: req.startTime,
          endTime: req.endTime,
        }
      }
    })

    // 割当済みシフトを集計
    shifts.forEach((shift) => {
      const dateStr = shift.date.toISOString().split('T')[0]
      if (calendarData[dateStr]) {
        if (shift.status !== 'CANCELLED') {
          calendarData[dateStr].totalAssigned += 1
          
          if (calendarData[dateStr].offices[shift.officeId]) {
            calendarData[dateStr].offices[shift.officeId].assigned += 1
          }
        }
      }
    })

    // 希望提出を集計
    availabilities.forEach((avail) => {
      const dateStr = avail.date.toISOString().split('T')[0]
      if (calendarData[dateStr]) {
        calendarData[dateStr].totalAvailable += 1
        
        // ユーザーの所属営業所がある場合のみカウント
        if (avail.user.officeId && calendarData[dateStr].offices[avail.user.officeId]) {
          calendarData[dateStr].offices[avail.user.officeId].available += 1
        }
      }
    })

    // ステータスを判定
    Object.values(calendarData).forEach((day: any) => {
      if (day.totalRequired === 0) {
        day.status = 'inactive' // 非稼働日
      } else if (day.totalAssigned >= day.totalRequired) {
        day.status = 'fulfilled' // 充足
      } else if (day.totalAssigned > 0) {
        day.status = 'partial' // 一部充足
      } else if (day.totalAvailable > 0) {
        day.status = 'pending' // 申請のみ
      } else {
        day.status = 'shortage' // 不足
      }
    })

    return NextResponse.json({ 
      calendar: Object.values(calendarData),
    })
  } catch (error) {
    console.error('Get calendar data error:', error)
    return NextResponse.json(
      { error: 'カレンダーデータの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

