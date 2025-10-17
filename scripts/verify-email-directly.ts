/**
 * データベースで直接メール認証を完了させるスクリプト
 * 
 * メールが届かない場合の緊急対処用
 */

import { prisma } from '../lib/prisma'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function verifyEmailDirectly(email: string) {
  console.log('🔧 メール認証を直接完了させます...\n')
  console.log(`対象メールアドレス: ${email}\n`)

  try {
    // ユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    })

    if (!user) {
      console.error('❌ エラー: ユーザーが見つかりません')
      console.log(`   メールアドレス: ${email}`)
      console.log('\n💡 登録されているメールアドレスを確認してください。')
      process.exit(1)
    }

    console.log('✅ ユーザーを発見:')
    console.log(`   名前: ${user.name}`)
    console.log(`   メール: ${user.email}`)
    console.log(`   ロール: ${user.role}`)
    console.log(`   会社: ${user.company?.name || 'なし'}`)
    console.log(`   現在の認証状態: ${user.emailVerified ? '✅ 認証済み' : '❌ 未認証'}`)
    console.log('')

    if (user.emailVerified) {
      console.log('✅ このユーザーは既にメール認証済みです。')
      console.log('   追加の操作は不要です。\n')
      process.exit(0)
    }

    // メール認証を完了
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        verifiedAt: new Date(),
      },
    })

    console.log('✅ メール認証が完了しました！\n')
    console.log('更新後の情報:')
    console.log(`   emailVerified: ${updatedUser.emailVerified}`)
    console.log(`   verifiedAt: ${updatedUser.verifiedAt?.toLocaleString('ja-JP')}`)
    console.log('')

    console.log('🎉 メール認証が完了しました！')
    console.log('\n次のステップ:')
    console.log('   1. https://shiftmatch.net/auth/signin にアクセス')
    console.log(`   2. メールアドレス: ${email}`)
    console.log('   3. パスワードを入力')
    console.log('   4. ログイン\n')

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error('❌ エラー: メールアドレスを指定してください\n')
    console.log('使用方法:')
    console.log('  npx tsx scripts/verify-email-directly.ts your-email@example.com\n')
    console.log('例:')
    console.log('  npx tsx scripts/verify-email-directly.ts konnitihadesukon@yahoo.co.jp\n')
    console.log('⚠️ 注意: この操作はメール認証プロセスをスキップします。')
    console.log('       メールが届かない場合の緊急対処としてのみ使用してください。\n')
    process.exit(1)
  }

  console.log('⚠️  警告: メール認証プロセスをスキップします\n')
  console.log('この操作は以下の場合にのみ使用してください:')
  console.log('  - メールが迷惑メールフォルダにもない')
  console.log('  - 10分以上待っても届かない')
  console.log('  - 別のメールアドレスでも届かない')
  console.log('  - 緊急でログインが必要\n')

  await verifyEmailDirectly(email)
}

main()

