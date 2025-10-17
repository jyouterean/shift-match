import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createOfficeSchema = z.object({
  name: z.string().min(1, '営業所名は必須です'),
  address: z.string().optional(),
})

const updateOfficeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '営業所名は必須です').optional(),
  address: z.string().optional(),
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

    const offices = await prisma.office.findMany({
      where: {
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        address: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ offices })
  } catch (error) {
    console.error('Get offices error:', error)
    return NextResponse.json(
      { error: '営業所の取得に失敗しました' },
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
    const data = createOfficeSchema.parse(body)

    const office = await prisma.office.create({
      data: {
        name: data.name,
        address: data.address || null,
        companyId: session.user.companyId,
      },
    })

    return NextResponse.json({
      success: true,
      office,
      message: '営業所を作成しました',
    })
  } catch (error) {
    console.error('Create office error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '営業所の作成に失敗しました' },
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

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = updateOfficeSchema.parse(body)

    const existingOffice = await prisma.office.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    })

    if (!existingOffice) {
      return NextResponse.json({ error: '営業所が見つかりません' }, { status: 404 })
    }

    const office = await prisma.office.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      office,
      message: '営業所を更新しました',
    })
  } catch (error) {
    console.error('Update office error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '営業所の更新に失敗しました' },
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

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 })
    }

    const existingOffice = await prisma.office.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    })

    if (!existingOffice) {
      return NextResponse.json({ error: '営業所が見つかりません' }, { status: 404 })
    }

    if (existingOffice._count.users > 0) {
      return NextResponse.json(
        { error: 'メンバーが所属している営業所は削除できません' },
        { status: 400 }
      )
    }

    await prisma.office.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '営業所を削除しました',
    })
  } catch (error) {
    console.error('Delete office error:', error)
    return NextResponse.json(
      { error: '営業所の削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
