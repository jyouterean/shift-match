import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createNotificationSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['INFO', 'WARNING', 'SUCCESS', 'ERROR']).default('INFO'),
  userId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: {
        companyId: session.user.companyId,
        OR: [
          { userId: session.user.id },
          { userId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: '通知の取得に失敗しました' },
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
    const { title, content, type, userId } = createNotificationSchema.parse(body)

    if (userId) {
      const notification = await prisma.notification.create({
        data: {
          title,
          content,
          type,
          companyId: session.user.companyId,
          userId,
        },
      })
      return NextResponse.json({ success: true, notification })
    } else {
      const activeUsers = await prisma.user.findMany({
        where: {
          companyId: session.user.companyId,
          status: 'ACTIVE',
        },
        select: { id: true },
      })

      const notifications = await Promise.all(
        activeUsers.map(user =>
          prisma.notification.create({
            data: {
              title,
              content,
              type,
              companyId: session.user.companyId,
              userId: user.id,
            },
          })
        )
      )

      return NextResponse.json({ success: true, count: notifications.length })
    }
  } catch (error) {
    console.error('Create notification error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '通知の作成に失敗しました' },
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

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 })
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true, notification })
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json(
      { error: '通知の更新に失敗しました' },
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

    await prisma.notification.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json(
      { error: '通知の削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



