/**
 * シフト締切テーブル追加マイグレーション
 */

import { prisma } from '../lib/prisma'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function migrate() {
  console.log('🔧 シフト締切テーブルを追加しています...\n')

  try {
    // SQLを直接実行してテーブルを作成
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "shift_deadlines" (
        "id" TEXT NOT NULL,
        "companyId" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "month" INTEGER NOT NULL,
        "deadlineDate" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "shift_deadlines_pkey" PRIMARY KEY ("id")
      );
    `)

    console.log('✅ shift_deadlines テーブルを作成しました')

    // ユニーク制約を追加
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "shift_deadlines_companyId_year_month_key" 
      ON "shift_deadlines"("companyId", "year", "month");
    `)

    console.log('✅ ユニーク制約を追加しました')

    // 外部キー制約を追加
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'shift_deadlines_companyId_fkey'
        ) THEN
          ALTER TABLE "shift_deadlines" 
          ADD CONSTRAINT "shift_deadlines_companyId_fkey" 
          FOREIGN KEY ("companyId") REFERENCES "Company"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `)

    console.log('✅ 外部キー制約を追加しました')

    console.log('\n🎉 マイグレーション完了！')
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrate()

