require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const ws = require('ws');
const bcrypt = require('bcryptjs');

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function testLogin(email, password) {
  try {
    console.log('\n🔍 ログインテスト開始');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password ? '***' : '(空)');
    
    // ユーザー検索
    console.log('\n1️⃣ データベースからユーザー検索...');
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true, office: true }
    });
    
    if (!user) {
      console.log('❌ ユーザーが見つかりません');
      return false;
    }
    
    console.log('✅ ユーザー発見:', user.name);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   Company:', user.company?.name || '(なし)');
    
    // パスワード検証
    console.log('\n2️⃣ パスワード検証...');
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      console.log('❌ パスワードが一致しません');
      return false;
    }
    
    console.log('✅ パスワード一致');
    
    // ステータスチェック
    console.log('\n3️⃣ ステータスチェック...');
    if (user.status !== 'ACTIVE') {
      console.log('❌ アカウントが無効です:', user.status);
      return false;
    }
    
    console.log('✅ ステータス: ACTIVE');
    
    // 会社チェック
    console.log('\n4️⃣ 会社情報チェック...');
    if (!user.company) {
      console.log('❌ 会社情報がありません');
      return false;
    }
    
    console.log('✅ 会社情報: OK');
    
    console.log('\n🎉 ログイン成功！すべてのチェックに合格しました。\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// コマンドライン引数からメールアドレスとパスワードを取得
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('使用方法:');
  console.log('node test-login.js <email> <password>');
  console.log('\n例:');
  console.log('node test-login.js konnitihadesukon@yahoo.co.jp your_password');
  process.exit(1);
}

testLogin(email, password);

