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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { userId: session.user.id }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
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
    console.error('Get staff shifts error:', error)
    return NextResponse.json(
      { error: 'シフト情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'


