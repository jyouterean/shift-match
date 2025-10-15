import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 特定日の詳細データを取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const dateObj = new Date(date)

    // その日のシフトを取得
    const shifts = await prisma.shift.findMany({
      where: {
        companyId: session.user.companyId,
        date: {
          gte: new Date(dateObj.setHours(0, 0, 0, 0)),
          lt: new Date(dateObj.setHours(23, 59, 59, 999)),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        office: {
          select: {
            id: true,
            name: true,
          }
        },
        route: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // その日の必要人数設定を取得
    const requirements = await prisma.officeRequirement.findMany({
      where: {
        office: {
          companyId: session.user.companyId,
        },
        date: {
          gte: new Date(date + 'T00:00:00'),
          lt: new Date(date + 'T23:59:59'),
        },
      },
      include: {
        office: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
      },
    })

    // その日の希望提出を取得
    const availabilities = await prisma.shiftAvailability.findMany({
      where: {
        user: {
          companyId: session.user.companyId,
        },
        date: {
          gte: new Date(date + 'T00:00:00'),
          lt: new Date(date + 'T23:59:59'),
        },
        status: 'AVAILABLE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            officeId: true,
          }
        },
      },
    })

    // 営業所ごとに整理
    const officeData: Record<string, any> = {}

    // 必要人数設定を基にデータ構造を作成
    requirements.forEach((req) => {
      officeData[req.officeId] = {
        officeId: req.officeId,
        officeName: req.office.name,
        officeAddress: req.office.address,
        requiredCount: req.requiredCount,
        startTime: req.startTime,
        endTime: req.endTime,
        notes: req.notes,
        assignedShifts: [],
        availableUsers: [],
        emptySlots: 0,
      }
    })

    // 割当済みシフトを追加
    shifts.forEach((shift) => {
      if (officeData[shift.officeId]) {
        officeData[shift.officeId].assignedShifts.push({
          id: shift.id,
          userId: shift.user.id,
          userName: shift.user.name,
          userEmail: shift.user.email,
          status: shift.status,
          startTime: shift.startTime,
          endTime: shift.endTime,
          routeId: shift.route?.id,
          routeName: shift.route?.name,
          notes: shift.notes,
        })
      }
    })

    // 希望提出者を追加（まだ割当されていないユーザー）
    const assignedUserIds = shifts.map(s => s.user.id)
    const unassignedAvailabilities = availabilities
      .filter(avail => !assignedUserIds.includes(avail.user.id))
      .map(avail => ({
        availabilityId: avail.id,
        userId: avail.user.id,
        userName: avail.user.name,
        userEmail: avail.user.email,
        userOfficeId: avail.user.officeId,
        notes: avail.notes,
      }))

    // 営業所ごとにも分類
    availabilities.forEach((avail) => {
      if (!assignedUserIds.includes(avail.user.id) && avail.user.officeId) {
        Object.values(officeData).forEach((office: any) => {
          if (office.officeId === avail.user.officeId) {
            office.availableUsers.push({
              userId: avail.user.id,
              userName: avail.user.name,
              userEmail: avail.user.email,
            })
          }
        })
      }
    })

    // 空き枠を計算
    Object.values(officeData).forEach((office: any) => {
      office.emptySlots = Math.max(0, office.requiredCount - office.assignedShifts.length)
    })

    // 集計情報
    const totalRequired = Object.values(officeData).reduce(
      (sum: number, office: any) => sum + office.requiredCount, 0
    )
    const totalAssigned = shifts.filter(s => s.status !== 'CANCELLED').length
    const totalShortage = Math.max(0, totalRequired - totalAssigned)

    return NextResponse.json({ 
      date: date,
      summary: {
        totalRequired,
        totalAssigned,
        totalShortage,
      },
      offices: Object.values(officeData),
      availabilities: unassignedAvailabilities,
    })
  } catch (error) {
    console.error('Get date detail error:', error)
    return NextResponse.json(
      { error: '日別データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

