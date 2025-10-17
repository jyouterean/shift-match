import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const assignmentSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  officeId: z.string(),
  memberId: z.string(),
  memo: z.string().optional(),
})

// シフト割当作成
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
    const { date, officeId, memberId, memo } = assignmentSchema.parse(body)

    // メンバーが存在するか確認
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        companyId: session.user.companyId,
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'メンバーが見つかりません' }, { status: 404 })
    }

    // 営業所が存在するか確認
    const office = await prisma.office.findFirst({
      where: {
        id: officeId,
        companyId: session.user.companyId,
      },
    })

    if (!office) {
      return NextResponse.json({ error: '営業所が見つかりません' }, { status: 404 })
    }

    // 必要人数設定から時間を取得（デフォルト値）
    const requirement = await prisma.officeRequirement.findFirst({
      where: {
        officeId,
        date: {
          gte: new Date(date + 'T00:00:00'),
          lte: new Date(date + 'T23:59:59'),
        },
      },
    })

    const startTime = requirement?.startTime || new Date(date + 'T09:00:00')
    const endTime = requirement?.endTime || new Date(date + 'T18:00:00')

    // シフトを作成
    const shift = await prisma.shift.create({
      data: {
        userId: memberId,
        officeId,
        companyId: session.user.companyId,
        date: new Date(date + 'T00:00:00'),
        startTime,
        endTime,
        notes: memo,
        status: 'SCHEDULED',
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
      },
    })

    return NextResponse.json({ 
      success: true, 
      shift,
      message: 'シフトが割り当てられました' 
    })
  } catch (error) {
    console.error('Create assignment error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'シフトの割当に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

