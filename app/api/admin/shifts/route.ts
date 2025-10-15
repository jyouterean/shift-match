import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createShiftSchema = z.object({
  userId: z.string(),
  officeId: z.string(),
  routeId: z.string().optional(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
})

const updateShiftSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  officeId: z.string().optional(),
  routeId: z.string().optional(),
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { companyId: session.user.companyId }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
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
        route: {
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
        routeId: data.routeId,
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

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



