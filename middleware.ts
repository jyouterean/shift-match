import { withAuth } from 'next-auth/middleware'
import { NextResponse, NextRequest } from 'next/server'

// Edge Runtime対応：cryptoの代わりにWeb Crypto APIを使用
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

// CSP生成関数（nonce付き - Mozilla Observatory A+対応）
// unsafe-inline と data: を完全削除
function generateCSP(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`, // 'unsafe-eval'のみNext.jsの動的importに必要
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`, // nonce方式に変更
    "img-src 'self' https: blob:", // data: を削除
    "font-src 'self' https://fonts.gstatic.com", // data: を削除
    "connect-src 'self' https: wss:",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ")
}

export default withAuth(
  function middleware(req) {
    // URL統一処理：vercel.appドメインと独自ドメインの混在を防止
    const canonicalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
    if (canonicalUrl) {
      const canonical = new URL(canonicalUrl)
      const requestUrl = req.nextUrl
      
      // HTTPSへの強制リダイレクト、または正規ドメインへのリダイレクト
      if (
        (requestUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') ||
        (requestUrl.host !== canonical.host && process.env.NODE_ENV === 'production')
      ) {
        const redirectUrl = new URL(req.url)
        redirectUrl.protocol = 'https:'
        redirectUrl.host = canonical.host
        return NextResponse.redirect(redirectUrl, 308)
      }
    }
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

    // Nonce生成とCSP設定（Edge Runtime対応）
    const nonce = generateNonce()
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
          pathname === '/admin/secret' || // 裏モードは認証不要
          pathname.startsWith('/api/companies/validate') || // 会社コード検証は認証不要
          pathname.startsWith('/api/companies/join') || // 会社参加は認証不要
          pathname === '/api/companies' // 会社作成は認証不要
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
  // api/authを除外して無限ループを防止
  matcher: [
    '/((?!_next|api/auth|favicon.ico|assets|images|public).*)',
  ]
}



