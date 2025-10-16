import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // トークンの有効期限チェック（15日間）
    if (token && typeof token.exp === 'number') {
      const now = Math.floor(Date.now() / 1000)
      
      // 期限切れの場合はログアウト
      if (now > token.exp) {
        const signInUrl = new URL('/auth/signin', req.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }

      // 残り3日を切ったら自動更新（updateAge設定により自動的に処理される）
      const threeDays = 3 * 24 * 60 * 60
      if (token.exp - now < threeDays) {
        // NextAuthが自動的にトークンをリフレッシュ
        console.log('Token will be refreshed automatically')
      }
    }

    // セキュリティヘッダーはnext.config.jsで設定（一元管理）
    // ただし、HSTSは本番環境のみ動的に設定
    const response = NextResponse.next()
    
    // Strict-Transport-Security (HTTPS強制、本番環境のみ)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        
        // Allow access to public routes
        if (
          pathname.startsWith('/auth/') || 
          pathname === '/' ||
          pathname === '/admin/secret' // 裏モードは認証不要
        ) {
          return true
        }
        
        // Require authentication for protected routes
        if (!token) {
          return false
        }

        // トークンの有効期限を再確認
        if (typeof token.exp === 'number') {
          const now = Math.floor(Date.now() / 1000)
          return now < token.exp
        }

        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/staff/:path*',
    '/api/protected/:path*'
  ]
}



