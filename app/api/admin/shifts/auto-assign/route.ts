import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const autoAssignSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  officeIds: z.array(z.string()).optional(), // 指定営業所のみ or 全体
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { startDate, endDate, officeIds } = autoAssignSchema.parse(body)

    const start = new Date(startDate)
    const end = new Date(endDate)

    // 期間内の必要人数設定を取得
    const requirements = await prisma.officeRequirement.findMany({
      where: {
        office: {
          companyId: session.user.companyId,
          ...(officeIds && officeIds.length > 0 ? { id: { in: officeIds } } : {}),
        },
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        office: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    // 期間内の既存シフトを取得
    const existingShifts = await prisma.shift.findMany({
      where: {
        companyId: session.user.companyId,
        date: {
          gte: start,
          lte: end,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    })

    // 期間内の希望提出を取得
    const availabilities = await prisma.shiftAvailability.findMany({
      where: {
        user: {
          companyId: session.user.companyId,
          status: 'ACTIVE',
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

    // 各従業員の期間内シフト数をカウント
    const userShiftCounts: Record<string, number> = {}
    existingShifts.forEach((shift) => {
      userShiftCounts[shift.userId] = (userShiftCounts[shift.userId] || 0) + 1
    })

    const newShifts: any[] = []
    const errors: string[] = []

    // 日付・営業所ごとに処理
    for (const req of requirements) {
      const dateStr = req.date.toISOString().split('T')[0]
      
      // その日のその営業所の既存シフト数
      const assignedCount = existingShifts.filter(
        (s) => s.date.toISOString().split('T')[0] === dateStr && s.officeId === req.officeId
      ).length

      const neededCount = req.requiredCount - assignedCount

      if (neededCount <= 0) {
        continue // すでに充足
      }

      // その日その営業所に希望提出している候補者
      const candidates = availabilities
        .filter(
          (a) =>
            a.date.toISOString().split('T')[0] === dateStr &&
            a.user.officeId === req.officeId
        )
        .map((a) => a.user)
        .filter((user) => {
          // すでにその日に割当済みでないこと
          return !existingShifts.some(
            (s) => s.userId === user.id && s.date.toISOString().split('T')[0] === dateStr
          )
        })

      // 優先順位：稼働回数が少ない順
      candidates.sort((a, b) => {
        const countA = userShiftCounts[a.id] || 0
        const countB = userShiftCounts[b.id] || 0
        return countA - countB
      })

      // 必要人数分割り当て
      const assigned = candidates.slice(0, neededCount)

      assigned.forEach((user) => {
        const startTime = new Date(`${dateStr}T${req.startTime}:00`)
        const endTime = new Date(`${dateStr}T${req.endTime}:00`)

        // 終了時刻が開始時刻より前の場合は翌日とする
        if (endTime <= startTime) {
          endTime.setDate(endTime.getDate() + 1)
        }

        newShifts.push({
          userId: user.id,
          officeId: req.officeId,
          companyId: session.user.companyId,
          date: req.date,
          startTime: startTime,
          endTime: endTime,
          status: 'SCHEDULED',
          notes: '自動割当',
        })

        userShiftCounts[user.id] = (userShiftCounts[user.id] || 0) + 1
      })

      // 不足がある場合はエラーに記録
      if (assigned.length < neededCount) {
        errors.push(
          `${dateStr} - ${req.office.name}: ${neededCount - assigned.length}名不足`
        )
      }
    }

    // シフトを一括作成
    if (newShifts.length > 0) {
      await prisma.shift.createMany({
        data: newShifts,
      })

      // 監査ログ
      await prisma.auditLog.create({
        data: {
          action: 'AUTO_ASSIGN',
          entity: 'Shift',
          entityId: 'bulk',
          details: `${newShifts.length}件のシフトを自動割当`,
          companyId: session.user.companyId,
          userId: session.user.id,
        },
      })
    }

    return NextResponse.json({ 
      success: true,
      assigned: newShifts.length,
      errors: errors.length > 0 ? errors : null,
      message: `${newShifts.length}件のシフトを自動割当しました`,
    })
  } catch (error) {
    console.error('Auto assign error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '自動割当に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

