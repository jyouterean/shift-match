import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bulkCreateShiftSchema = z.object({
  userIds: z.array(z.string()),
  dates: z.array(z.string()),
  startTime: z.string(),
  endTime: z.string(),
  officeId: z.string(),
  notes: z.string().optional(),
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
    const data = bulkCreateShiftSchema.parse(body)

    const shiftsToCreate = []
    
    for (const userId of data.userIds) {
      for (const date of data.dates) {
        shiftsToCreate.push({
          userId,
          officeId: data.officeId,
          companyId: session.user.companyId,
          date: new Date(date),
          startTime: new Date(`${date}T${data.startTime}:00`),
          endTime: new Date(`${date}T${data.endTime}:00`),
          notes: data.notes || undefined,
          status: 'SCHEDULED' as const,
        })
      }
    }

    const result = await prisma.shift.createMany({
      data: shiftsToCreate,
    })

    return NextResponse.json({ 
      success: true, 
      count: result.count,
      message: `${result.count}件のシフトを作成しました` 
    })
  } catch (error) {
    console.error('Bulk create shifts error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'シフトの一括作成に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

