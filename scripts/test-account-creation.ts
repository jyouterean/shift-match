import * as dotenv from 'dotenv'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const prisma = new PrismaClient()

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 アカウント作成テスト開始')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // データベースクリア
  console.log('🔄 既存データをクリア中...')
  try {
    await prisma.reportItem.deleteMany({})
    await prisma.dailyReport.deleteMany({})
    await prisma.shift.deleteMany({})
    await prisma.priceType.deleteMany({})
    await prisma.route.deleteMany({})
    await prisma.notification.deleteMany({})
    await prisma.message.deleteMany({})
    await prisma.auditLog.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.office.deleteMany({})
    await prisma.company.deleteMany({})
    console.log('✅ データベースをクリアしました')
  } catch (error) {
    console.log('⚠️ データベースクリアスキップ（テーブルが存在しない可能性）')
  }
  console.log('')

  // テスト1: 管理者アカウント（会社作成）
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('テスト1: 管理者アカウント作成（データベース直接）')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const testCompanyData = {
    name: 'テスト配送株式会社',
    code: 'TEST1234',
    adminName: '管理者太郎',
    adminEmail: 'admin@test.com',
    adminPassword: 'test1234',
    adminPhone: '090-1234-5678',
  }

  try {
    const hashedPassword = await bcrypt.hash(testCompanyData.adminPassword, 10)
    
    const company = await prisma.company.create({
      data: {
        name: testCompanyData.name,
        code: testCompanyData.code,
        requireApproval: false,
        users: {
          create: {
            name: testCompanyData.adminName,
            email: testCompanyData.adminEmail,
            password: hashedPassword,
            phone: testCompanyData.adminPhone,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        },
      },
      include: { users: true },
    })
    
    console.log('✅ 会社と管理者アカウントを作成しました')
    console.log(`   会社名: ${company.name}`)
    console.log(`   会社コード: ${company.code}`)
    console.log(`   管理者: ${company.users[0].name}`)
    console.log(`   管理者メール: ${company.users[0].email}`)
  } catch (error: any) {
    console.error('❌ 会社作成エラー:', error.message)
    throw error
  }

  console.log('')

  // テスト2: 会社コード検証（データベース直接）
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('テスト2: 会社コード検証')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const company = await prisma.company.findUnique({
      where: { code: 'TEST1234' },
      select: { id: true, name: true, code: true },
    })
    
    if (company) {
      console.log('✅ 会社コードが有効です')
      console.log(`   会社名: ${company.name}`)
      console.log(`   会社コード: ${company.code}`)
    } else {
      console.error('❌ 会社が見つかりません')
    }
  } catch (error: any) {
    console.error('❌ 会社コード検証エラー:', error.message)
  }

  console.log('')

  // テスト3: 従業員アカウント作成（データベース直接）
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('テスト3: 従業員アカウント作成（データベース直接）')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const testStaffData = {
    companyCode: 'TEST1234',
    name: '従業員花子',
    email: 'staff@test.com',
    password: 'test1234',
    phone: '080-9876-5432',
  }

  try {
    const company = await prisma.company.findUnique({
      where: { code: testStaffData.companyCode },
      include: { offices: true },
    })
    
    if (!company) {
      console.error('❌ 会社が見つかりません')
    } else {
      const hashedPassword = await bcrypt.hash(testStaffData.password, 10)
      
      const staff = await prisma.user.create({
        data: {
          name: testStaffData.name,
          email: testStaffData.email,
          password: hashedPassword,
          phone: testStaffData.phone,
          role: 'STAFF',
          status: 'ACTIVE',
          companyId: company.id,
          officeId: company.offices[0]?.id,
        },
      })
      
      console.log('✅ 従業員アカウントを作成しました')
      console.log(`   従業員名: ${staff.name}`)
      console.log(`   従業員メール: ${staff.email}`)
      console.log(`   ステータス: ${staff.status}`)
    }
  } catch (error: any) {
    console.error('❌ 従業員アカウント作成エラー:', error.message)
  }

  console.log('')

  // テスト4: 作成されたアカウントの確認
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('テスト4: 作成されたアカウント確認')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const allUsers = await prisma.user.findMany({
    include: {
      company: { select: { name: true, code: true } },
    },
  })

  console.log(`\n📋 登録済みユーザー: ${allUsers.length}人\n`)
  allUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} (${user.email})`)
    console.log(`   役割: ${user.role === 'OWNER' ? '管理者' : '従業員'}`)
    console.log(`   ステータス: ${user.status}`)
    console.log(`   会社: ${user.company.name} (${user.company.code})`)
    console.log('')
  })

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ テスト完了')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('📝 ログイン情報:')
  console.log('')
  console.log('【管理者】')
  console.log('  メール: admin@test.com')
  console.log('  パスワード: test1234')
  console.log('')
  console.log('【従業員】')
  console.log('  メール: staff@test.com')
  console.log('  パスワード: test1234')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌐 ログインURL:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('https://shiftmatch-eight.vercel.app/auth/signin')
  console.log('')
}

main()
  .catch((e) => {
    console.error('テストエラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
