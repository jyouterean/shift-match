import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import jwt from 'jsonwebtoken'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const DOMAIN = process.env.DOMAIN || process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const { email, name, role } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'メールアドレスと名前が必要です' },
        { status: 400 }
      )
    }

    // 管理者と従業員のみメール認証を送信
    if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'STAFF') {
      return NextResponse.json({ ok: true, message: 'メール送信対象外' })
    }

    // JWTトークン生成（24時間有効）
    const token = jwt.sign(
      { email, name, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // 認証URLを生成
    const verificationUrl = `${DOMAIN}/api/auth/verify?token=${token}`

    // Resend APIが設定されていない場合はスキップ
    if (!resend) {
      console.warn('RESEND_API_KEY is not configured. Email verification skipped.')
      return NextResponse.json({ 
        ok: true, 
        message: 'メール送信機能が無効化されています（開発環境）' 
      })
    }

    // メール送信
    await resend.emails.send({
      from: 'ShiftMatch <noreply@shiftmatch.app>',
      to: email,
      subject: '【ShiftMatch】メールアドレスの認証',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">
            ShiftMatch メール認証
          </h1>
          
          <p>こんにちは、${name}さん</p>
          
          <p>ShiftMatchへようこそ！アカウント登録を完了するために、下のボタンをクリックしてメールアドレスを認証してください。</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              メールアドレスを認証する
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            このリンクは24時間有効です。<br>
            もしボタンがクリックできない場合は、以下のURLをブラウザにコピー＆ペーストしてください：
          </p>
          
          <p style="background-color: #f3f4f6; padding: 10px; word-break: break-all; font-size: 12px;">
            ${verificationUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            このメールに心当たりがない場合は、無視してください。<br>
            ShiftMatch チーム
          </p>
        </div>
      `,
    })

    return NextResponse.json({
      ok: true,
      message: '認証メールを送信しました',
    })
  } catch (error) {
    console.error('Send verification email error:', error)
    return NextResponse.json(
      { error: '認証メールの送信に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

