import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const sendMessageSchema = z.object({
  content: z.string().min(1),
  receiverId: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const messages = await prisma.message.findMany({
      where: {
        companyId: session.user.companyId,
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
          { receiverId: null },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'メッセージの取得に失敗しました' },
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
    const { content, receiverId } = sendMessageSchema.parse(body)

    const message = await prisma.message.create({
      data: {
        content,
        senderId: session.user.id,
        receiverId: receiverId || null,
        companyId: session.user.companyId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
      },
    })

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Send message error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'メッセージの送信に失敗しました' },
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

    // 自分が受信者のメッセージのみ既読にできる
    const message = await prisma.message.findFirst({
      where: {
        id,
        receiverId: session.user.id,
      },
    })

    if (!message) {
      return NextResponse.json({ error: 'メッセージが見つかりません' }, { status: 404 })
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true, message: updatedMessage })
  } catch (error) {
    console.error('Mark message as read error:', error)
    return NextResponse.json(
      { error: 'メッセージの既読化に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

