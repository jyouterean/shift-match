import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: 指定月の締切日を取得
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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    const deadline = await prisma.shiftDeadline.findUnique({
      where: {
        companyId_year_month: {
          companyId: session.user.companyId,
          year,
          month,
        },
      },
    })

    return NextResponse.json({ deadline })
  } catch (error) {
    console.error('Get shift deadline error:', error)
    return NextResponse.json(
      { error: 'シフト締切の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST/PUT: 締切日を設定・更新
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
    const { year, month, deadlineDate } = body

    if (!year || !month || !deadlineDate) {
      return NextResponse.json(
        { error: '年、月、締切日が必要です' },
        { status: 400 }
      )
    }

    const deadline = await prisma.shiftDeadline.upsert({
      where: {
        companyId_year_month: {
          companyId: session.user.companyId,
          year,
          month,
        },
      },
      update: {
        deadlineDate: new Date(deadlineDate),
      },
      create: {
        companyId: session.user.companyId,
        year,
        month,
        deadlineDate: new Date(deadlineDate),
      },
    })

    return NextResponse.json({
      success: true,
      deadline,
      message: 'シフト締切を設定しました',
    })
  } catch (error) {
    console.error('Set shift deadline error:', error)
    return NextResponse.json(
      { error: 'シフト締切の設定に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE: 締切日を削除
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
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')

    if (!year || !month) {
      return NextResponse.json(
        { error: '年と月が必要です' },
        { status: 400 }
      )
    }

    await prisma.shiftDeadline.delete({
      where: {
        companyId_year_month: {
          companyId: session.user.companyId,
          year,
          month,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'シフト締切を削除しました',
    })
  } catch (error) {
    console.error('Delete shift deadline error:', error)
    return NextResponse.json(
      { error: 'シフト締切の削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

