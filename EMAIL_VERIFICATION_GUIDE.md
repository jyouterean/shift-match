# メール認証機能実装ガイド

**実装日:** 2025年10月15日  
**ステータス:** ✅ 完了（本番デプロイ前）

---

## 概要

Resend（無料プラン）を使用して、管理者・従業員登録時のみメール認証を実装しました。

### 主な特徴
- ✅ 登録時のみメール送信（ログイン時は送信しない）
- ✅ Resend無料プラン対応
- ✅ Vercel完全対応
- ✅ JWT トークンによる24時間有効な認証リンク
- ✅ データベースに `emailVerified` フラグを保存

---

## 実装内容

### 1. インストール済みパッケージ

```bash
npm install resend jsonwebtoken @types/jsonwebtoken
```

### 2. 環境変数（必須）

`.env` ファイルに以下を追加：

```bash
# Email Verification (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
JWT_SECRET="your-jwt-secret-key-min-32-chars-for-email-verification"
DOMAIN="https://your-domain.com"
```

#### 環境変数の取得方法

**RESEND_API_KEY**:
1. [Resend](https://resend.com/)にアクセス
2. 無料アカウント登録
3. API Keysページでキーを生成
4. 無料プラン: 月3,000通まで無料

**JWT_SECRET**:
```bash
# ランダムな32文字以上の文字列を生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**DOMAIN**:
- 開発: `http://localhost:3000`
- 本番: `https://shiftmatch-eight.vercel.app`

### 3. データベーススキーマ変更

**追加フィールド** (`prisma/schema.prisma`):
```prisma
model User {
  // ... 既存フィールド
  emailVerified     Boolean             @default(false)
  verifiedAt        DateTime?
  // ...
}
```

### 4. 実装ファイル

| ファイル | 役割 |
|---------|------|
| `app/api/auth/send-verification/route.ts` | 認証メール送信API |
| `app/api/auth/verify/route.ts` | メール認証処理API |
| `app/auth/verify-success/page.tsx` | 認証成功ページ |
| `app/auth/verify-failed/page.tsx` | 認証失敗ページ |

### 5. 更新ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/api/companies/route.ts` | 会社作成時にメール送信 |
| `app/api/companies/join/route.ts` | 会社参加時にメール送信 |
| `prisma/schema.prisma` | `emailVerified`, `verifiedAt` 追加 |

---

## デプロイ手順

### ステップ1: Resend設定

1. **Resendアカウント作成**
   - https://resend.com/ にアクセス
   - 無料アカウント登録

2. **ドメイン設定（推奨）**
   - Domains → Add Domain
   - 独自ドメインを設定（例: `noreply@your-domain.com`）
   - DNSレコードを追加（DKIM, SPF, DMARC）

3. **API Key取得**
   - API Keys → Create API Key
   - キーをコピー

### ステップ2: Vercel環境変数設定

Vercelダッシュボードで以下を設定：

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
DOMAIN=https://shiftmatch-eight.vercel.app
```

### ステップ3: データベースマイグレーション

**Vercel Postgresの場合**:
```bash
# ローカルで接続文字列を取得してマイグレーション
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

**Neonの場合**:
```bash
# 本番環境のDATABASE_URLを使用
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### ステップ4: デプロイ

```bash
# Gitにプッシュ
git add .
git commit -m "Add email verification feature"
git push

# Vercel自動デプロイ
```

---

## メール送信フロー

### 1. 会社作成時（管理者）

```
ユーザー登録
  ↓
会社作成API (/api/companies)
  ↓
ユーザー作成（emailVerified=false）
  ↓
メール送信API呼び出し (/api/auth/send-verification)
  ↓
Resend経由でメール送信
  ↓
ユーザーがリンクをクリック
  ↓
認証API (/api/auth/verify?token=xxx)
  ↓
DBで emailVerified=true に更新
  ↓
認証成功ページ (/auth/verify-success)
```

### 2. 会社参加時（従業員）

```
会社参加
  ↓
参加API (/api/companies/join)
  ↓
ユーザー作成（emailVerified=false）
  ↓
メール送信API呼び出し
  ↓
（同上のフロー）
```

---

## メールテンプレート

### 送信元アドレス
- **デフォルト**: `ShiftMatch <noreply@shiftmatch.app>`
- **カスタム**: `app/api/auth/send-verification/route.ts` で変更可能

### メール内容

```html
件名: 【ShiftMatch】メールアドレスの認証

本文:
こんにちは、{name}さん

ShiftMatchへようこそ！アカウント登録を完了するために、
下のボタンをクリックしてメールアドレスを認証してください。

[メールアドレスを認証する]（ボタン）

このリンクは24時間有効です。
```

---

## セキュリティ

### JWTトークン
- **有効期限**: 24時間
- **ペイロード**: `{ email, name, role }`
- **署名**: `JWT_SECRET` で署名

### トークン検証
```typescript
jwt.verify(token, JWT_SECRET) // 有効期限と署名を検証
```

### 監査ログ
メール認証成功時に監査ログを記録：
```typescript
{
  action: 'EMAIL_VERIFIED',
  userId: user.id,
  details: { email, verifiedAt }
}
```

---

## エラーハンドリング

### メール送信失敗
- **挙動**: ユーザー登録は成功（メール送信失敗してもロールバックしない）
- **ログ**: エラーをコンソールに出力
- **対応**: 管理画面から手動で認証メールを再送信

### トークン無効
- **原因**: 期限切れ、改ざん、署名不一致
- **画面**: `/auth/verify-failed?error=token_invalid`

### ユーザー未存在
- **原因**: ユーザーが削除された
- **画面**: `/auth/verify-failed?error=user_not_found`

---

## テスト方法

### 1. ローカル開発

**環境変数設定**:
```bash
# .env.local
RESEND_API_KEY="re_test_xxxxx"  # Resendのテストキー
JWT_SECRET="test-secret-key-for-local-development"
DOMAIN="http://localhost:3000"
```

**メール送信テスト**:
```bash
# 開発サーバー起動
npm run dev

# 会社作成
# → メールが送信される（Resendダッシュボードで確認）
```

### 2. 本番環境

**送信先テスト**:
1. テストアカウントで登録
2. 実際のメールアドレスを使用
3. メールを確認
4. 認証リンクをクリック
5. 認証成功ページを確認

---

## トラブルシューティング

### Q1: メールが届かない

**チェック項目**:
1. RESEND_API_KEYが正しいか
2. Resendダッシュボードで送信履歴を確認
3. 迷惑メールフォルダを確認
4. ドメイン設定（DKIM, SPF）を確認

**解決策**:
```bash
# Resendダッシュボード
Emails → 送信履歴 → エラーログ確認
```

### Q2: 認証リンクをクリックしてもエラー

**チェック項目**:
1. リンクの有効期限（24時間以内か）
2. JWT_SECRETが正しいか
3. DOMAINが本番URLと一致するか

**解決策**:
```bash
# サーバーログを確認
vercel logs
```

### Q3: トークン無効エラー

**原因**:
- 環境変数`JWT_SECRET`が変更された
- トークンが改ざんされた
- 期限切れ（24時間以上経過）

**解決策**:
新しい認証メールをリクエスト

---

## Resend無料プラン制限

| 項目 | 制限 |
|------|------|
| **月間送信数** | 3,000通 |
| **1日あたり** | 100通 |
| **送信レート** | 1通/秒 |
| **添付ファイル** | なし |

### 制限超過時の対応
1. 有料プラン（$20/月、50,000通）へアップグレード
2. 別のメールサービス（SendGrid, Mailgun等）に切り替え

---

## カスタマイズ

### メールデザイン変更

`app/api/auth/send-verification/route.ts`:
```typescript
html: `
  <div style="font-family: sans-serif;">
    <!-- カスタムHTML -->
  </div>
`,
```

### 送信元アドレス変更

```typescript
from: 'YourApp <noreply@your-domain.com>',
```

### 有効期限変更

```typescript
jwt.sign({ email, name, role }, JWT_SECRET, {
  expiresIn: '48h' // 24h → 48h に変更
})
```

---

## 監視とメトリクス

### Resendダッシュボード
- 送信数
- 配信率
- バウンス率
- クリック率

### 推奨アラート
- 送信失敗率 > 5%
- 月間送信数 > 2,500通（無料プラン90%）

---

## まとめ

### ✅ 実装完了
- メール認証API
- 認証成功/失敗ページ
- 会社作成・参加時の自動送信
- データベーススキーマ更新

### 📝 デプロイ前チェックリスト
- [ ] Resendアカウント作成
- [ ] API Key取得
- [ ] Vercel環境変数設定
- [ ] データベースマイグレーション実行
- [ ] メール送信テスト
- [ ] 認証フローテスト

### 🚀 デプロイ後
- メール送信数を監視
- エラー率を確認
- ユーザーフィードバックを収集

---

**実装者:** AI Development Team  
**最終更新:** 2025年10月15日  
**ステータス:** 本番デプロイReady

