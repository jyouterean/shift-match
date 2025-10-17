import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const requirementSchema = z.object({
  date: z.string(),
  requiredCount: z.number().min(0),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
})

const bulkSchema = z.object({
  officeId: z.string(),
  requirements: z.array(requirementSchema),
})

// 一括保存
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
    const { officeId, requirements } = bulkSchema.parse(body)

    // 営業所が存在するか確認
    const office = await prisma.office.findFirst({
      where: {
        id: officeId,
        companyId: session.user.companyId,
      },
    })

    if (!office) {
      return NextResponse.json({ error: '営業所が見つかりません' }, { status: 404 })
    }

    // トランザクションで一括更新
    const results = await prisma.$transaction(
      requirements.map((req) => {
        const dateObj = new Date(req.date + 'T00:00:00Z')
        const startTimeObj = new Date(req.date + 'T' + req.startTime + ':00Z')
        const endTimeObj = new Date(req.date + 'T' + req.endTime + ':00Z')

        return prisma.officeRequirement.upsert({
          where: {
            officeId_date: {
              officeId,
              date: dateObj,
            },
          },
          update: {
            requiredCount: req.requiredCount,
            startTime: startTimeObj,
            endTime: endTimeObj,
            notes: req.notes || null,
          },
          create: {
            officeId,
            date: dateObj,
            requiredCount: req.requiredCount,
            startTime: startTimeObj,
            endTime: endTimeObj,
            notes: req.notes || null,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      count: results.length,
      message: `${results.length}件の必要人数を保存しました`,
    })
  } catch (error) {
    console.error('Bulk save requirements error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '必要人数の保存に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

