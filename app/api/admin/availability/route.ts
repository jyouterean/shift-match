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
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let where: any = {}

    if (date) {
      where.date = new Date(date)
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // 同じ会社のユーザーのシフト希望のみ取得
    const availabilities = await prisma.shiftAvailability.findMany({
      where: {
        ...where,
        user: {
          companyId: session.user.companyId,
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
      },
      orderBy: [
        { date: 'asc' },
        { user: { name: 'asc' } },
      ],
    })

    return NextResponse.json({ availabilities })
  } catch (error) {
    console.error('Get availability error:', error)
    return NextResponse.json(
      { error: 'シフト希望の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



