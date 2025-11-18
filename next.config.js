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
  
  // ESLintエラーを無視（ビルド高速化）
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScriptエラーを本番ビルド時のみチェック
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // パフォーマンス最適化
  compress: true, // Gzip圧縮を有効化
  poweredByHeader: false, // X-Powered-Byヘッダーを削除（セキュリティ）
  swcMinify: true, // SWCミニファイを使用（高速化）
  
  // 画像最適化
  images: {
    formats: ['image/avif', 'image/webp'], // 最新フォーマットを優先
    minimumCacheTTL: 604800, // 1週間（7日 x 24時間 x 60分 x 60秒 = 604800秒）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // レスポンシブ対応
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // 実験的機能（パフォーマンス向上）
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // wwwをnon-wwwにリダイレクト
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.shiftmatch.net" }],
        destination: "https://shiftmatch.net/:path*",
        permanent: true,
      },
    ]
  },
  
  // セキュリティヘッダーを全ページに適用
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // 静的リソースのキャッシュ（1週間）
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, immutable",
          },
        ],
      },
      // 画像のキャッシュ（1週間）
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, immutable",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig



