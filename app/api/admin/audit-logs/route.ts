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
    const limit = parseInt(searchParams.get('limit') || '100')

    const logs = await prisma.auditLog.findMany({
      where: { companyId: session.user.companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: '監査ログの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



