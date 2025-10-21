import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function addIndexes() {
  console.log('🔧 パフォーマンスインデックスを追加中...\n')

  try {
    // Shiftテーブルにインデックスを追加
    console.log('1. Shiftテーブルのインデックスを追加...')
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Shift_companyId_date_status_idx" 
      ON "Shift"("companyId", "date", "status")
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Shift_officeId_date_idx" 
      ON "Shift"("officeId", "date")
    `)
    console.log('✅ Shiftインデックス追加完了\n')

    // ShiftAvailabilityテーブルにインデックスを追加
    console.log('2. ShiftAvailabilityテーブルのインデックスを追加...')
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ShiftAvailability_date_status_idx" 
      ON "ShiftAvailability"("date", "status")
    `)
    console.log('✅ ShiftAvailabilityインデックス追加完了\n')

    // OfficeRequirementテーブルにインデックスを追加
    console.log('3. OfficeRequirementテーブルのインデックスを追加...')
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "office_requirements_date_idx" 
      ON "office_requirements"("date")
    `)
    console.log('✅ OfficeRequirementインデックス追加完了\n')

    console.log('🎉 すべてのインデックスを正常に追加しました！')
  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addIndexes()

