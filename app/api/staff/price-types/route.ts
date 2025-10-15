import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPriceTypeSchema = z.object({
  name: z.string().min(1, '単価タイプ名は必須です'),
  unitPrice: z.number().min(0, '単価は0以上である必要があります'),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 従業員は有効な単価タイプのみ取得
    const priceTypes = await prisma.priceType.findMany({
      where: { 
        companyId: session.user.companyId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ priceTypes })
  } catch (error) {
    console.error('Get staff price types error:', error)
    return NextResponse.json(
      { error: '単価タイプの取得に失敗しました' },
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
    const { name, unitPrice, description } = createPriceTypeSchema.parse(body)

    // 従業員も単価タイプを作成できる
    const priceType = await prisma.priceType.create({
      data: {
        name,
        unitPrice,
        description,
        companyId: session.user.companyId,
        isActive: true,
      },
    })

    return NextResponse.json({ 
      success: true, 
      priceType,
      message: '単価タイプが作成されました' 
    })
  } catch (error) {
    console.error('Create price type error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '単価タイプの作成に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
