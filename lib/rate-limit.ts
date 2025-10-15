/**
 * シンプルなインメモリレート制限実装
 * 本番環境では Redis や Vercel KV の使用を推奨
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// 古いエントリを定期的にクリーンアップ（メモリリーク防止）
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 60000) // 1分ごと

export interface RateLimitOptions {
  interval: number // ミリ秒単位のウィンドウ時間
  maxRequests: number // ウィンドウ内の最大リクエスト数
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * レート制限をチェック
 * @param identifier - 識別子（IPアドレス、ユーザーIDなど）
 * @param options - レート制限オプション
 * @returns レート制限結果
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const key = identifier

  // エントリが存在しない、または期限切れの場合は新規作成
  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + options.interval,
    }

    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - 1,
      reset: store[key].resetTime,
    }
  }

  // リクエスト数をインクリメント
  store[key].count++

  const remaining = Math.max(0, options.maxRequests - store[key].count)
  const success = store[key].count <= options.maxRequests

  return {
    success,
    limit: options.maxRequests,
    remaining,
    reset: store[key].resetTime,
  }
}

/**
 * 特定の識別子のレート制限をリセット
 * @param identifier - 識別子
 */
export function resetRateLimit(identifier: string): void {
  delete store[identifier]
}

/**
 * IPアドレスを取得
 * @param request - Next.js リクエスト
 * @returns IPアドレス
 */
export function getClientIp(request: Request): string {
  // Vercel や他のプロキシ経由の場合
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // フォールバック（開発環境用）
  return 'unknown'
}

/**
 * レート制限プリセット
 */
export const RateLimitPresets = {
  // 認証系: 5回/15分
  auth: {
    interval: 15 * 60 * 1000, // 15分
    maxRequests: 5,
  },
  // API一般: 100回/分
  api: {
    interval: 60 * 1000, // 1分
    maxRequests: 100,
  },
  // 厳格: 3回/分
  strict: {
    interval: 60 * 1000, // 1分
    maxRequests: 3,
  },
  // 緩い: 1000回/時間
  lenient: {
    interval: 60 * 60 * 1000, // 1時間
    maxRequests: 1000,
  },
}

