import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 個人の当月「出勤可能日」一覧
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

    if (!month) {
      return NextResponse.json({ error: '月の指定が必要です' }, { status: 400 })
    }

    const [year, monthNum] = month.split('-').map(Number)
    const startOfMonth = new Date(year, monthNum - 1, 1)
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999)

    // 会社のメンバーを取得
    const users = await prisma.user.findMany({
      where: { companyId: session.user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        officeId: true,
        office: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: { name: 'asc' },
    })

    // 月内の出勤可能日を取得
    const availabilities = await prisma.shiftAvailability.findMany({
      where: {
        user: { companyId: session.user.companyId },
        date: { gte: startOfMonth, lte: endOfMonth },
        status: 'AVAILABLE',
      },
      select: {
        userId: true,
        date: true,
        notes: true,
      },
      orderBy: [
        { userId: 'asc' },
        { date: 'asc' },
      ],
    })

    // ユーザーごとに整形
    const result = users.map(user => {
      const userAvailabilities = availabilities
        .filter(a => a.userId === user.id)
        .map(a => a.date.toISOString().split('T')[0])

      return {
        memberId: user.id,
        memberName: user.name,
        memberEmail: user.email,
        memberPhone: user.phone,
        officeId: user.officeId,
        officeName: user.office?.name,
        availableDates: userAvailabilities,
      }
    })

    return NextResponse.json({ availabilities: result })
  } catch (error) {
    console.error('Get availabilities error:', error)
    return NextResponse.json(
      { error: '出勤可能日の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
