import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// タイムゾーンをJST（Asia/Tokyo）に設定
// Node.js環境変数でタイムゾーンを指定
process.env.TZ = 'Asia/Tokyo'

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


