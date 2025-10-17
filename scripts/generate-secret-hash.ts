import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer)
    })
  })
}

async function generateHash() {
  try {
    console.log('🔐 管理者専用エリアのパスワードハッシュを生成します\n')
    
    const password = await question('パスワードを入力してください: ')
    
    if (!password || password.length < 8) {
      console.error('\n❌ パスワードは8文字以上で入力してください')
      process.exit(1)
    }
    
    console.log('\n🔄 ハッシュを生成中...')
    
    const hash = await bcrypt.hash(password, 10)
    
    console.log('\n✅ ハッシュが生成されました！\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 以下の値を環境変数に設定してください：')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('ADMIN_SECRET_PASSWORD_HASH=' + hash)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('📝 設定方法:')
    console.log('   1. .env.local ファイルに追加')
    console.log('   2. Vercel環境変数に追加')
    console.log('      → Settings → Environment Variables\n')
    console.log('⚠️  このハッシュは安全に保管してください')
    console.log('⚠️  パスワードを忘れた場合は再生成が必要です\n')
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

generateHash()
