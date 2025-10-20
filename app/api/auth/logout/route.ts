import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * ログアウトAPI
 * セッションCookieを完全に削除する
 */
export async function POST(request: NextRequest) {
  try {
    // Cookieストアを取得
    const cookieStore = await cookies()
    
    // NextAuthのセッションCookieを削除
    const cookieNames = [
      '__Secure-next-auth.session-token',
      'next-auth.session-token',
      '__Secure-next-auth.callback-url',
      'next-auth.callback-url',
      '__Secure-next-auth.csrf-token',
      'next-auth.csrf-token',
    ]
    
    // すべてのNextAuth関連Cookieを削除
    cookieNames.forEach((name) => {
      cookieStore.delete(name)
    })
    
    // レスポンスを作成
    const response = NextResponse.json({ 
      success: true,
      message: 'ログアウトしました' 
    })
    
    // レスポンスヘッダーでもCookieを削除（二重保証）
    cookieNames.forEach((name) => {
      response.cookies.set(name, '', {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    })
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'ログアウトに失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

