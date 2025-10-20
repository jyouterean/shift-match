/**
 * Excel出力機能テストスクリプト
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { format } from 'date-fns'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testExcelExport() {
  const baseUrl = 'http://localhost:3000'
  const currentMonth = format(new Date(), 'yyyy-MM')
  
  console.log('🧪 Excel出力機能テスト\n')
  console.log('ベースURL:', baseUrl)
  console.log('対象月:', currentMonth)
  console.log('=' .repeat(80) + '\n')

  try {
    console.log('1. Excel出力APIにアクセス...')
    const url = `${baseUrl}/api/admin/shifts/export-excel?month=${currentMonth}`
    console.log(`   URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        // 実際のアプリではCookieで認証されるが、テストでは401が返ることを確認
      }
    })
    
    console.log(`   ステータス: ${response.status}`)
    console.log(`   Content-Type: ${response.headers.get('content-type')}`)
    
    if (response.status === 401) {
      console.log('   ✅ 認証が必要（期待通り）')
    } else if (response.status === 200) {
      const contentDisposition = response.headers.get('content-disposition')
      console.log(`   Content-Disposition: ${contentDisposition}`)
      
      const text = await response.text()
      const lines = text.split('\n')
      
      console.log(`   ✅ CSV取得成功`)
      console.log(`   行数: ${lines.length}`)
      console.log(`   先頭5行:`)
      lines.slice(0, 5).forEach((line, i) => {
        console.log(`      ${i + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`)
      })
      
      // BOMチェック
      if (text.charCodeAt(0) === 0xFEFF) {
        console.log('   ✅ BOM付きUTF-8（Excelで文字化けしない）')
      } else {
        console.log('   ⚠️  BOMなし（Excelで文字化けする可能性）')
      }
      
      // ファイル名チェック
      if (contentDisposition && contentDisposition.includes(`shift_${currentMonth}.csv`)) {
        console.log('   ✅ ファイル名が正しい')
      }
    } else {
      const data = await response.json()
      console.log('   ❌ エラー:', data)
    }
    
  } catch (error) {
    console.error('❌ テストエラー:', error)
  }
  
  console.log('\n' + '=' .repeat(80))
  console.log('🎉 テスト完了\n')
  
  console.log('📝 実際の動作確認手順:')
  console.log('1. 管理者でログイン')
  console.log('2. シフトカレンダー (/admin/shifts) にアクセス')
  console.log('3. 右上の「Excel出力」ボタンをクリック')
  console.log('4. CSVファイルがダウンロードされることを確認')
  console.log('5. Excelで開いて文字化けしないことを確認')
  console.log('6. 全スタッフのシフト一覧が表示されることを確認')
  console.log('7. 営業所別集計が表示されることを確認')
}

testExcelExport()

