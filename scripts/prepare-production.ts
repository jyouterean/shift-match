import * as dotenv from 'dotenv'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const prisma = new PrismaClient()

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 本番環境の準備開始')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // 確認
  console.log('⚠️  警告: 全てのデータが削除されます')
  console.log('')

  // データベースクリア
  console.log('🔄 テストデータを削除中...')
  await prisma.reportItem.deleteMany({})
  await prisma.dailyReport.deleteMany({})
  await prisma.shift.deleteMany({})
  await prisma.shiftAvailability.deleteMany({})
  await prisma.priceType.deleteMany({})
  await prisma.route.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.message.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.office.deleteMany({})
  await prisma.company.deleteMany({})
  
  console.log('✅ 全てのテストデータを削除しました')
  console.log('')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 本番環境の準備完了')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('📋 次のステップ:')
  console.log('')
  console.log('1. トップページにアクセス')
  console.log('   https://shiftmatch-eight.vercel.app')
  console.log('')
  console.log('2. ShiftMatchロゴを1.5秒長押し')
  console.log('')
  console.log('3. シークレットパスワードを入力（デフォルト: Remon5252）')
  console.log('   ※環境変数 ADMIN_SECRET_PASSWORD_HASH で変更可能')
  console.log('')
  console.log('4. 会社情報と管理者情報を入力')
  console.log('')
  console.log('5. 作成後、会社コードが表示されます')
  console.log('   （このコードを従業員に共有）')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎉 本番環境の準備が整いました！')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
}

main()
  .catch((e) => {
    console.error('エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



