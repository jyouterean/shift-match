import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { rateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // レート制限チェック（5回/15分）
    const clientIp = getClientIp(request)
    const rateLimitResult = rateLimit(
      `secret-verify:${clientIp}`,
      RateLimitPresets.auth
    )

    // レート制限ヘッダーを設定
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

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'パスワードが必要です' },
        { status: 400, headers }
      )
    }

    // 環境変数からシークレットパスワードハッシュを取得
    const secretPasswordHash = process.env.ADMIN_SECRET_PASSWORD_HASH
    
    if (!secretPasswordHash) {
      console.error('ADMIN_SECRET_PASSWORD_HASH is not configured')
      return NextResponse.json(
        { error: '設定エラーが発生しました' },
        { status: 500 }
      )
    }

    // bcryptでハッシュと比較
    const isValid = await bcrypt.compare(password, secretPasswordHash)

    if (!isValid) {
      return NextResponse.json(
        { error: 'パスワードが正しくありません' },
        { status: 401, headers }
      )
    }

    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    console.error('Secret password verification error:', error)
    return NextResponse.json(
      { error: '検証中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

