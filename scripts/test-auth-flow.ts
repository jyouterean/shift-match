/**
 * 認証フロー完全テストスクリプト
 * 
 * このスクリプトは以下をテストします:
 * 1. データベース接続
 * 2. ユーザーと会社情報の整合性
 * 3. メール認証状態
 * 4. セッション関連の設定
 */

import { prisma } from '../lib/prisma'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  message: string
  details?: any
}

const results: TestResult[] = []

async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    results.push({
      test: 'データベース接続',
      status: 'PASS',
      message: 'データベース接続成功',
    })
  } catch (error) {
    results.push({
      test: 'データベース接続',
      status: 'FAIL',
      message: 'データベース接続失敗',
      details: error,
    })
  }
}

async function testCompanyDataIntegrity() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            emailVerified: true,
            companyId: true,
          },
        },
        _count: {
          select: {
            users: true,
            offices: true,
          },
        },
      },
    })

    results.push({
      test: '会社データ整合性',
      status: 'PASS',
      message: `会社数: ${companies.length}`,
      details: companies.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        userCount: c._count.users,
        officeCount: c._count.offices,
      })),
    })

    // ユーザーの会社情報チェック
    for (const company of companies) {
      for (const user of company.users) {
        if (user.companyId !== company.id) {
          results.push({
            test: 'ユーザー会社情報',
            status: 'FAIL',
            message: `ユーザー ${user.email} の companyId が不一致`,
            details: { user, company: { id: company.id, name: company.name } },
          })
        }
      }
    }
  } catch (error) {
    results.push({
      test: '会社データ整合性',
      status: 'FAIL',
      message: '会社データ取得失敗',
      details: error,
    })
  }
}

async function testOrphanedUsers() {
  try {
    // companyIdが設定されているが、実際のcompanyレコードが存在しないユーザーを探す
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        companyId: true,
      },
    })

    const orphanedUsers = []

    for (const user of allUsers) {
      const companyExists = await prisma.company.findUnique({
        where: { id: user.companyId },
      })

      if (!companyExists) {
        orphanedUsers.push(user)
      }
    }

    if (orphanedUsers.length > 0) {
      results.push({
        test: '孤立ユーザーチェック',
        status: 'FAIL',
        message: `会社情報がないユーザーが ${orphanedUsers.length} 人存在`,
        details: orphanedUsers,
      })
    } else {
      results.push({
        test: '孤立ユーザーチェック',
        status: 'PASS',
        message: '孤立ユーザーなし',
      })
    }
  } catch (error) {
    results.push({
      test: '孤立ユーザーチェック',
      status: 'FAIL',
      message: 'チェック失敗',
      details: error,
    })
  }
}

async function testEmailVerification() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        verifiedAt: true,
        status: true,
      },
    })

    const unverifiedUsers = users.filter(u => !u.emailVerified)

    // メール認証機能は無効化されているため、チェックは情報提供のみ
    results.push({
      test: 'メール認証状態（参考情報）',
      status: 'PASS',
      message: `メール認証機能は無効化されています（ユーザー数: ${users.length}）`,
      details: {
        totalUsers: users.length,
        note: 'メール認証は不要です',
      },
    })
  } catch (error) {
    results.push({
      test: 'メール認証状態',
      status: 'FAIL',
      message: 'チェック失敗',
      details: error,
    })
  }
}

async function testEnvironmentVariables() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'COOKIE_DOMAIN',
  ]

  const missing: string[] = []
  const present: string[] = []

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      present.push(envVar)
    } else {
      missing.push(envVar)
    }
  }

  if (missing.length > 0) {
    results.push({
      test: '環境変数チェック',
      status: 'FAIL',
      message: `不足している環境変数: ${missing.join(', ')}`,
      details: { present, missing },
    })
  } else {
    results.push({
      test: '環境変数チェック',
      status: 'PASS',
      message: 'すべての必須環境変数が設定済み',
      details: { present },
    })
  }
}

async function testActiveUsers() {
  try {
    const activeUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    results.push({
      test: 'アクティブユーザー',
      status: 'PASS',
      message: `アクティブユーザー数: ${activeUsers.length}`,
      details: activeUsers.map(u => ({
        email: u.email,
        name: u.name,
        role: u.role,
        emailVerified: u.emailVerified,
        company: u.company?.name || 'なし',
      })),
    })
  } catch (error) {
    results.push({
      test: 'アクティブユーザー',
      status: 'FAIL',
      message: 'チェック失敗',
      details: error,
    })
  }
}

async function printResults() {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 認証フロー完全テスト結果')
  console.log('='.repeat(80) + '\n')

  let passCount = 0
  let failCount = 0
  let warningCount = 0

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'
    console.log(`${icon} ${result.test}: ${result.status}`)
    console.log(`   ${result.message}`)
    
    if (result.details) {
      console.log(`   詳細:`)
      console.log(JSON.stringify(result.details, null, 2).split('\n').map(line => '      ' + line).join('\n'))
    }
    console.log()

    if (result.status === 'PASS') passCount++
    else if (result.status === 'FAIL') failCount++
    else warningCount++
  }

  console.log('='.repeat(80))
  console.log(`📊 結果サマリー:`)
  console.log(`   ✅ PASS: ${passCount}`)
  console.log(`   ❌ FAIL: ${failCount}`)
  console.log(`   ⚠️  WARNING: ${warningCount}`)
  console.log('='.repeat(80) + '\n')

  if (failCount > 0) {
    console.log('❌ テストに失敗した項目があります。上記の詳細を確認してください。\n')
    process.exit(1)
  } else if (warningCount > 0) {
    console.log('⚠️  警告がありますが、システムは動作可能です。\n')
  } else {
    console.log('✅ すべてのテストに合格しました！\n')
  }
}

async function main() {
  console.log('🚀 認証フロー完全テストを開始します...\n')

  await testDatabaseConnection()
  await testEnvironmentVariables()
  await testCompanyDataIntegrity()
  await testOrphanedUsers()
  await testEmailVerification()
  await testActiveUsers()

  await printResults()
}

main()
  .catch((error) => {
    console.error('❌ テスト実行中にエラーが発生しました:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

