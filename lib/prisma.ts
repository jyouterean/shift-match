import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// タイムゾーンをJST（Asia/Tokyo）に設定
// Node.js環境変数でタイムゾーンを指定
process.env.TZ = 'Asia/Tokyo'

// データベース接続の検証
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set!')
  throw new Error('DATABASE_URL environment variable is required')
}

console.log('[prisma] Initializing Prisma Client (Standard)')
console.log('[prisma] Connection string:', connectionString.substring(0, 30) + '...')

// PrismaClientの初期化（通常のPrisma Client）
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ 
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


