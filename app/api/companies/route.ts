import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { rateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit'

const createCompanySchema = z.object({
  name: z.string().min(1, '会社名は必須です'),
  adminName: z.string().min(1, '管理者名は必須です'),
  adminEmail: z.string().email('有効なメールアドレスを入力してください'),
  adminPassword: z.string().min(6, 'パスワードは6文字以上である必要があります'),
  adminPhone: z.string().optional(),
})

// ランダムな会社コードを生成（8文字の英数字）
function generateCompanyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    // レート制限チェック（3回/分）
    const clientIp = getClientIp(request)
    const rateLimitResult = rateLimit(
      `company-create:${clientIp}`,
      RateLimitPresets.strict
    )

    const headers = {
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
    }

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: '試行回数が多すぎます。しばらく待ってから再試行してください。',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { status: 429, headers }
      )
    }

    const body = await request.json()
    const { name, adminName, adminEmail, adminPassword, adminPhone } = createCompanySchema.parse(body)

    // ユニークな会社コードを生成
    let code = generateCompanyCode()
    let attempts = 0
    while (attempts < 10) {
      const existingCompany = await prisma.company.findUnique({
        where: { code },
      })
      if (!existingCompany) break
      code = generateCompanyCode()
      attempts++
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: '会社コードの生成に失敗しました。もう一度お試しください。' },
        { status: 500 }
      )
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      )
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    // 会社と管理者ユーザーを作成
    const company = await prisma.company.create({
      data: {
        name,
        code,
        requireApproval: false, // 自動承認を有効化
        users: {
          create: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            phone: adminPhone,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        users: true,
      },
    })

    return NextResponse.json({ 
      success: true, 
      company: {
        id: company.id,
        name: company.name,
        code: company.code,
      },
      message: '会社が作成されました。ログインしてご利用ください。' 
    })
  } catch (error) {
    console.error('Company creation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '会社の作成に失敗しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      include: {
        offices: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
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

