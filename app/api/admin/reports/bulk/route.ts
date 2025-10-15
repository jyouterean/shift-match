import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkUpdateReportsSchema = z.object({
  reportIds: z.array(z.string()),
  status: z.enum(['APPROVED', 'REJECTED']),
})

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
    const { reportIds, status } = bulkUpdateReportsSchema.parse(body)

    const result = await prisma.dailyReport.updateMany({
      where: {
        id: { in: reportIds },
        companyId: session.user.companyId,
      },
      data: {
        status,
        approvedBy: status === 'APPROVED' ? session.user.id : null,
        approvedAt: status === 'APPROVED' ? new Date() : null,
      },
    })

    return NextResponse.json({ 
      success: true, 
      count: result.count,
      message: `${result.count}件の日報を${status === 'APPROVED' ? '承認' : '却下'}しました` 
    })
  } catch (error) {
    console.error('Bulk update reports error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '日報の一括更新に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



