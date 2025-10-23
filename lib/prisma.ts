import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// WebSocketポリフィル（Node.js環境用）
// Edge Runtimeでは不要だが、Node.js環境では必要
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// タイムゾーンをJST（Asia/Tokyo）に設定
// Node.js環境変数でタイムゾーンを指定
process.env.TZ = 'Asia/Tokyo'

// Neon Serverless接続プールの設定
const connectionString = process.env.DATABASE_URL

// データベース接続の検証
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set!')
  throw new Error('DATABASE_URL environment variable is required')
}

console.log('[prisma] Initializing Prisma Client with Neon Serverless Driver')
console.log('[prisma] Connection string:', connectionString.substring(0, 30) + '...')

// PrismaNeonアダプターの作成（PoolConfigを直接渡す）
const adapter = new PrismaNeon({ connectionString })

// PrismaClientの初期化（Neon Serverless Driver使用）
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 接続確認（初回のみ）
prisma.$connect()
  .then(() => {
    console.log('[prisma] ✅ Database connection established')
  })
  .catch((error) => {
    console.error('[prisma] ❌ Database connection failed:', error)
  })


