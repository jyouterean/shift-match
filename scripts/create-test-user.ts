/**
 * テストユーザー作成スクリプト
 * ログイン動作確認用のユーザーを作成
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 テストユーザー作成スクリプト開始...\n')

  try {
    // 1. テスト会社を作成
    console.log('1. テスト会社を作成中...')
    const company = await prisma.company.upsert({
      where: { code: 'TEST001' },
      update: {},
      create: {
        name: 'テスト会社',
        code: 'TEST001',
        requireApproval: false,
      },
    })
    console.log('✅ 会社作成完了:', company.name, 'コード:', company.code)

    // 2. テスト営業所を作成
    console.log('\n2. テスト営業所を作成中...')
    let office = await prisma.office.findFirst({
      where: {
        companyId: company.id,
        name: '本社',
      },
    })
    
    if (!office) {
      office = await prisma.office.create({
        data: {
          name: '本社',
          companyId: company.id,
        },
      })
    }
    console.log('✅ 営業所作成完了:', office.name)

    // 3. テスト管理者を作成
    console.log('\n3. テスト管理者を作成中...')
    const hashedPassword = await bcrypt.hash('test1234', 10)
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {
        password: hashedPassword,
        status: 'ACTIVE',
      },
      create: {
        email: 'admin@test.com',
        password: hashedPassword,
        name: 'テスト管理者',
        role: 'ADMIN',
        status: 'ACTIVE',
        companyId: company.id,
        officeId: office.id,
        phone: '080-1234-5678',
      },
    })
    console.log('✅ 管理者作成完了:', admin.email)

    // 4. テストスタッフを作成
    console.log('\n4. テストスタッフを作成中...')
    const staff = await prisma.user.upsert({
      where: { email: 'staff@test.com' },
      update: {
        password: hashedPassword,
        status: 'ACTIVE',
      },
      create: {
        email: 'staff@test.com',
        password: hashedPassword,
        name: 'テストスタッフ',
        role: 'STAFF',
        status: 'ACTIVE',
        companyId: company.id,
        officeId: office.id,
        phone: '080-9876-5432',
      },
    })
    console.log('✅ スタッフ作成完了:', staff.email)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 テストユーザー作成完了！\n')
    console.log('ログイン情報:')
    console.log('─'.repeat(60))
    console.log('【管理者】')
    console.log('  メール: admin@test.com')
    console.log('  パスワード: test1234')
    console.log('  ロール: ADMIN')
    console.log()
    console.log('【スタッフ】')
    console.log('  メール: staff@test.com')
    console.log('  パスワード: test1234')
    console.log('  ロール: STAFF')
    console.log()
    console.log('【会社コード】')
    console.log('  コード: TEST001')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

