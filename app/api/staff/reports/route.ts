import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createReportSchema = z.object({
  date: z.string(),
  route: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number().default(0),
  deliveryCount: z.number().default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    priceTypeId: z.string(),
    quantity: z.number().min(1),
  })).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const reports = await prisma.dailyReport.findMany({
      where: { userId: session.user.id },
      include: {
        office: {
          select: {
            id: true,
            name: true,
          }
        },
        routeRelation: {
          select: {
            id: true,
            name: true,
          }
        },
        items: {
          include: {
            priceType: true,
          }
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Get staff reports error:', error)
    return NextResponse.json(
      { error: '日報情報の取得に失敗しました' },
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

    const body = await request.json()
    const data = createReportSchema.parse(body)

    // officeIdの検証
    const officeId = body.officeId || session.user.officeId
    if (!officeId) {
      return NextResponse.json(
        { error: '営業所を選択してください' },
        { status: 400 }
      )
    }

    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)
    const workMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000) - data.breakMinutes

    const report = await prisma.dailyReport.create({
      data: {
        userId: session.user.id,
        companyId: session.user.companyId,
        officeId: officeId,
        date: new Date(data.date),
        route: data.route,
        startTime,
        endTime,
        breakMinutes: data.breakMinutes,
        workMinutes,
        deliveryCount: data.deliveryCount,
        notes: data.notes,
        status: 'SUBMITTED',
        items: data.items ? {
          create: data.items.map(item => ({
            priceTypeId: item.priceTypeId,
            quantity: item.quantity,
          }))
        } : undefined,
      },
      include: {
        items: {
          include: {
            priceType: true,
          }
        },
      },
    })

    return NextResponse.json({ 
      success: true, 
      report,
      message: '日報が提出されました' 
    })
  } catch (error) {
    console.error('Create report error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '日報の提出に失敗しました' },
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 })
    }

    // 自分の日報で、未承認のもののみ削除可能
    const existingReport = await prisma.dailyReport.findFirst({
      where: {
        id,
        userId: session.user.id,
        status: 'SUBMITTED',
      },
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: '日報が見つからないか、削除できない状態です' },
        { status: 404 }
      )
    }

    // ReportItemsも一緒に削除される（Cascade）
    await prisma.dailyReport.delete({
      where: { id },
    })

    return NextResponse.json({ 
      success: true,
      message: '日報が削除されました' 
    })
  } catch (error) {
    console.error('Delete report error:', error)
    return NextResponse.json(
      { error: '日報の削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

