import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

// CSP生成関数（nonce付き）
function generateCSP(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`, // Next.jsの動的importに必要
    "style-src 'self' 'unsafe-inline'", // Tailwind CSSのJIT対応
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ")
}

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

    // Nonce生成とCSP設定
    const nonce = crypto.randomBytes(16).toString('base64')
    const response = NextResponse.next()
    
    // CSPをnonceで動的に生成
    response.headers.set('Content-Security-Policy', generateCSP(nonce))
    
    // NonceをヘッダーとしてクライアントにHint（layout.tsxで取得）
    response.headers.set('x-nonce', nonce)
    
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



