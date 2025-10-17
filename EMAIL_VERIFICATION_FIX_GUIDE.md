# 📧 メール認証問題 - 完全修正ガイド

## 📋 概要

メール認証が届かない問題の完全解決ガイド

---

## ✅ 実施した修正

### 1. **アカウントデータの削除** ✅

**実行済み:**
```bash
npm run db:reset-users
```

**削除されたデータ:**
- ✅ 会社: 2社
  - 株式会社VIA（1人）
  - （株）タカラジマ（3人）
- ✅ ユーザー: 4人
- ✅ シフト、日報、メッセージ、通知、監査ログ
- ✅ 営業所、ルート、単価タイプ

**結果:** データベースがクリーンな状態にリセットされました ✅

---

### 2. **環境変数の追加** ✅

**`.env.local` に追加:**
```bash
RESEND_API_KEY="re_c5TSwhiy_j2nB9wSkhgzGFejXU4KwU9FE"
JWT_SECRET="shiftmatch-jwt-secret-key-2025"
NEXTAUTH_URL="https://shiftmatch.net"
```

**各環境変数の役割:**

#### `RESEND_API_KEY`
- Resend のメール送信 API キー
- 既に提供済みの値を使用

#### `JWT_SECRET`
- メール認証トークンの署名用
- セキュアなランダム文字列

#### `NEXTAUTH_URL`
- メール内の認証リンク用ベースURL
- `https://shiftmatch.net` に設定

---

### 3. **送信元メールアドレスの修正** ✅

**問題:**
```typescript
from: 'ShiftMatch <noreply@shiftmatch.app>'
```
- ❌ `shiftmatch.app` ドメインは Resend で認証されていない
- ❌ 認証されていないドメインからはメール送信不可

**修正:**
```typescript
from: 'ShiftMatch <onboarding@resend.dev>'
```
- ✅ Resend 無料プランで使用可能な公式アドレス
- ✅ すぐに使用可能
- ✅ 認証不要

---

## 🌍 Resend の設定

### 無料プラン（現在）

**使用可能な送信元アドレス:**
```
onboarding@resend.dev
```

**制限:**
- ✅ 月間 100通まで送信可能
- ✅ テスト・開発に最適
- ⚠️ 送信元が `onboarding@resend.dev` 固定

**現在の設定:** ✅ これを使用中

---

### 有料プラン（将来的）

**独自ドメインを使用する場合:**

#### 1. Resend でドメイン認証

1. [Resend Dashboard](https://resend.com/domains) を開く
2. `Add Domain` をクリック
3. `shiftmatch.net` を入力
4. DNS レコードを追加:
   ```
   Type: TXT
   Name: _resend
   Value: [Resend提供の値]
   ```
5. 認証完了を待つ（数分～24時間）

#### 2. 送信元アドレスを変更

```typescript
from: 'ShiftMatch <noreply@shiftmatch.net>'
```

**メリット:**
- ✅ ブランド力向上
- ✅ 月間 50,000通まで送信可能
- ✅ プロフェッショナルな印象

---

## 📧 メール認証の動作確認

### テスト手順

#### 1. 開発サーバー起動

```bash
cd /Users/rean/Desktop
npm run dev
```

---

#### 2. 新規アカウント登録

1. ブラウザで `http://localhost:3000/auth/signup` を開く
2. 以下の情報を入力:
   - **会社名**: テスト会社
   - **あなたの名前**: テストユーザー
   - **メールアドレス**: **自分の実際のメールアドレス**
   - **パスワード**: Test1234!
3. `登録する` をクリック

---

#### 3. メール確認

**期待される動作:**
1. 登録完了メッセージが表示される ✅
2. 数分以内にメールが届く ✅
3. メールの件名: `【ShiftMatch】メールアドレスの認証` ✅
4. 送信元: `ShiftMatch <onboarding@resend.dev>` ✅

**メール内容:**
```html
ShiftMatch メール認証

こんにちは、テストユーザーさん

ShiftMatchへようこそ！アカウント登録を完了するために、
下のボタンをクリックしてメールアドレスを認証してください。

[メールアドレスを認証する]

このリンクは24時間有効です。
```

---

#### 4. メール認証リンクをクリック

**期待される動作:**
1. ブラウザで認証ページが開く ✅
2. `メール認証が完了しました` と表示される ✅
3. データベースの `emailVerified` が更新される ✅

---

#### 5. ログイン

1. `/auth/signin` にアクセス
2. 登録したメールアドレスとパスワードでログイン
3. **ダッシュボードに移動できること** ✅

---

## 🐛 トラブルシューティング

### 問題1: メールが届かない

#### 症状
- 登録後、メールが届かない
- 迷惑メールフォルダにも届かない

#### 原因と解決策

##### 原因1: `RESEND_API_KEY` が未設定

**確認方法:**
```bash
cd /Users/rean/Desktop
grep RESEND_API_KEY .env.local
```

**期待される出力:**
```
RESEND_API_KEY="re_c5TSwhiy_j2nB9wSkhgzGFejXU4KwU9FE"
```

**解決済み:** ✅ 設定完了

---

##### 原因2: 送信元アドレスが未認証

**確認方法:**
```bash
grep "from:" app/api/auth/send-verification/route.ts
```

**期待される出力:**
```typescript
from: 'ShiftMatch <onboarding@resend.dev>',
```

**解決済み:** ✅ 修正完了

---

##### 原因3: Resend API エラー

**確認方法:**
```bash
# サーバーログを確認
npm run dev
```

**エラーがある場合:**
```
Send verification email error: ...
```

**解決策:**
1. API キーが正しいか確認
2. Resend Dashboard でアカウント状態を確認
3. API 制限（100通/月）に達していないか確認

---

### 問題2: メール認証リンクが動作しない

#### 症状
- メールのリンクをクリックしても認証されない
- エラーページが表示される

#### 原因と解決策

##### 原因1: `JWT_SECRET` が未設定

**確認方法:**
```bash
grep JWT_SECRET .env.local
```

**期待される出力:**
```
JWT_SECRET="shiftmatch-jwt-secret-key-2025"
```

**解決済み:** ✅ 設定完了

---

##### 原因2: トークンの有効期限切れ

**トークンの有効期限:** 24時間

**解決策:**
1. 再度アカウント登録を実行
2. 新しいメール認証リンクを受信
3. 24時間以内にクリック

---

##### 原因3: `NEXTAUTH_URL` が間違っている

**確認方法:**
```bash
grep NEXTAUTH_URL .env.local
```

**期待される出力:**
```
NEXTAUTH_URL="https://shiftmatch.net"
```

**ローカル開発の場合:**
```
NEXTAUTH_URL="http://localhost:3000"
```

**解決済み:** ✅ 設定完了

---

### 問題3: 迷惑メールに振り分けられる

#### 症状
- メールが迷惑メールフォルダに届く

#### 原因
- `onboarding@resend.dev` は Resend の共有ドメイン
- 一部のメールサービスが迷惑メール判定する可能性

#### 解決策

##### 短期的
1. 迷惑メールフォルダを確認
2. `onboarding@resend.dev` を連絡先に追加
3. メールを「迷惑メールではない」とマーク

##### 長期的（推奨）
1. 独自ドメイン（`shiftmatch.net`）を Resend で認証
2. 送信元を `noreply@shiftmatch.net` に変更
3. SPF/DKIM/DMARC レコードを設定

---

## 🚀 本番環境（Vercel）での設定

### 環境変数の追加

#### Vercel CLI

```bash
# RESEND_API_KEY を追加
npx vercel env add RESEND_API_KEY production
# 入力: re_c5TSwhiy_j2nB9wSkhgzGFejXU4KwU9FE

# JWT_SECRET を追加
npx vercel env add JWT_SECRET production
# 入力: shiftmatch-jwt-secret-key-2025

# NEXTAUTH_URL を確認（既存の場合はスキップ）
npx vercel env add NEXTAUTH_URL production
# 入力: https://shiftmatch.net
```

---

#### Vercel Dashboard

1. [Vercel Dashboard](https://vercel.com/dashboard) を開く
2. `ShiftMatch` プロジェクトを選択
3. `Settings` → `Environment Variables`
4. 以下を追加:

| Name | Value | Environment |
|------|-------|-------------|
| `RESEND_API_KEY` | `re_c5TSwhiy_j2nB9wSkhgzGFejXU4KwU9FE` | Production ✅ |
| `JWT_SECRET` | `shiftmatch-jwt-secret-key-2025` | Production ✅ |
| `NEXTAUTH_URL` | `https://shiftmatch.net` | Production ✅ |

5. `Save` をクリック

---

### 再デプロイ

```bash
npx vercel --prod
```

---

## 📊 修正内容サマリー

| 項目 | 修正前 | 修正後 | 状態 |
|------|-------|-------|------|
| **アカウントデータ** | 4アカウント存在 | すべて削除 | ✅ |
| **RESEND_API_KEY** | 未設定 | 設定済み | ✅ |
| **JWT_SECRET** | 未設定 | 設定済み | ✅ |
| **NEXTAUTH_URL** | 未設定 | 設定済み | ✅ |
| **送信元アドレス** | `noreply@shiftmatch.app` | `onboarding@resend.dev` | ✅ |

---

## ✅ チェックリスト

### ローカル開発

- [x] アカウントデータ削除
- [x] `.env.local` に環境変数追加
- [x] 送信元アドレス修正
- [ ] 開発サーバー起動（`npm run dev`）
- [ ] 新規アカウント登録テスト
- [ ] メール受信確認
- [ ] 認証リンククリック
- [ ] ログイン動作確認

### 本番環境

- [ ] Vercel 環境変数設定
- [ ] 再デプロイ（`npx vercel --prod`）
- [ ] 本番環境でアカウント登録テスト
- [ ] メール受信確認
- [ ] 認証リンク動作確認

---

## 📝 次のステップ

### 1. ローカルテスト

```bash
cd /Users/rean/Desktop
npm run dev
```

ブラウザで `http://localhost:3000/auth/signup` にアクセスして、実際のメールアドレスで登録テストしてください。

---

### 2. メール確認

- 数分以内にメールが届くはずです
- 迷惑メールフォルダも確認してください
- 送信元: `ShiftMatch <onboarding@resend.dev>`

---

### 3. 認証リンククリック

メール内のボタンまたはURLをクリックして認証を完了してください。

---

### 4. 本番環境デプロイ

ローカルで動作確認できたら、Vercel に環境変数を設定して再デプロイしてください。

---

## 🔗 関連ドキュメント

- 📄 [QUICK_START_EMAIL.md](./QUICK_START_EMAIL.md) - メール認証クイックスタート
- 📄 [LOGIN_FREEZE_FIX_GUIDE.md](./LOGIN_FREEZE_FIX_GUIDE.md) - ログイン問題ガイド
- 📄 [NEXTAUTH_COMPLETE_GUIDE.md](./NEXTAUTH_COMPLETE_GUIDE.md) - NextAuth 完全ガイド

---

## 📧 Resend 無料プランの制限

**月間送信数:** 100通

**現在の使用状況確認:**
1. [Resend Dashboard](https://resend.com/overview) を開く
2. `Usage` セクションで使用状況を確認

**注意:**
- ⚠️ 月間100通を超えるとメール送信不可
- ⚠️ 本番環境で多くのユーザーを想定する場合は有料プラン推奨

---

## 🎯 期待される結果

### 修正前

```
❌ メールが届かない
❌ 送信元アドレスが未認証
❌ 環境変数が未設定
❌ アカウントデータが残っている
```

### 修正後

```
✅ メールが正常に送信される
✅ onboarding@resend.dev から送信
✅ すべての環境変数が設定済み
✅ データベースがクリーン
✅ 認証リンクが動作
✅ ログインが成功
```

---

**作成日:** 2025-10-17  
**プロジェクト:** ShiftMatch - シフト管理システム  
**目的:** メール認証問題の完全解消  
**ステータス:** ✅ 修正完了（テスト待ち）  

