import bcrypt from 'bcryptjs'

/**
 * シークレットパスワードのハッシュを生成するスクリプト
 * 
 * 使い方:
 * npx tsx scripts/generate-secret-hash.ts
 * 
 * 生成されたハッシュを .env に以下のように追加してください:
 * ADMIN_SECRET_PASSWORD_HASH="生成されたハッシュ"
 */

async function generateHash() {
  const password = 'Remon5252' // デフォルトパスワード
  
  console.log('🔐 シークレットパスワードのハッシュを生成中...\n')
  
  const hash = await bcrypt.hash(password, 10)
  
  console.log('✅ ハッシュの生成が完了しました！\n')
  console.log('以下の行を .env ファイルに追加してください:\n')
  console.log(`ADMIN_SECRET_PASSWORD_HASH="${hash}"\n`)
  console.log('⚠️  このハッシュは安全に保管し、Gitにコミットしないでください。')
  console.log('⚠️  パスワードを変更する場合は、このスクリプトで新しいハッシュを生成してください。\n')
}

generateHash().catch(console.error)

