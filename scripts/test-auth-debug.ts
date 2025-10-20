/**
 * NextAuth 認証デバッグスクリプト
 * ログイン処理の各ステップを確認
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
}

const results: TestResult[] = []
const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

/**
 * 1. 環境変数チェック
 */
function testEnvironmentVariables() {
  console.log('\n🔧 1. 環境変数のチェック...\n')

  const requiredEnvVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
  ]

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      results.push({
        name: `環境変数: ${envVar}`,
        status: 'PASS',
        message: '設定されています',
        details: { 
          value: envVar === 'NEXTAUTH_SECRET' || envVar === 'DATABASE_URL' 
            ? '***' 
            : process.env[envVar],
          length: process.env[envVar]!.length 
        }
      })
    } else {
      results.push({
        name: `環境変数: ${envVar}`,
        status: 'FAIL',
        message: '設定されていません'
      })
    }
  }

  // NEXTAUTH_SECRETの長さチェック
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    results.push({
      name: 'NEXTAUTH_SECRET長さ',
      status: 'WARN',
      message: '32文字以上を推奨',
      details: { length: process.env.NEXTAUTH_SECRET.length }
    })
  }
}

/**
 * 2. NextAuth エンドポイントのテスト
 */
async function testNextAuthEndpoints() {
  console.log('\n🔐 2. NextAuth エンドポイントのテスト...\n')

  const endpoints = [
    '/api/auth/csrf',
    '/api/auth/providers',
    '/api/auth/session',
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`)
      
      if (response.ok) {
        const data = await response.json()
        results.push({
          name: `エンドポイント: ${endpoint}`,
          status: 'PASS',
          message: `ステータス: ${response.status}`,
          details: { 
            status: response.status,
            hasData: !!data
          }
        })
      } else {
        results.push({
          name: `エンドポイント: ${endpoint}`,
          status: 'FAIL',
          message: `ステータス: ${response.status}`,
          details: { status: response.status }
        })
      }
    } catch (error) {
      results.push({
        name: `エンドポイント: ${endpoint}`,
        status: 'FAIL',
        message: 'リクエスト失敗',
        details: error
      })
    }
  }
}

/**
 * 3. データベース接続テスト
 */
async function testDatabaseConnection() {
  console.log('\n🗄️  3. データベース接続のテスト...\n')

  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // ユーザー数を取得
    const userCount = await prisma.user.count()

    results.push({
      name: 'データベース接続',
      status: 'PASS',
      message: '接続成功',
      details: { userCount }
    })

    // サンプルユーザーの存在確認
    const sampleUser = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      }
    })

    if (sampleUser) {
      results.push({
        name: 'サンプルユーザー',
        status: 'PASS',
        message: 'ユーザーが存在します',
        details: {
          email: sampleUser.email,
          role: sampleUser.role,
          status: sampleUser.status,
        }
      })
    } else {
      results.push({
        name: 'サンプルユーザー',
        status: 'WARN',
        message: 'ユーザーが存在しません',
      })
    }

    await prisma.$disconnect()
  } catch (error) {
    results.push({
      name: 'データベース接続',
      status: 'FAIL',
      message: '接続失敗',
      details: error
    })
  }
}

/**
 * 4. ログインフロー確認
 */
async function testLoginFlow() {
  console.log('\n🔑 4. ログインフローの確認...\n')

  // CSRF トークン取得
  try {
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`)
    const csrfData = await csrfResponse.json()

    if (csrfData.csrfToken) {
      results.push({
        name: 'CSRF トークン取得',
        status: 'PASS',
        message: 'トークン取得成功',
        details: { hasToken: true }
      })
    } else {
      results.push({
        name: 'CSRF トークン取得',
        status: 'FAIL',
        message: 'トークンが取得できません',
      })
    }
  } catch (error) {
    results.push({
      name: 'CSRF トークン取得',
      status: 'FAIL',
      message: 'リクエスト失敗',
      details: error
    })
  }
}

/**
 * 結果の表示
 */
function displayResults() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 テスト結果サマリー')
  console.log('='.repeat(80) + '\n')

  const passCount = results.filter(r => r.status === 'PASS').length
  const failCount = results.filter(r => r.status === 'FAIL').length
  const warnCount = results.filter(r => r.status === 'WARN').length
  const totalCount = results.length

  console.log(`合計テスト数: ${totalCount}`)
  console.log(`✅ PASS: ${passCount}`)
  console.log(`⚠️  WARN: ${warnCount}`)
  console.log(`❌ FAIL: ${failCount}\n`)

  // 詳細結果
  console.log('詳細結果:\n')
  
  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️ ' : '❌'
    console.log(`${icon} [${result.status}] ${result.name}`)
    console.log(`   ${result.message}`)
    if (result.details) {
      console.log(`   詳細: ${JSON.stringify(result.details, null, 2).split('\n').join('\n   ')}`)
    }
    console.log()
  }

  // 合否判定
  console.log('='.repeat(80))
  if (failCount === 0) {
    console.log('🎉 すべてのテストが成功しました！')
  } else {
    console.log(`⚠️  ${failCount}個のテストが失敗しました。`)
  }
  console.log('='.repeat(80) + '\n')

  // 推奨アクション
  if (failCount > 0) {
    console.log('📋 推奨アクション:\n')
    
    const failedTests = results.filter(r => r.status === 'FAIL')
    for (const test of failedTests) {
      console.log(`- ${test.name}: ${test.message}`)
    }
    console.log()
  }
}

/**
 * メインテスト実行
 */
async function runAllTests() {
  console.log('🧪 NextAuth 認証デバッグテスト開始\n')
  console.log('ベースURL:', baseUrl)
  console.log('='.repeat(80))

  try {
    testEnvironmentVariables()
    await testNextAuthEndpoints()
    await testDatabaseConnection()
    await testLoginFlow()
  } catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error)
  }

  displayResults()

  // 終了コード
  const failCount = results.filter(r => r.status === 'FAIL').length
  process.exit(failCount === 0 ? 0 : 1)
}

runAllTests()

