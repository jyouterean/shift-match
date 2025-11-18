import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/providers'
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ShiftMatch - シフト管理システム',
  description: '配送業界向けのシフト管理・日報システム',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // middlewareから渡されたnonceを取得（Next.js 15では非同期）
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || undefined

  return (
    <html lang="ja">
      <head>
        {/* CSP nonce対応：アプリ初期化スクリプト */}
        <Script 
          id="app-init" 
          nonce={nonce} 
          strategy="beforeInteractive"
        >
          {`window.__APP_INIT__ = true;`}
        </Script>
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  )
}
