/** @type {import('next').NextConfig} */

// セキュリティヘッダー設定
// 目的：Security Headers 評価 A+ に引き上げ
// HSTS preload 対応 + CSP nonce化で unsafe-inline 完全排除
const securityHeaders = [
  // HSTS: 2年 + サブドメイン + preload対応
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  // COEP は外部リソース読み込み（Google Fonts等）と互換性のため一時的にコメントアウト
  // {
  //   key: "Cross-Origin-Embedder-Policy",
  //   value: "require-corp",
  // },
  // CSP は middleware 側で nonce を生成して差し替えるためプレースホルダに
  {
    key: "Content-Security-Policy",
    value: "__CSP__",
  },
]

const nextConfig = {
  // Allow external packages
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  
  // セキュリティヘッダーを全ページに適用
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig



