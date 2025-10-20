/**
 * ログアウト機能テストスクリプト
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testLogout() {
  const baseUrl = 'http://localhost:3000'
  
  console.log('🧪 ログアウト機能テスト\n')
  console.log('ベースURL:', baseUrl)
  console.log('=' .repeat(80) + '\n')

  try {
    console.log('1. ログアウトAPIにアクセス...')
    const url = `${baseUrl}/api/auth/logout`
    console.log(`   URL: ${url}`)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    console.log(`   ステータス: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ レスポンス:`, data)
      
      // Set-Cookieヘッダーを確認
      const setCookies = response.headers.get('set-cookie')
      if (setCookies) {
        console.log(`   Cookie削除ヘッダー:`)
        console.log(`   ${setCookies}`)
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
  console.log('1. 管理者またはスタッフでログイン')
  console.log('2. メニューを開く（右下のメニューアイコン）')
  console.log('3. 「ログアウト」ボタンをクリック')
  console.log('4. 確認ダイアログで「OK」を選択')
  console.log('5. トップページ（/）にリダイレクトされることを確認')
  console.log('6. ブラウザを閉じて再度開く')
  console.log('7. ログインページが表示されることを確認（自動ログインされない）')
  console.log('')
  console.log('✅ 期待される動作:')
  console.log('   - ログアウト後、すべてのセッションCookieが削除される')
  console.log('   - トップページにリダイレクトされる')
  console.log('   - ブラウザを閉じて再度開いてもログイン状態が保持されない')
  console.log('')
  console.log('❌ 問題がある場合:')
  console.log('   - ブラウザの開発者ツールを開く（F12）')
  console.log('   - Application/Storage → Cookies を確認')
  console.log('   - __Secure-next-auth.session-token が残っていないか確認')
}

testLogout()

