import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCompanySchema = z.object({
  name: z.string().min(1, '会社名は必須です').optional(),
  requireApproval: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      include: {
        offices: {
          include: {
            _count: {
              select: { users: true }
            }
          }
        },
        _count: {
          select: {
            users: true,
            shifts: true,
            dailyReports: true,
          }
        }
      },
    })

    if (!company) {
      return NextResponse.json({ error: '会社が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json(
      { error: '会社情報の取得に失敗しました' },
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

    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const data = updateCompanySchema.parse(body)

    const company = await prisma.company.update({
      where: { id: session.user.companyId },
      data,
    })

    return NextResponse.json({ 
      success: true, 
      company,
      message: '会社情報が更新されました' 
    })
  } catch (error) {
    console.error('Update company error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '会社情報の更新に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



