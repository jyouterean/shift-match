/**
 * 認証の一貫性テストスクリプト
 * 全てのアクションで混在が発生しないことを確認
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
const baseUrl = 'http://localhost:3000'

/**
 * 1. 認証が必要なエンドポイントのテスト
 */
async function testProtectedEndpoints() {
  console.log('\n🔐 1. 保護されたエンドポイントのテスト...\n')

  const protectedEndpoints = [
    '/api/admin/dashboard/stats',
    '/api/admin/members',
    '/api/admin/shifts',
    '/api/staff/reports',
    '/api/staff/shifts',
    '/api/notifications',
  ]

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`)
      
      if (response.status === 401) {
        results.push({
          name: `保護: ${endpoint}`,
          status: 'PASS',
          message: '未認証アクセスを正しくブロック',
          details: { status: 401 }
        })
      } else {
        results.push({
          name: `保護: ${endpoint}`,
          status: 'FAIL',
          message: `予期しないステータス: ${response.status}`,
          details: { status: response.status }
        })
      }
    } catch (error) {
      results.push({
        name: `保護: ${endpoint}`,
        status: 'FAIL',
        message: 'リクエスト失敗',
        details: error
      })
    }
  }
}

/**
 * 2. 公開エンドポイントのテスト
 */
async function testPublicEndpoints() {
  console.log('\n🌐 2. 公開エンドポイントのテスト...\n')

  const publicEndpoints = [
    { path: '/api/companies/validate?code=TEST', expectedStatus: 200 },
  ]

  for (const { path, expectedStatus } of publicEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${path}`)
      
      if (response.status === expectedStatus) {
        results.push({
          name: `公開: ${path}`,
          status: 'PASS',
          message: `正しいステータス: ${expectedStatus}`,
          details: { status: response.status }
        })
      } else {
        results.push({
          name: `公開: ${path}`,
          status: 'WARN',
          message: `予期しないステータス: ${response.status}（期待: ${expectedStatus}）`,
          details: { status: response.status }
        })
      }
    } catch (error) {
      results.push({
        name: `公開: ${path}`,
        status: 'FAIL',
        message: 'リクエスト失敗',
        details: error
      })
    }
  }
}

/**
 * 3. ログアウトAPIのテスト
 */
async function testLogoutApi() {
  console.log('\n🚪 3. ログアウトAPIのテスト...\n')

  try {
    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
    })

    const data = await response.json()

    if (response.status === 200 && data.success) {
      // Set-Cookieヘッダーを確認
      const setCookie = response.headers.get('set-cookie')
      
      results.push({
        name: 'ログアウトAPI',
        status: 'PASS',
        message: 'ログアウトAPIが正常に動作',
        details: {
          status: 200,
          hasCookieHeader: !!setCookie,
          response: data
        }
      })
    } else {
      results.push({
        name: 'ログアウトAPI',
        status: 'FAIL',
        message: `予期しないレスポンス: ${response.status}`,
        details: { status: response.status, response: data }
      })
    }
  } catch (error) {
    results.push({
      name: 'ログアウトAPI',
      status: 'FAIL',
      message: 'リクエスト失敗',
      details: error
    })
  }
}

/**
 * 4. ファイルの存在確認
 */
async function testFileExistence() {
  console.log('\n📁 4. 認証ヘルパーファイルの存在確認...\n')

  const fs = require('fs')
  const files = [
    'lib/auth.ts',
    'lib/auth-helpers.ts',
    'lib/client-auth-helpers.ts',
    'components/providers.tsx',
    'middleware.ts',
  ]

  for (const file of files) {
    const filePath = path.resolve(process.cwd(), file)
    
    if (fs.existsSync(filePath)) {
      results.push({
        name: `ファイル: ${file}`,
        status: 'PASS',
        message: 'ファイルが存在します'
      })
    } else {
      results.push({
        name: `ファイル: ${file}`,
        status: 'FAIL',
        message: 'ファイルが見つかりません'
      })
    }
  }
}

/**
 * 5. 環境変数のチェック
 */
function testEnvironmentVariables() {
  console.log('\n🔧 5. 環境変数のチェック...\n')

  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ]

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      results.push({
        name: `環境変数: ${envVar}`,
        status: 'PASS',
        message: '設定されています',
        details: { length: process.env[envVar]!.length }
      })
    } else {
      results.push({
        name: `環境変数: ${envVar}`,
        status: 'FAIL',
        message: '設定されていません'
      })
    }
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
}

/**
 * メインテスト実行
 */
async function runAllTests() {
  console.log('🧪 認証の一貫性テスト開始\n')
  console.log('ベースURL:', baseUrl)
  console.log('='.repeat(80))

  try {
    await testProtectedEndpoints()
    await testPublicEndpoints()
    await testLogoutApi()
    await testFileExistence()
    testEnvironmentVariables()
  } catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error)
  }

  displayResults()

  // 終了コード
  const failCount = results.filter(r => r.status === 'FAIL').length
  process.exit(failCount === 0 ? 0 : 1)
}

runAllTests()

