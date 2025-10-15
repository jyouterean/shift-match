import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateAvailabilitySchema = z.object({
  date: z.string(),
  status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'MAYBE']),
  notes: z.string().optional(),
})

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

    const availabilities = await prisma.shiftAvailability.findMany({
      where,
      orderBy: { date: 'asc' },
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { date, status, notes } = updateAvailabilitySchema.parse(body)

    // 日付を正規化（タイムゾーンの影響を受けないようにUTC時刻で保存）
    const dateObj = new Date(date + 'T00:00:00.000Z')
    
    // Upsert: 存在すれば更新、なければ作成
    const availability = await prisma.shiftAvailability.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: dateObj,
        },
      },
      update: {
        status,
        notes,
      },
      create: {
        userId: session.user.id,
        date: dateObj,
        status,
        notes,
      },
    })

    return NextResponse.json({ 
      success: true, 
      availability,
      message: 'シフト希望を更新しました' 
    })
  } catch (error) {
    console.error('Update availability error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'シフト希望の更新に失敗しました' },
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
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: '日付は必須です' }, { status: 400 })
    }

    const dateObj = new Date(date + 'T00:00:00.000Z')
    
    await prisma.shiftAvailability.deleteMany({
      where: {
        userId: session.user.id,
        date: dateObj,
      },
    })

    return NextResponse.json({ 
      success: true,
      message: 'シフト希望を削除しました' 
    })
  } catch (error) {
    console.error('Delete availability error:', error)
    return NextResponse.json(
      { error: 'シフト希望の削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



