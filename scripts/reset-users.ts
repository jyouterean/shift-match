import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function resetUsers() {
  try {
    console.log('🔄 ユーザーデータのリセットを開始します...')

    // 1. すべての会社を取得
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    })

    console.log(`\n📊 現在のデータ:`)
    console.log(`   会社数: ${companies.length}`)
    for (const company of companies) {
      console.log(`   - ${company.name}: ${company._count.users}人`)
    }

    // 2. 各会社のデータを削除（Cascade削除により関連データも削除される）
    for (const company of companies) {
      console.log(`\n🗑️  ${company.name} のデータを削除中...`)

      // シフト希望削除
      const deletedAvailabilities = await prisma.shiftAvailability.deleteMany({
        where: {
          user: {
            companyId: company.id,
          },
        },
      })
      console.log(`   ✓ シフト希望: ${deletedAvailabilities.count}件`)

      // 日報削除
      const deletedReports = await prisma.dailyReport.deleteMany({
        where: {
          userId: {
            in: await prisma.user.findMany({
              where: { companyId: company.id },
              select: { id: true },
            }).then(users => users.map(u => u.id)),
          },
        },
      })
      console.log(`   ✓ 日報: ${deletedReports.count}件`)

      // シフト削除
      const deletedShifts = await prisma.shift.deleteMany({
        where: {
          companyId: company.id,
        },
      })
      console.log(`   ✓ シフト: ${deletedShifts.count}件`)

      // メッセージ削除
      const deletedMessages = await prisma.message.deleteMany({
        where: {
          sender: {
            companyId: company.id,
          },
        },
      })
      console.log(`   ✓ メッセージ: ${deletedMessages.count}件`)

      // 通知削除
      const deletedNotifications = await prisma.notification.deleteMany({
        where: {
          user: {
            companyId: company.id,
          },
        },
      })
      console.log(`   ✓ 通知: ${deletedNotifications.count}件`)

      // 監査ログ削除
      const deletedLogs = await prisma.auditLog.deleteMany({
        where: {
          companyId: company.id,
        },
      })
      console.log(`   ✓ 監査ログ: ${deletedLogs.count}件`)

      // 営業所必要人数削除
      const deletedRequirements = await prisma.officeRequirement.deleteMany({
        where: {
          office: {
            companyId: company.id,
          },
        },
      })
      console.log(`   ✓ 営業所必要人数: ${deletedRequirements.count}件`)

      // ルート削除
      const deletedRoutes = await prisma.route.deleteMany({
        where: {
          companyId: company.id,
        },
      })
      console.log(`   ✓ ルート: ${deletedRoutes.count}件`)

      // 単価タイプ削除
      const deletedPriceTypes = await prisma.priceType.deleteMany({
        where: {
          companyId: company.id,
        },
      })
      console.log(`   ✓ 単価タイプ: ${deletedPriceTypes.count}件`)

      // ユーザー削除
      const deletedUsers = await prisma.user.deleteMany({
        where: {
          companyId: company.id,
        },
      })
      console.log(`   ✓ ユーザー: ${deletedUsers.count}人`)

      // 営業所削除
      const deletedOffices = await prisma.office.deleteMany({
        where: {
          companyId: company.id,
        },
      })
      console.log(`   ✓ 営業所: ${deletedOffices.count}か所`)

      // 会社削除
      await prisma.company.delete({
        where: {
          id: company.id,
        },
      })
      console.log(`   ✓ 会社削除完了`)
    }

    console.log('\n✅ すべてのユーザーデータをリセットしました！')
    console.log('\n📝 次のステップ:')
    console.log('   1. ブラウザのキャッシュをクリア')
    console.log('   2. /auth/signin から新規登録')
    console.log('   3. 管理者アカウントで初期設定を実施')

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
resetUsers()
  .then(() => {
    console.log('\n🎉 完了！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 処理に失敗しました:', error)
    process.exit(1)
  })

