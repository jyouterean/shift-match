import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkNotificationSchema = z.object({
  notificationIds: z.array(z.string()),
  action: z.enum(['markAsRead', 'delete']),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, action } = bulkNotificationSchema.parse(body)

    if (action === 'markAsRead') {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          OR: [
            { userId: session.user.id },
            { userId: null, companyId: session.user.companyId },
          ],
        },
        data: { isRead: true },
      })

      return NextResponse.json({ 
        success: true, 
        count: result.count,
        message: `${result.count}件の通知を既読にしました` 
      })
    } else {
      const result = await prisma.notification.deleteMany({
        where: {
          id: { in: notificationIds },
          OR: [
            { userId: session.user.id },
            { userId: null, companyId: session.user.companyId },
          ],
        },
      })

      return NextResponse.json({ 
        success: true, 
        count: result.count,
        message: `${result.count}件の通知を削除しました` 
      })
    }
  } catch (error) {
    console.error('Bulk notification operation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '一括操作に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



