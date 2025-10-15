import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/auth/verify-failed?error=token_missing', request.url))
    }

    // JWTトークンを検証
    let decoded: { email: string; name: string; role: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { email: string; name: string; role: string }
    } catch (error) {
      console.error('JWT verification failed:', error)
      return NextResponse.redirect(new URL('/auth/verify-failed?error=token_invalid', request.url))
    }

    // ユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    })

    if (!user) {
      return NextResponse.redirect(new URL('/auth/verify-failed?error=user_not_found', request.url))
    }

    // すでに認証済みの場合
    if (user.emailVerified) {
      return NextResponse.redirect(new URL('/auth/verify-success?status=already_verified', request.url))
    }

    // メールアドレスを認証済みに更新
    await prisma.user.update({
      where: { email: decoded.email },
      data: {
        emailVerified: true,
        verifiedAt: new Date(),
      },
    })

    // 監査ログを記録
    await prisma.auditLog.create({
      data: {
        action: 'EMAIL_VERIFIED',
        userId: user.id,
        companyId: user.companyId,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        details: {
          email: decoded.email,
          verifiedAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.redirect(new URL('/auth/verify-success', request.url))
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(new URL('/auth/verify-failed?error=server_error', request.url))
  }
}

export const dynamic = 'force-dynamic'

