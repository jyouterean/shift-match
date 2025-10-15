import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPriceTypeSchema = z.object({
  name: z.string().min(1),
  unitPrice: z.number().min(0),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const priceTypes = await prisma.priceType.findMany({
      where: { companyId: session.user.companyId },
      include: {
        _count: {
          select: { reportItems: true }
        }
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ priceTypes })
  } catch (error) {
    console.error('Get price types error:', error)
    return NextResponse.json(
      { error: '単価タイプの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { name, unitPrice, description } = createPriceTypeSchema.parse(body)

    const priceType = await prisma.priceType.create({
      data: {
        name,
        unitPrice,
        description,
        companyId: session.user.companyId,
      },
    })

    return NextResponse.json({ success: true, priceType })
  } catch (error) {
    console.error('Create price type error:', error)
    return NextResponse.json(
      { error: '単価タイプの作成に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, unitPrice, description, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 })
    }

    const existingPriceType = await prisma.priceType.findFirst({
      where: { id, companyId: session.user.companyId },
    })

    if (!existingPriceType) {
      return NextResponse.json({ error: '単価タイプが見つかりません' }, { status: 404 })
    }

    const priceType = await prisma.priceType.update({
      where: { id },
      data: { name, unitPrice, description, isActive },
    })

    return NextResponse.json({ success: true, priceType, message: '単価タイプが更新されました' })
  } catch (error) {
    console.error('Update price type error:', error)
    return NextResponse.json(
      { error: '単価タイプの更新に失敗しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 })
    }

    const existingPriceType = await prisma.priceType.findFirst({
      where: { id, companyId: session.user.companyId },
      include: { _count: { select: { reportItems: true } } }
    })

    if (!existingPriceType) {
      return NextResponse.json({ error: '単価タイプが見つかりません' }, { status: 404 })
    }

    if (existingPriceType._count.reportItems > 0) {
      return NextResponse.json(
        { error: 'この単価タイプは日報で使用されているため削除できません' },
        { status: 400 }
      )
    }

    await prisma.priceType.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: '単価タイプが削除されました' })
  } catch (error) {
    console.error('Delete price type error:', error)
    return NextResponse.json(
      { error: '単価タイプの削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

