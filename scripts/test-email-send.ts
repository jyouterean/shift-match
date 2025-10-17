/**
 * メール送信テストスクリプト
 * 
 * Resend APIを使用してテストメールを送信し、詳細なログを出力します
 */

import { Resend } from 'resend'
import * as dotenv from 'dotenv'
import * as path from 'path'
import jwt from 'jsonwebtoken'

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const JWT_SECRET = process.env.JWT_SECRET || ''
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

interface TestResult {
  step: string
  status: 'SUCCESS' | 'FAIL' | 'INFO'
  message: string
  details?: any
}

const results: TestResult[] = []

function log(result: TestResult) {
  results.push(result)
  const icon = result.status === 'SUCCESS' ? '✅' : result.status === 'FAIL' ? '❌' : 'ℹ️'
  console.log(`${icon} ${result.step}: ${result.message}`)
  if (result.details) {
    console.log('   詳細:', JSON.stringify(result.details, null, 2))
  }
}

async function testEnvironmentVariables() {
  console.log('\n📋 ステップ1: 環境変数の確認\n')

  if (!RESEND_API_KEY) {
    log({
      step: 'RESEND_API_KEY',
      status: 'FAIL',
      message: '未設定',
      details: '環境変数 RESEND_API_KEY が設定されていません',
    })
    return false
  }

  log({
    step: 'RESEND_API_KEY',
    status: 'SUCCESS',
    message: `設定済み (${RESEND_API_KEY.substring(0, 10)}...)`,
  })

  if (!JWT_SECRET) {
    log({
      step: 'JWT_SECRET',
      status: 'FAIL',
      message: '未設定',
    })
    return false
  }

  log({
    step: 'JWT_SECRET',
    status: 'SUCCESS',
    message: '設定済み',
  })

  log({
    step: 'NEXTAUTH_URL',
    status: 'INFO',
    message: NEXTAUTH_URL,
  })

  return true
}

async function testResendConnection() {
  console.log('\n🔌 ステップ2: Resend API接続テスト\n')

  try {
    const resend = new Resend(RESEND_API_KEY)

    log({
      step: 'Resend初期化',
      status: 'SUCCESS',
      message: 'Resendクライアントの初期化成功',
    })

    return resend
  } catch (error: any) {
    log({
      step: 'Resend初期化',
      status: 'FAIL',
      message: '初期化失敗',
      details: error.message,
    })
    return null
  }
}

async function testEmailSend(resend: Resend, testEmail: string) {
  console.log('\n📧 ステップ3: テストメール送信\n')

  try {
    // JWTトークン生成
    const token = jwt.sign(
      { 
        email: testEmail, 
        name: 'テストユーザー',
        role: 'OWNER',
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    const verificationUrl = `${NEXTAUTH_URL}/api/auth/verify?token=${token}`

    log({
      step: 'トークン生成',
      status: 'SUCCESS',
      message: 'JWTトークン生成成功',
      details: {
        tokenLength: token.length,
        verificationUrl: verificationUrl.substring(0, 50) + '...',
      },
    })

    // メール送信
    const result = await resend.emails.send({
      from: 'ShiftMatch <onboarding@resend.dev>',
      to: testEmail,
      subject: '【ShiftMatch】テストメール - メールアドレスの認証',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">
            ShiftMatch メール認証テスト
          </h1>
          
          <p>こんにちは、テストユーザーさん</p>
          
          <p>これはメール送信のテストメールです。このメールが届いていれば、メール送信機能は正常に動作しています。</p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>✅ メール送信機能は正常です</strong>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              メールアドレスを認証する（テスト）
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            このリンクは24時間有効です。<br>
            もしボタンがクリックできない場合は、以下のURLをブラウザにコピー＆ペーストしてください：
          </p>
          
          <p style="background-color: #f3f4f6; padding: 10px; word-break: break-all; font-size: 12px;">
            ${verificationUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            テスト送信日時: ${new Date().toLocaleString('ja-JP')}<br>
            送信元: ShiftMatch テストシステム<br>
            API Key: ${RESEND_API_KEY.substring(0, 10)}...
          </p>
        </div>
      `,
    })

    log({
      step: 'メール送信',
      status: 'SUCCESS',
      message: 'メール送信成功',
      details: {
        id: result.data?.id,
        to: testEmail,
        from: 'ShiftMatch <onboarding@resend.dev>',
      },
    })

    return result
  } catch (error: any) {
    log({
      step: 'メール送信',
      status: 'FAIL',
      message: 'メール送信失敗',
      details: {
        error: error.message,
        name: error.name,
        statusCode: error.statusCode,
        response: error.response?.data || error.response,
      },
    })
    return null
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 テスト結果サマリー')
  console.log('='.repeat(80) + '\n')

  const successCount = results.filter(r => r.status === 'SUCCESS').length
  const failCount = results.filter(r => r.status === 'FAIL').length
  const infoCount = results.filter(r => r.status === 'INFO').length

  console.log(`✅ SUCCESS: ${successCount}`)
  console.log(`❌ FAIL: ${failCount}`)
  console.log(`ℹ️  INFO: ${infoCount}`)

  console.log('\n' + '='.repeat(80))

  if (failCount > 0) {
    console.log('\n❌ メール送信に問題があります。上記のエラーを確認してください。\n')
    console.log('💡 よくある問題:')
    console.log('   1. RESEND_API_KEY が正しくない')
    console.log('   2. Resend のアカウントが有効でない')
    console.log('   3. 月間送信制限（100通）に達している')
    console.log('   4. メールアドレスが無効')
    console.log('\n')
  } else if (successCount > 0) {
    console.log('\n✅ メール送信テストに成功しました！')
    console.log('\n📬 メールボックスを確認してください:')
    console.log('   - 受信トレイ')
    console.log('   - 迷惑メールフォルダ')
    console.log('   - プロモーションフォルダ（Gmailの場合）')
    console.log('\n⏱️  メール到着までに数分かかる場合があります。\n')
  }
}

async function main() {
  console.log('🚀 メール送信テストを開始します...\n')
  console.log('このスクリプトは以下をテストします:')
  console.log('  1. 環境変数の設定確認')
  console.log('  2. Resend API接続')
  console.log('  3. テストメール送信')
  console.log('')

  // テストメールアドレスを入力
  const testEmail = process.argv[2]

  if (!testEmail) {
    console.error('❌ エラー: メールアドレスを指定してください\n')
    console.log('使用方法:')
    console.log('  npx tsx scripts/test-email-send.ts your-email@example.com\n')
    console.log('例:')
    console.log('  npx tsx scripts/test-email-send.ts konnitihadesukon@yahoo.co.jp\n')
    process.exit(1)
  }

  log({
    step: 'テストメールアドレス',
    status: 'INFO',
    message: testEmail,
  })

  // ステップ1: 環境変数確認
  const envOk = await testEnvironmentVariables()
  if (!envOk) {
    await printSummary()
    process.exit(1)
  }

  // ステップ2: Resend接続
  const resend = await testResendConnection()
  if (!resend) {
    await printSummary()
    process.exit(1)
  }

  // ステップ3: メール送信
  const result = await testEmailSend(resend, testEmail)

  // 結果表示
  await printSummary()

  if (result) {
    process.exit(0)
  } else {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('\n❌ 予期しないエラーが発生しました:\n')
  console.error(error)
  process.exit(1)
})

