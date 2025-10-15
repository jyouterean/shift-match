# メール認証機能セットアップ手順

**実施日:** 2025年10月15日  
**APIキー:** 受領済み ✅

---

## 🚀 クイックスタート

### ステップ1: 環境変数ファイル作成

プロジェクトルートに `.env.local` ファイルを作成してください：

```bash
# Database
DATABASE_URL="postgresql://neondb_owner:npg_GfIVUKhOMCzH@ep-quiet-tooth-a1z1zdjz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production-min-32-chars"

# Admin Secret
ADMIN_SECRET_PASSWORD_HASH="$2a$10$Z65igX5lg66uayn5w6iF7uEf0ObsZcka9hwXNG14FzpeDM2PAQwlS"

# Email Verification (Resend)
RESEND_API_KEY="re_c5TSwhiy_j2nB9wSkhgzGFejXU4KwU9FE"
JWT_SECRET="d49ddaad99223efca237f94d209fd0cbc1c9419e306300e8af0c74b4f328d81e"
DOMAIN="http://localhost:3000"
```

### ステップ2: データベースマイグレーション

```bash
npx prisma migrate deploy
```

または、開発環境で新しいマイグレーションを作成：

```bash
npx prisma migrate dev --name add_email_verification
```

### ステップ3: 開発サーバー起動

```bash
npm run dev
```

---

## 🧪 テスト方法

### 1. 会社作成でテスト

1. ブラウザで http://localhost:3000 にアクセス
2. ロゴを1.5秒長押し（シークレットモード）
3. パスワード「Remon5252」を入力
4. 会社情報を入力（実際のメールアドレスを使用）
5. 「作成」ボタンをクリック

**期待される動作**:
- 会社が作成される
- 入力したメールアドレスに認証メールが送信される
- 「会社が作成されました。メールアドレスに認証リンクを送信しました。」というメッセージが表示される

### 2. メール確認

1. メールボックスを確認
2. 件名「【ShiftMatch】メールアドレスの認証」を開く
3. 「メールアドレスを認証する」ボタンをクリック

**期待される動作**:
- 認証成功ページが表示される
- 5秒後にログインページに自動遷移
- データベースで `emailVerified=true` に更新される

### 3. 認証状態の確認

データベースで確認：
```sql
SELECT email, "emailVerified", "verifiedAt" FROM "User" WHERE email = 'your-email@example.com';
```

監査ログで確認：
```sql
SELECT * FROM "AuditLog" WHERE action = 'EMAIL_VERIFIED' ORDER BY "createdAt" DESC LIMIT 5;
```

---

## 📧 メール送信先の設定

### Resendのドメイン設定（推奨）

1. [Resend Dashboard](https://resend.com/domains) にログイン
2. 「Add Domain」をクリック
3. ドメインを入力（例: `shiftmatch.app`）
4. DNS設定を行う：
   ```
   TXT  _resend  [表示される値]
   MX   @        feedback-smtp.resend.com
   ```
5. 検証完了後、送信元アドレスを変更：
   ```typescript
   from: 'ShiftMatch <noreply@shiftmatch.app>'
   ```

### テスト用（デフォルト）

ドメイン設定なしでも、以下のアドレスから送信可能：
```
from: 'ShiftMatch <noreply@resend.dev>'
```

---

## 🔧 トラブルシューティング

### メールが届かない

**チェック1: Resendダッシュボード**
```
https://resend.com/emails
```
- 送信履歴を確認
- エラーメッセージを確認

**チェック2: サーバーログ**
```bash
# 開発サーバーのコンソール出力を確認
# エラーがあれば表示される
```

**チェック3: 迷惑メールフォルダ**
- Gmailの場合: スパムフォルダを確認
- Outlookの場合: 迷惑メールフォルダを確認

### 認証リンクが無効

**原因1: 期限切れ（24時間）**
- 新しい認証メールをリクエスト

**原因2: JWT_SECRETが異なる**
```bash
# .env.local の JWT_SECRET を確認
# サーバー再起動
npm run dev
```

### データベースエラー

**マイグレーション未実行**
```bash
npx prisma migrate deploy
```

**接続エラー**
```bash
# DATABASE_URL を確認
npx prisma db push
```

---

## 🌐 本番環境デプロイ

### Vercel環境変数設定

Vercelダッシュボード → Settings → Environment Variables:

```
RESEND_API_KEY = re_c5TSwhiy_j2nB9wSkhgzGFejXU4KwU9FE
JWT_SECRET = d49ddaad99223efca237f94d209fd0cbc1c9419e306300e8af0c74b4f328d81e
DOMAIN = https://shiftmatch-eight.vercel.app
```

### データベースマイグレーション

```bash
# Neon PostgreSQL のコンソールで実行
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verifiedAt" TIMESTAMP;
```

または：

```bash
# ローカルから本番DBに接続してマイグレーション
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### デプロイ

```bash
git add .
git commit -m "Add email verification feature"
git push
```

Vercel自動デプロイ後：
1. 本番環境でテスト
2. 実際のメールアドレスで登録
3. メール受信確認
4. 認証フロー確認

---

## 📊 監視

### Resendダッシュボード

毎日確認：
- 送信数
- 配信成功率
- バウンス率

### アラート設定（推奨）

- 月間送信数 > 2,700通（無料プランの90%）
- 送信失敗率 > 5%

---

## 🎯 次のステップ

### すぐにできること
1. ✅ テスト送信
2. ✅ 認証フロー確認
3. ✅ エラーハンドリング確認

### オプション
1. 📧 メールテンプレートのカスタマイズ
2. 🌐 独自ドメイン設定
3. 📊 送信統計ダッシュボード

---

## 📝 チェックリスト

### ローカル開発
- [ ] `.env.local` ファイル作成
- [ ] 環境変数3つ設定
- [ ] データベースマイグレーション実行
- [ ] 開発サーバー起動
- [ ] テスト登録
- [ ] メール受信確認
- [ ] 認証リンククリック
- [ ] 認証成功確認

### 本番デプロイ
- [ ] Vercel環境変数設定
- [ ] 本番DBマイグレーション
- [ ] Gitプッシュ＆デプロイ
- [ ] 本番環境テスト
- [ ] Resend送信履歴確認

---

## 📞 サポート

問題が発生した場合：
1. `EMAIL_VERIFICATION_GUIDE.md` を確認
2. サーバーログを確認
3. Resendダッシュボードを確認

---

**セットアップ完了！** 🎉

環境変数を設定してサーバーを起動すれば、すぐにメール認証機能を使用できます。

