import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { rateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit'

const joinCompanySchema = z.object({
  companyCode: z.string().min(1, '会社コードは必須です'),
  name: z.string().min(1, '名前は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります'),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // レート制限チェック（5回/15分）
    const clientIp = getClientIp(request)
    const rateLimitResult = rateLimit(
      `company-join:${clientIp}`,
      RateLimitPresets.auth
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
    const { companyCode: rawCompanyCode, name, email, password, phone } = joinCompanySchema.parse(body)

    // 会社コードを正規化（前後の空白削除、大文字変換）
    const companyCode = rawCompanyCode.trim().toUpperCase()

    console.log('Join company request:', { rawCompanyCode, normalized: companyCode, email })

    // 会社の存在確認（まず正規化されたコードで検索）
    let company = await prisma.company.findUnique({
      where: { code: companyCode },
      include: { offices: true },
    })

    // 見つからない場合は、大文字小文字を無視して検索
    if (!company) {
      const allCompanies = await prisma.company.findMany({
        include: { offices: true },
      })
      
      company = allCompanies.find(
        c => c.code.trim().toUpperCase() === companyCode
      ) || null

      if (company) {
        console.log('Company found with case-insensitive match:', company.code)
      }
    }

    if (!company) {
      console.log('Company not found for code:', companyCode)
      return NextResponse.json(
        { error: '会社が見つかりません。会社コードを確認してください。' },
        { status: 404 }
      )
    }

    console.log('Company found:', { id: company.id, name: company.name, code: company.code })

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      )
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10)

    // 最初のオフィスを取得（なければnull）
    const firstOffice = company.offices[0]

    // ユーザーステータスを常にACTIVEに設定（即座にログイン可能）
    const userStatus = 'ACTIVE'

    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'STAFF',
        status: userStatus,
        companyId: company.id,
        officeId: firstOffice?.id,
      },
    })

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      message: '登録が完了しました。すぐにログインしてご利用いただけます。'
    })
  } catch (error) {
    console.error('Join company error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '登録に失敗しました' },
      { status: 500 }
    )
  }
}



