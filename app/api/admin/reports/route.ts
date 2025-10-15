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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

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

    const reports = await prisma.dailyReport.findMany({
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
    console.error('Get reports error:', error)
    return NextResponse.json(
      { error: '日報情報の取得に失敗しました' },
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
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'IDとステータスは必須です' }, { status: 400 })
    }

    const existingReport = await prisma.dailyReport.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    })

    if (!existingReport) {
      return NextResponse.json({ error: '日報が見つかりません' }, { status: 404 })
    }

    const report = await prisma.dailyReport.update({
      where: { id },
      data: {
        status,
        approvedBy: status === 'APPROVED' ? session.user.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
      },
    })

    return NextResponse.json({ 
      success: true, 
      report,
      message: '日報が更新されました' 
    })
  } catch (error) {
    console.error('Update report error:', error)
    return NextResponse.json(
      { error: '日報の更新に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



