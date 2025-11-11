import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type OfficeStatus = 'FILLED' | 'PARTIAL' | 'SHORTAGE' | 'APPLIED' | 'IDLE'

const createShiftSchema = z.object({
  userId: z.string(),
  officeId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
})

const updateShiftSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  officeId: z.string().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
})

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
    const month = searchParams.get('month') // YYYY-MM形式
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    // 月サマリーモード（拠点別）
    if (month) {
      return await getMonthSummary(session.user.companyId, month)
    }

    // 通常のシフト一覧取得
    const where: any = { companyId: session.user.companyId }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (status) {
      where.status = status
    }

    const shifts = await prisma.shift.findMany({
      where,
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
      orderBy: [
        { date: 'desc' },
        { startTime: 'asc' },
      ],
    })

    return NextResponse.json({ shifts })
  } catch (error) {
    console.error('Get shifts error:', error)
    return NextResponse.json(
      { error: 'シフト情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 月サマリー取得（拠点別のみ、合計なし）
async function getMonthSummary(companyId: string, month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  const startOfMonth = new Date(year, monthNum - 1, 1)
  const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999)

  // 月内の営業所を取得
  const offices = await prisma.office.findMany({
    where: { companyId },
    select: { id: true, name: true },
  })

  // 月内の必要人数設定を取得
  const requirements = await prisma.officeRequirement.findMany({
    where: {
      office: { companyId },
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    select: {
      officeId: true,
      date: true,
      requiredCount: true,
    },
  })

  // 月内のシフト（割当）を取得 - 集約して取得（高速化）
  const shifts = await prisma.shift.groupBy({
    by: ['officeId', 'date'],
    where: {
      companyId,
      date: { gte: startOfMonth, lte: endOfMonth },
      status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
    },
    _count: {
      userId: true,
    },
  })

  // 月内の希望提出を取得 - 日付のみで集約（高速化）
  const availabilitiesByDate = await prisma.shiftAvailability.groupBy({
    by: ['date'],
    where: {
      user: { companyId },
      date: { gte: startOfMonth, lte: endOfMonth },
      status: 'AVAILABLE',
    },
    _count: {
      date: true,
    },
  })

  // 日付ごとに集計
  const daysMap = new Map<string, any>()

  // 日付の範囲を生成
  for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    daysMap.set(dateStr, {
      date: dateStr,
      offices: [],
      dayStatus: 'IDLE' as const,
    })
  }

  // 拠点ごとの日別集計
  offices.forEach((office) => {
    const dateKeys = Array.from(daysMap.keys())
    dateKeys.forEach((dateStr) => {
      const dateObj = new Date(dateStr + 'T00:00:00Z')
      
      // その日の必要人数
      const req = requirements.find(
        r => r.officeId === office.id && 
             r.date.toISOString().split('T')[0] === dateStr
      )
      const required = req?.requiredCount || 0

      // その日の割当人数（集約済みデータから取得）
      const shiftRecord = shifts.find(
        s => s.officeId === office.id && 
             s.date.toISOString().split('T')[0] === dateStr
      )
      const assigned = shiftRecord?._count.userId || 0

      // その日の希望提出の有無（集約済みデータから取得）
      const hasApplications = availabilitiesByDate.some(
        a => a.date.toISOString().split('T')[0] === dateStr
      )

      // ステータス判定
      let officeStatus: 'FILLED' | 'PARTIAL' | 'SHORTAGE' | 'APPLIED' | 'IDLE' = 'IDLE'
      if (required > 0) {
        if (assigned >= required) {
          officeStatus = 'FILLED'
        } else if (assigned > 0) {
          officeStatus = 'PARTIAL'
        } else {
          officeStatus = 'SHORTAGE'
        }
      } else if (hasApplications) {
        officeStatus = 'APPLIED'
      }

      const day = daysMap.get(dateStr)!
      day.offices.push({
        officeId: office.id,
        officeName: office.name,
        required,
        assigned,
        hasApplications,
        status: officeStatus,
      })
    })
  })

  // 各日の代表ステータスを決定（最も厳しい状態）
  const statusPriority: Record<OfficeStatus, number> = {
    SHORTAGE: 4,
    PARTIAL: 3,
    APPLIED: 2,
    FILLED: 1,
    IDLE: 0,
  }

  daysMap.forEach((day) => {
    let worstStatus: OfficeStatus = 'IDLE'
    let worstPriority = 0

    day.offices.forEach((office: any) => {
      const priority = statusPriority[office.status as OfficeStatus]
      if (priority > worstPriority) {
        worstPriority = priority
        worstStatus = office.status
      }
    })

    day.dayStatus = worstStatus
  })

  const days = Array.from(daysMap.values())

  return NextResponse.json({ days })
}

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
    const data = createShiftSchema.parse(body)

    const shift = await prisma.shift.create({
      data: {
        userId: data.userId,
        officeId: data.officeId,
        companyId: session.user.companyId,
        date: new Date(data.date),
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes,
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
      message: 'シフトが作成されました' 
    })
  } catch (error) {
    console.error('Create shift error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'シフトの作成に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = updateShiftSchema.parse(body)

    const existingShift = await prisma.shift.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    })

    if (!existingShift) {
      return NextResponse.json({ error: 'シフトが見つかりません' }, { status: 404 })
    }

    const processedData: any = { ...updateData }
    if (updateData.date) processedData.date = new Date(updateData.date)
    if (updateData.startTime) processedData.startTime = new Date(updateData.startTime)
    if (updateData.endTime) processedData.endTime = new Date(updateData.endTime)

    const shift = await prisma.shift.update({
      where: { id },
      data: processedData,
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
      message: 'シフトが更新されました' 
    })
  } catch (error) {
    console.error('Update shift error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'シフトの更新に失敗しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // IDをクエリパラメータまたはボディから取得
    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')
    
    if (!id) {
      const body = await request.json()
      id = body.id
    }

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 })
    }

    const existingShift = await prisma.shift.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    })

    if (!existingShift) {
      return NextResponse.json({ error: 'シフトが見つかりません' }, { status: 404 })
    }

    await prisma.shift.delete({
      where: { id },
    })

    return NextResponse.json({ 
      success: true,
      message: 'シフトが削除されました' 
    })
  } catch (error) {
    console.error('Delete shift error:', error)
    return NextResponse.json(
      { error: 'シフトの削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



