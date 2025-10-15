import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createRequirementSchema = z.object({
  officeId: z.string(),
  date: z.string(),
  requiredCount: z.number().min(1),
  startTime: z.string().default('18:00'),
  endTime: z.string().default('03:00'),
  notes: z.string().optional(),
})

const bulkCreateSchema = z.object({
  officeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  requiredCount: z.number().min(1),
  startTime: z.string().default('18:00'),
  endTime: z.string().default('03:00'),
  notes: z.string().optional(),
  excludeWeekends: z.boolean().default(false),
})

// 必要人数設定の取得
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const officeId = searchParams.get('officeId')

    const where: any = {
      office: {
        companyId: session.user.companyId,
      },
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (officeId) {
      where.officeId = officeId
    }

    const requirements = await prisma.officeRequirement.findMany({
      where,
      include: {
        office: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json({ requirements })
  } catch (error) {
    console.error('Get requirements error:', error)
    return NextResponse.json(
      { error: '必要人数設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 必要人数設定の作成
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

    // 一括作成か単一作成かを判定
    if (body.startDate && body.endDate) {
      // 一括作成
      const data = bulkCreateSchema.parse(body)
      
      // 営業所が自社のものか確認
      const office = await prisma.office.findFirst({
        where: {
          id: data.officeId,
          companyId: session.user.companyId,
        },
      })

      if (!office) {
        return NextResponse.json({ error: '営業所が見つかりません' }, { status: 404 })
      }

      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      const requirements: any[] = []

      const currentDate = new Date(start)
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay()
        
        // 週末除外オプション
        if (data.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }

        requirements.push({
          officeId: data.officeId,
          date: new Date(currentDate),
          requiredCount: data.requiredCount,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes,
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      // upsertを使って既存データがあれば更新、なければ作成
      for (const req of requirements) {
        await prisma.officeRequirement.upsert({
          where: {
            officeId_date: {
              officeId: req.officeId,
              date: req.date,
            },
          },
          update: {
            requiredCount: req.requiredCount,
            startTime: req.startTime,
            endTime: req.endTime,
            notes: req.notes,
          },
          create: req,
        })
      }

      return NextResponse.json({ 
        success: true,
        count: requirements.length,
        message: `${requirements.length}件の必要人数設定を作成しました`,
      })
    } else {
      // 単一作成
      const data = createRequirementSchema.parse(body)

      // 営業所が自社のものか確認
      const office = await prisma.office.findFirst({
        where: {
          id: data.officeId,
          companyId: session.user.companyId,
        },
      })

      if (!office) {
        return NextResponse.json({ error: '営業所が見つかりません' }, { status: 404 })
      }

      const requirement = await prisma.officeRequirement.upsert({
        where: {
          officeId_date: {
            officeId: data.officeId,
            date: new Date(data.date),
          },
        },
        update: {
          requiredCount: data.requiredCount,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes,
        },
        create: {
          officeId: data.officeId,
          date: new Date(data.date),
          requiredCount: data.requiredCount,
          startTime: data.startTime,
          endTime: data.endTime,
          notes: data.notes,
        },
        include: {
          office: {
            select: {
              id: true,
              name: true,
            }
          },
        },
      })

      return NextResponse.json({ 
        success: true,
        requirement,
        message: '必要人数設定を作成しました',
      })
    }
  } catch (error) {
    console.error('Create requirement error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '必要人数設定の作成に失敗しました' },
      { status: 500 }
    )
  }
}

// 必要人数設定の削除
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 })
    }

    // 自社の設定か確認
    const requirement = await prisma.officeRequirement.findFirst({
      where: {
        id,
        office: {
          companyId: session.user.companyId,
        },
      },
    })

    if (!requirement) {
      return NextResponse.json({ error: '設定が見つかりません' }, { status: 404 })
    }

    await prisma.officeRequirement.delete({
      where: { id },
    })

    return NextResponse.json({ 
      success: true,
      message: '必要人数設定を削除しました',
    })
  } catch (error) {
    console.error('Delete requirement error:', error)
    return NextResponse.json(
      { error: '必要人数設定の削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

