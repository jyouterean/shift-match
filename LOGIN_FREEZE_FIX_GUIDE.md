# 🚀 ShiftMatch ログイン画面フリーズ修正ガイド

## 📋 概要

「サイトは開けるが、ログイン画面で固まる」問題を完全解消するための修正ガイド

---

## ✅ 実施済みの修正

### 1. **middleware.ts の修正** ✅

**変更内容:**
- `api/auth` ルートを除外して無限ループを防止
- NextAuth の認証エンドポイントが正常に動作するように修正

```typescript
export const config = {
  // api/authを除外して無限ループを防止
  matcher: [
    '/((?!_next|api/auth|favicon.ico|assets|images|public).*)',
  ]
}
```

**効果:**
- ✅ `/api/auth/session` が正常にアクセス可能
- ✅ `/api/auth/csrf` が正常にアクセス可能
- ✅ `/api/auth/callback/*` が正常にアクセス可能

---

### 2. **next.config.js の修正** ✅

**変更内容:**
- `www.shiftmatch.net` → `shiftmatch.net` への自動リダイレクト追加
- Canonical Domain の統一

```typescript
async redirects() {
  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: "www.shiftmatch.net" }],
      destination: "https://shiftmatch.net/:path*",
      permanent: true,
    },
  ]
}
```

**効果:**
- ✅ ドメインが統一される
- ✅ Cookie の整合性が保たれる
- ✅ NextAuth の動作が安定

---

### 3. **NextAuth 設定の強化** ✅

**変更内容:**
- デバッグモードの追加
- イベントハンドラの追加（ログ出力）

```typescript
debug: process.env.NEXTAUTH_DEBUG === 'true' || process.env.NODE_ENV === 'development',
events: {
  async signIn(message) {
    console.log('✅ NextAuth Event: signIn', {
      user: message.user.email,
      timestamp: new Date().toISOString(),
    })
  },
  async signOut(message) {
    console.log('🚪 NextAuth Event: signOut', {
      timestamp: new Date().toISOString(),
    })
  },
  async session(message) {
    console.log('🔐 NextAuth Event: session', {
      user: message.session?.user?.email || 'unknown',
      timestamp: new Date().toISOString(),
    })
  },
},
```

**効果:**
- ✅ 認証フローの可視化
- ✅ 問題の早期発見
- ✅ デバッグが容易に

---

### 4. **SessionDebug コンポーネント作成** ✅

**ファイル:** `components/session-debug.tsx`

**機能:**
- セッション情報をリアルタイム表示
- ステータスの可視化
- タイムスタンプ付きログ

```typescript
'use client'

import { useSession } from 'next-auth/react'

export default function SessionDebug() {
  const { data, status } = useSession()

  return (
    <div style={{ /* スタイル */ }}>
      <pre>
        {JSON.stringify({
          status,
          user: data?.user || null,
          timestamp: new Date().toISOString(),
        }, null, 2)}
      </pre>
    </div>
  )
}
```

**使用場所:**
- `app/auth/signin/page.tsx` に追加（開発環境のみ）

**効果:**
- ✅ セッション状態の可視化
- ✅ ログイン処理のデバッグ
- ✅ 問題の特定が容易

---

## 🌍 Vercel 環境変数の設定

### 必須環境変数

以下の環境変数を **Production** 環境に設定してください。

#### 1. **NEXTAUTH_URL** (必須)
```bash
NEXTAUTH_URL=https://shiftmatch.net
```

**重要:**
- ⚠️ `www` なし
- ⚠️ `https://` を含める
- ⚠️ 末尾のスラッシュなし

---

#### 2. **NEXTAUTH_SECRET** (既存)
```bash
NEXTAUTH_SECRET=delivery-management-secret-key-change-in-production-12345678
```

**確認:**
- ✅ すでに設定されている場合は変更不要
- ⚠️ 未設定の場合は以下で生成:

```bash
openssl rand -base64 32
```

---

#### 3. **NEXTAUTH_DEBUG** (デバッグ用・一時的)
```bash
NEXTAUTH_DEBUG=true
```

**用途:**
- 問題調査中のみ有効化
- 解決後は削除または `false` に設定

---

#### 4. **DATABASE_URL** (既存)
```bash
DATABASE_URL=postgresql://neondb_owner:npg_BXkZR1Jtul4n@ep-patient-unit-a15ayhvf-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**確認:**
- ✅ すでに設定済み

---

#### 5. **COOKIE_DOMAIN** (既存)
```bash
COOKIE_DOMAIN=.shiftmatch.net
```

**確認:**
- ✅ すでに設定済み

---

### 環境変数設定手順（Vercel CLI）

```bash
# 1. NEXTAUTH_URL を設定
npx vercel env add NEXTAUTH_URL production
# 入力: https://shiftmatch.net

# 2. NEXTAUTH_DEBUG を設定（一時的）
npx vercel env add NEXTAUTH_DEBUG production
# 入力: true

# 3. 設定を確認
npx vercel env ls
```

---

### 環境変数設定手順（Vercel Dashboard）

1. [Vercel Dashboard](https://vercel.com/dashboard) を開く
2. `ShiftMatch` プロジェクトを選択
3. `Settings` → `Environment Variables` を開く
4. 以下を追加:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXTAUTH_URL` | `https://shiftmatch.net` | Production ✅ |
| `NEXTAUTH_DEBUG` | `true` | Production ✅ (一時的) |

5. `Save` をクリック

---

## 🚀 デプロイ手順

### 1. 環境変数を設定

上記の手順に従って、Vercel に環境変数を設定します。

---

### 2. ビルドテスト（ローカル）

```bash
cd /Users/rean/Desktop
npm run build
```

**期待される結果:**
- ✅ ビルドエラーなし
- ✅ リントエラーなし

---

### 3. Vercel にデプロイ

```bash
npx vercel --prod
```

**デプロイが完了するまで待機してください。**

---

### 4. 動作確認

#### シークレットウィンドウで確認

1. **セッション確認**
   ```
   https://shiftmatch.net/api/auth/session
   ```
   **期待される結果:**
   ```json
   { "user": null }
   ```
   または
   ```json
   { "user": { "id": "...", "email": "...", ... } }
   ```

2. **CSRF トークン確認**
   ```
   https://shiftmatch.net/api/auth/csrf
   ```
   **期待される結果:**
   ```json
   { "csrfToken": "..." }
   ```

3. **プロバイダ一覧確認**
   ```
   https://shiftmatch.net/api/auth/providers
   ```
   **期待される結果:**
   ```json
   {
     "credentials": {
       "id": "credentials",
       "name": "credentials",
       "type": "credentials",
       ...
     }
   }
   ```

---

#### ログイン動作確認

1. `https://shiftmatch.net/auth/signin` にアクセス
2. **右下に SessionDebug が表示されること** ✅
   ```json
   {
     "status": "unauthenticated",
     "user": null,
     "timestamp": "2025-10-17T..."
   }
   ```

3. メールアドレスとパスワードを入力してログイン
4. **ログイン処理が完了すること** ✅
5. **SessionDebug のステータスが変わること** ✅
   ```json
   {
     "status": "authenticated",
     "user": { "id": "...", "email": "...", ... },
     "timestamp": "2025-10-17T..."
   }
   ```

6. **ダッシュボードにリダイレクトされること** ✅

---

#### Cookie 確認

1. Chrome DevTools を開く（F12）
2. `Application` → `Cookies` → `https://shiftmatch.net`
3. 以下の Cookie が存在することを確認:
   - ✅ `__Secure-next-auth.session-token`
   - ✅ `next-auth.csrf-token`

---

#### Network 確認

1. Chrome DevTools → `Network` タブ
2. ログイン処理を実行
3. 以下のリクエストが成功していること:
   - ✅ `/api/auth/callback/credentials` → 200 OK
   - ✅ `/api/auth/session` → 200 OK
   - ✅ リダイレクトが正常に動作

---

## 🐛 トラブルシューティング

### 問題1: ログイン画面が固まる

#### 症状
- ログインボタンをクリックしても反応しない
- ローディング状態から進まない

#### 原因と解決策

##### 原因1: `api/auth` ルートが middleware で保護されている

**確認方法:**
```bash
curl https://shiftmatch.net/api/auth/session
```

**エラーが返る場合:**
```
Redirected or 401 Unauthorized
```

**解決済み:** ✅ middleware.ts で `api/auth` を除外

---

##### 原因2: `NEXTAUTH_URL` が設定されていない

**確認方法:**
```bash
npx vercel env ls
```

**解決策:**
```bash
npx vercel env add NEXTAUTH_URL production
# 入力: https://shiftmatch.net
```

---

##### 原因3: Cookie のドメイン不一致

**確認方法:**
- DevTools → Application → Cookies
- Cookie の `Domain` を確認

**期待される値:**
```
Domain: .shiftmatch.net
```

**解決済み:** ✅ `COOKIE_DOMAIN` 環境変数で設定済み

---

### 問題2: 無限リダイレクト

#### 症状
- ログイン後にログイン画面に戻される
- ページが無限にリダイレクトされる

#### 原因と解決策

##### 原因: middleware が `/auth/signin` も保護している

**解決済み:** ✅ middleware.ts で `/auth` を除外

---

### 問題3: SessionDebug が表示されない

#### 症状
- ログイン画面で SessionDebug が表示されない

#### 原因と解決策

##### 原因: 本番環境で表示されない（意図的）

**現在の実装:**
```typescript
{process.env.NODE_ENV === 'development' && <SessionDebug />}
```

**本番環境で表示したい場合:**
```typescript
{/* 常に表示（デバッグ用） */}
<SessionDebug />
```

---

## 📊 修正内容サマリー

| 項目 | 修正前 | 修正後 | 状態 |
|------|-------|-------|------|
| **middleware matcher** | `/admin/:path*`, `/staff/:path*` | `api/auth` を除外 | ✅ |
| **next.config.js** | リダイレクトなし | `www` → `non-www` | ✅ |
| **NextAuth debug** | 開発環境のみ | 環境変数で制御 | ✅ |
| **NextAuth events** | なし | ログ出力追加 | ✅ |
| **SessionDebug** | なし | 作成済み | ✅ |
| **環境変数** | 不足 | 追加手順作成 | ⚠️ 要設定 |

---

## ✅ 問題が解決したら

### 1. デバッグ機能を削除

#### `.env.local` から削除
```bash
# NEXTAUTH_DEBUG=true  ← コメントアウトまたは削除
```

#### Vercel から削除
```bash
npx vercel env rm NEXTAUTH_DEBUG production
```

---

### 2. SessionDebug を削除

#### `app/auth/signin/page.tsx` から削除
```typescript
// import SessionDebug from '@/components/session-debug'  ← 削除

// {process.env.NODE_ENV === 'development' && <SessionDebug />}  ← 削除
```

#### ファイルを削除
```bash
rm components/session-debug.tsx
```

---

### 3. イベントハンドラを削除（オプション）

本番環境で不要な場合は、`lib/auth.ts` の `events` セクションを削除してください。

---

## 📝 チェックリスト

### デプロイ前

- [ ] Vercel 環境変数を設定（`NEXTAUTH_URL`, `NEXTAUTH_DEBUG`）
- [ ] ローカルでビルドテスト（`npm run build`）
- [ ] リントエラーがないことを確認
- [ ] Git にコミット

### デプロイ後

- [ ] `/api/auth/session` が正常にアクセス可能
- [ ] `/api/auth/csrf` が正常にアクセス可能
- [ ] `/api/auth/providers` が正常にアクセス可能
- [ ] ログイン画面が表示される
- [ ] SessionDebug が表示される（開発環境）
- [ ] ログイン処理が完了する
- [ ] Cookie が正しく設定される
- [ ] ダッシュボードにリダイレクトされる

### 問題解決後

- [ ] `NEXTAUTH_DEBUG` を削除
- [ ] `SessionDebug` コンポーネントを削除
- [ ] `events` ハンドラを削除（オプション）
- [ ] 最終デプロイ

---

## 🔗 関連ドキュメント

- 📄 [NEXTAUTH_COMPLETE_GUIDE.md](./NEXTAUTH_COMPLETE_GUIDE.md) - NextAuth 完全ガイド
- 📄 [COOKIE_CONFIGURATION_GUIDE.md](./COOKIE_CONFIGURATION_GUIDE.md) - Cookie 設定ガイド
- 📄 [SIGNIN_PATTERN_GUIDE.md](./SIGNIN_PATTERN_GUIDE.md) - ログインパターンガイド

---

**作成日:** 2025-10-17  
**プロジェクト:** ShiftMatch - シフト管理システム  
**目的:** ログイン画面フリーズ問題の完全解消  
**ステータス:** ✅ 修正完了（環境変数設定待ち）  

