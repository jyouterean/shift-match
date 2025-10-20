/**
 * 会社コード検証テストスクリプト
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testCompanyCode() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🔍 会社コード検証テスト\n')
  console.log('ベースURL:', baseUrl)
  console.log('=' .repeat(80) + '\n')

  // テストケース
  const testCases = [
    { code: 'A9FJAY9I', description: '正しい会社コード（大文字）' },
    { code: 'a9fjay9i', description: '小文字の会社コード' },
    { code: 'A9fjay9I', description: '混在した会社コード' },
    { code: ' A9FJAY9I ', description: '前後に空白がある会社コード' },
    { code: 'INVALID', description: '存在しない会社コード' },
    { code: '', description: '空の会社コード' },
  ]

  for (const testCase of testCases) {
    console.log(`テスト: ${testCase.description}`)
    console.log(`入力: "${testCase.code}"`)
    
    try {
      const url = `${baseUrl}/api/companies/validate?code=${encodeURIComponent(testCase.code)}`
      const response = await fetch(url)
      const data = await response.json()
      
      console.log(`ステータス: ${response.status}`)
      console.log(`レスポンス:`, JSON.stringify(data, null, 2))
      
      if (data.valid) {
        console.log('✅ 検証成功:', data.companyName)
      } else {
        console.log('❌ 検証失敗')
      }
    } catch (error) {
      console.error('❌ エラー:', error)
    }
    
    console.log('-'.repeat(80) + '\n')
  }

  console.log('🎉 テスト完了\n')
}

testCompanyCode()

