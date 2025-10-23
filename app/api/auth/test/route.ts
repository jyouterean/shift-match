import { NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * NextAuth疎通テスト用エンドポイント
 * GET /api/auth/test
 * 
 * 確認項目:
 * - NextAuthが正常に動作しているか
 * - 環境変数が正しく設定されているか
 * - CSRFエンドポイントにアクセス可能か
 */
export async function GET() {
  const tests = []

  // 1. 環境変数チェック
  tests.push({
    name: 'NEXTAUTH_SECRET',
    status: process.env.NEXTAUTH_SECRET ? 'OK' : 'NG',
    value: process.env.NEXTAUTH_SECRET ? '設定済み（長さ: ' + process.env.NEXTAUTH_SECRET.length + '）' : '未設定',
  })

  tests.push({
    name: 'NEXTAUTH_URL',
    status: process.env.NEXTAUTH_URL ? 'OK' : 'NG',
    value: process.env.NEXTAUTH_URL || '未設定',
  })

  tests.push({
    name: 'DATABASE_URL',
    status: process.env.DATABASE_URL ? 'OK' : 'NG',
    value: process.env.DATABASE_URL ? '設定済み' : '未設定',
  })

  tests.push({
    name: 'NODE_ENV',
    status: 'INFO',
    value: process.env.NODE_ENV || 'development',
  })

  // 2. NextAuthエンドポイントチェック
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  try {
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`)
    tests.push({
      name: 'CSRF Endpoint',
      status: csrfResponse.ok ? 'OK' : 'NG',
      value: `Status: ${csrfResponse.status}`,
    })
  } catch (error) {
    tests.push({
      name: 'CSRF Endpoint',
      status: 'ERROR',
      value: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  try {
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`)
    tests.push({
      name: 'Session Endpoint',
      status: sessionResponse.ok ? 'OK' : 'NG',
      value: `Status: ${sessionResponse.status}`,
    })
  } catch (error) {
    tests.push({
      name: 'Session Endpoint',
      status: 'ERROR',
      value: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // 3. レスポンス生成
  const allOk = tests.filter(t => t.status === 'OK' || t.status === 'INFO').length === tests.length

  return NextResponse.json({
    success: allOk,
    timestamp: new Date().toISOString(),
    tests,
    summary: {
      total: tests.length,
      ok: tests.filter(t => t.status === 'OK').length,
      ng: tests.filter(t => t.status === 'NG').length,
      error: tests.filter(t => t.status === 'ERROR').length,
    },
    message: allOk 
      ? '✅ すべてのテストが成功しました' 
      : '❌ 一部のテストが失敗しました。詳細を確認してください。',
  }, {
    status: allOk ? 200 : 500,
  })
}

export const dynamic = 'force-dynamic'

