# 📧 メール認証 クイックスタート

**APIキー:** 受領済み ✅  
**所要時間:** 5分

---

## 🚀 今すぐ始める（3ステップ）

### ステップ1: 環境変数ファイル作成（1分）

プロジェクトルートに `.env.local` を作成：

```bash
DATABASE_URL="（Vercelから取得してください）"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production-min-32-chars"
ADMIN_SECRET_PASSWORD_HASH="$2a$10$Z65igX5lg66uayn5w6iF7uEf0ObsZcka9hwXNG14FzpeDM2PAQwlS"

# ✨ メール認証（これだけ追加！）
RESEND_API_KEY="re_c5TSwhiy_j2nB9wSkhgzGFejXU4KwU9FE"
JWT_SECRET="d49ddaad99223efca237f94d209fd0cbc1c9419e306300e8af0c74b4f328d81e"
DOMAIN="http://localhost:3000"
```

### ステップ2: データベース更新（1分）

**オプションA: Neonコンソールで実行**
```sql
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verifiedAt" TIMESTAMP;
```

**オプションB: ローカルから実行**
```bash
npx prisma db push
```

### ステップ3: サーバー起動（1分）

```bash
npm run dev
```

---

## ✅ テストする（2分）

### 1. 会社作成
1. http://localhost:3000 にアクセス
2. ロゴを1.5秒長押し
3. パスワード「Remon5252」入力
4. **実際のメールアドレス**を入力
5. 「作成」をクリック

### 2. メール確認
1. メールボックスを確認
2. 「【ShiftMatch】メールアドレスの認証」を開く
3. ボタンをクリック

### 3. 成功！
- 認証成功ページが表示される
- 5秒後にログインページへ遷移
- ✅ メール認証完了

---

## 🌐 本番環境（Vercel）

### 環境変数3つ追加

Vercel → Settings → Environment Variables:

```
RESEND_API_KEY = re_c5TSwhiy_j2nB9wSkhgzGFejXU4KwU9FE
JWT_SECRET = d49ddaad99223efca237f94d209fd0cbc1c9419e306300e8af0c74b4f328d81e
DOMAIN = https://shiftmatch-eight.vercel.app
```

### データベース更新

Neonコンソール → SQL Editor:
```sql
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verifiedAt" TIMESTAMP;
```

### デプロイ

```bash
git add .
git commit -m "Add email verification"
git push
```

---

## 📊 確認

### メール送信履歴
https://resend.com/emails

### 無料プラン制限
- 月3,000通まで無料
- 1日100通まで

---

## ❓ トラブルシューティング

### メールが届かない
→ https://resend.com/emails で送信履歴確認

### 認証リンクエラー
→ 24時間以内にクリック

### データベースエラー
→ マイグレーション実行確認

---

## 📚 詳細ドキュメント

- `EMAIL_VERIFICATION_GUIDE.md` - 詳細ガイド
- `SETUP_EMAIL_VERIFICATION.md` - セットアップ手順
- `EMAIL_VERIFICATION_SUMMARY.md` - 実装サマリー

---

**それだけ！** 🎉

たった3ステップで、プロフェッショナルなメール認証機能が使えます。

