# NextAuth 完全ガイド 🔐

ShiftMatch プロジェクトにおける NextAuth の完全実装ガイド

---

## 📚 目次

1. [概要](#概要)
2. [セットアップ](#セットアップ)
3. [実装パターン](#実装パターン)
4. [関連ドキュメント](#関連ドキュメント)
5. [トラブルシューティング](#トラブルシューティング)

---

## 📋 概要

### プロジェクト情報

- **プロジェクト名:** ShiftMatch - シフト管理システム
- **Next.js:** 15.5.4
- **NextAuth:** 4.24.5
- **認証方式:** Credentials (Email + Password)
- **セッション:** JWT (15日間有効)

---

## 🔧 セットアップ

### 1. ファイル構成

```
/Users/rean/Desktop/
├── app/
│   ├── layout.tsx              # RootLayout (SessionProvider 統合)
│   ├── auth/
│   │   ├── signin/page.tsx     # ログインページ
│   │   ├── signup/page.tsx     # 新規登録ページ
│   │   ├── join/page.tsx       # 会社参加ページ
│   │   └── verify/route.ts     # メール認証
│   └── api/
│       └── auth/
│           └── [...nextauth]/route.ts  # NextAuth設定
├── components/
│   └── providers.tsx           # SessionProvider コンポーネント
├── lib/
│   ├── auth.ts                 # NextAuth authOptions
│   └── prisma.ts               # Prisma Client
└── middleware.ts               # 認証ミドルウェア
```

---

## 🎯 実装パターン

### パターン1: ログイン（`signIn`）

**ファイル:** `app/auth/signin/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      // ロール別リダイレクト
      const response = await fetch('/api/auth/session')
      const session = await response.json()

      if (session?.user?.role === 'OWNER' || session?.user?.role === 'ADMIN') {
        router.push('/admin/dashboard')
      } else {
        router.push('/staff/dashboard')
      }
    } catch (error) {
      setError('ログインに失敗しました')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* フォーム要素 */}
    </form>
  )
}
```

**詳細:** 📄 [SIGNIN_PATTERN_GUIDE.md](./SIGNIN_PATTERN_GUIDE.md)

---

### パターン2: セッション取得（`useSession`）

**すべての保護されたページで使用**

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      router.push('/staff/dashboard')
      return
    }
    
    // データ取得など
    fetchData()
  }, [session, status, router])

  if (status === 'loading') {
    return <LoadingSpinner />
  }

  if (!session) {
    return null
  }

  return (
    <div>
      <h1>Hello, {session.user.name}</h1>
      {/* コンテンツ */}
    </div>
  )
}
```

**詳細:** 📄 [NEXT_AUTH_USAGE_GUIDE.md](./NEXT_AUTH_USAGE_GUIDE.md)

---

### パターン3: ログアウト（`signOut`）

```typescript
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
  }

  return (
    <button onClick={handleLogout}>
      ログアウト
    </button>
  )
}
```

---

## 📂 関連ドキュメント

### 1. NextAuth `useSession` 使用ガイド
**ファイル:** `NEXT_AUTH_USAGE_GUIDE.md`

**内容:**
- ✅ 基本的な使用パターン
- ✅ `status` の3つの状態（loading/authenticated/unauthenticated）
- ✅ 実際の実装例（プロジェクトから23ページ分）
- ✅ よくある間違いと修正方法
- ✅ ロール別アクセス制御
- ✅ ローディング画面のバリエーション
- ✅ セッションデータの構造
- ✅ セッションの更新方法

**適用範囲:**
- 管理者ページ: 17ページ
- スタッフページ: 6ページ
- **合計: 23ページ**

---

### 2. NextAuth `signIn` ログインパターンガイド
**ファイル:** `SIGNIN_PATTERN_GUIDE.md`

**内容:**
- ✅ ベストプラクティス実装
- ✅ `redirect: false` の重要性
- ✅ エラーチェックパターン
- ✅ ロール別リダイレクト
- ✅ 実装パターン比較（基本/改善/完全版）
- ✅ `signIn` の戻り値の型
- ✅ よくある間違い（4パターン）
- ✅ セキュリティベストプラクティス
- ✅ ログインフローの全体像

**適用範囲:**
- ログインページ: `app/auth/signin/page.tsx`

---

## 🔐 認証フロー全体図

```
┌─────────────────────────────────────────────────────────────┐
│                     ユーザーアクセス                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ middleware.ts │  ← サーバーサイドチェック
                 └───────┬───────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
    ┌──────────────┐          ┌──────────────┐
    │ 認証済み     │          │ 未認証       │
    └──────┬───────┘          └──────┬───────┘
           │                         │
           ▼                         ▼
    ┌──────────────┐          ┌──────────────┐
    │ ページ表示   │          │ /auth/signin │
    └──────────────┘          └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ signIn()     │
                              └──────┬───────┘
                                     │
                        ┌────────────┴────────────┐
                        │                         │
                        ▼                         ▼
                 ┌──────────┐              ┌──────────┐
                 │ 成功     │              │ 失敗     │
                 └────┬─────┘              └────┬─────┘
                      │                         │
                      ▼                         ▼
               ┌─────────────┐          ┌──────────────┐
               │ セッション  │          │ エラー表示   │
               │ 作成        │          │ 再試行       │
               └──────┬──────┘          └──────────────┘
                      │
                      ▼
               ┌─────────────┐
               │ ロール判定  │
               └──────┬──────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
  ┌─────────────┐          ┌─────────────┐
  │ OWNER/ADMIN │          │ STAFF       │
  └──────┬──────┘          └──────┬──────┘
         │                         │
         ▼                         ▼
  ┌─────────────┐          ┌─────────────┐
  │ /admin/     │          │ /staff/     │
  │ dashboard   │          │ dashboard   │
  └─────────────┘          └─────────────┘
```

---

## 🔑 セッションデータ構造

### `session.user` の型定義

```typescript
interface User {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'STAFF'
  companyId: string
  officeId: string | null
}
```

### JWT トークン設定

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 15 * 24 * 60 * 60, // 15日間
    updateAge: 24 * 60 * 60,    // 24時間ごとに更新
  },
  jwt: {
    maxAge: 15 * 24 * 60 * 60, // 15日間
  },
  // ...
}
```

---

## 🛡️ セキュリティ設定

### Cookie 設定

```typescript
cookies: {
  sessionToken: {
    name: 'next-auth.session-token',
    options: {
      httpOnly: true,      // XSS対策
      sameSite: 'lax',     // CSRF対策
      path: '/',
      secure: true,        // HTTPS必須（本番環境）
      maxAge: 1296000,     // 15日間
    },
  },
}
```

### ミドルウェア保護

```typescript
// middleware.ts
export default withAuth(
  function middleware(req) {
    // トークンの有効期限チェック
    // CSP nonce 生成
    // セキュリティヘッダー設定
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // ロールベースのアクセス制御
      },
    },
  }
)
```

---

## 📊 実装状況サマリー

### ✅ 完全実装済み

| 機能 | 状態 | ファイル |
|------|------|----------|
| SessionProvider | ✅ | `components/providers.tsx` |
| RootLayout統合 | ✅ | `app/layout.tsx` |
| ログインページ | ✅ | `app/auth/signin/page.tsx` |
| 新規登録ページ | ✅ | `app/auth/signup/page.tsx` |
| 会社参加ページ | ✅ | `app/auth/join/page.tsx` |
| メール認証 | ✅ | `app/api/auth/verify/route.ts` |
| NextAuth設定 | ✅ | `app/api/auth/[...nextauth]/route.ts` |
| 認証ロジック | ✅ | `lib/auth.ts` |
| ミドルウェア | ✅ | `middleware.ts` |
| 管理者ページ | ✅ | 17ページすべて |
| スタッフページ | ✅ | 6ページすべて |

**合計:** ✅ **100% 完全実装**

---

## 🎯 ロール別アクセス制御

### ロール定義

```typescript
enum UserRole {
  OWNER  = 'OWNER',  // 会社オーナー（全権限）
  ADMIN  = 'ADMIN',  // 管理者（ほぼ全権限）
  STAFF  = 'STAFF',  // スタッフ（限定権限）
}
```

### アクセスマトリックス

| ルート | OWNER | ADMIN | STAFF |
|--------|-------|-------|-------|
| `/admin/*` | ✅ | ✅ | ❌ |
| `/staff/*` | ✅ | ✅ | ✅ |
| `/admin/settings` | ✅ | ⚠️ (一部) | ❌ |
| `/admin/secret` | ✅ (特殊認証) | ❌ | ❌ |

---

## 🐛 トラブルシューティング

### 問題1: セッションが取得できない

**症状:**
```typescript
const { data: session } = useSession()
console.log(session) // → null
```

**原因:**
- `SessionProvider` が未設定
- `'use client'` が未設定

**解決策:**
```typescript
// 1. components/providers.tsx を確認
'use client'
export function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}

// 2. app/layout.tsx を確認
import { Providers } from '@/components/providers'
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// 3. ページに 'use client' を追加
'use client'
import { useSession } from 'next-auth/react'
```

---

### 問題2: ログイン後にリダイレクトしない

**症状:**
```typescript
const result = await signIn('credentials', { email, password })
// リダイレクトされない
```

**原因:**
- `redirect: false` を指定していない

**解決策:**
```typescript
const result = await signIn('credentials', {
  email,
  password,
  redirect: false, // ← 追加
})

if (result?.ok) {
  router.push('/dashboard') // 手動でリダイレクト
}
```

---

### 問題3: ミドルウェアで無限リダイレクト

**症状:**
- ログインページに永遠にリダイレクトされる

**原因:**
- ミドルウェアの `matcher` が `/auth/signin` を含んでいる

**解決策:**
```typescript
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
    //                                            ^^^^ 除外
  ],
}
```

---

### 問題4: JWT トークンが期限切れになる

**症状:**
- 15日以内なのにログアウトされる

**原因:**
- `maxAge` と `updateAge` の設定ミス

**解決策:**
```typescript
// lib/auth.ts
session: {
  strategy: 'jwt',
  maxAge: 15 * 24 * 60 * 60,  // 15日間
  updateAge: 24 * 60 * 60,     // 24時間ごとに更新
},
jwt: {
  maxAge: 15 * 24 * 60 * 60,  // 15日間（session と同じ）
},
```

---

## ✅ チェックリスト

### セットアップ時

- [ ] `SessionProvider` を `components/providers.tsx` に作成
- [ ] `app/layout.tsx` に `Providers` を統合
- [ ] `lib/auth.ts` に `authOptions` を設定
- [ ] `app/api/auth/[...nextauth]/route.ts` を作成
- [ ] `middleware.ts` を設定
- [ ] 環境変数を `.env.local` に設定
  - [ ] `NEXTAUTH_URL`
  - [ ] `NEXTAUTH_SECRET`
  - [ ] `DATABASE_URL`

---

### ログインページ作成時

- [ ] `'use client'` ディレクティブを追加
- [ ] `signIn` で `redirect: false` を指定
- [ ] `result?.error` をチェック
- [ ] `isLoading` 状態を管理
- [ ] try-catch でエラーハンドリング
- [ ] ロール別リダイレクトを実装
- [ ] エラーメッセージを表示

---

### 保護されたページ作成時

- [ ] `'use client'` ディレクティブを追加
- [ ] `useSession` をインポート
- [ ] `status === 'loading'` をチェック
- [ ] `!session` をチェック
- [ ] ロールベースのアクセス制御
- [ ] ローディング画面を実装
- [ ] リダイレクトを `useEffect` 内で実行

---

## 📚 参考リンク

### 公式ドキュメント
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

### プロジェクト内ドキュメント
- 📄 [NEXT_AUTH_USAGE_GUIDE.md](./NEXT_AUTH_USAGE_GUIDE.md) - `useSession` 使用ガイド
- 📄 [SIGNIN_PATTERN_GUIDE.md](./SIGNIN_PATTERN_GUIDE.md) - `signIn` ログインパターン
- 📄 [ADMIN_SECRET_ACCESS_GUIDE.md](./ADMIN_SECRET_ACCESS_GUIDE.md) - 管理者専用エリア
- 📄 [QUICK_START_EMAIL.md](./QUICK_START_EMAIL.md) - メール認証クイックスタート

---

## 📝 まとめ

### 現在の実装状態

**✅ 完璧！** すべての NextAuth 機能が正しく実装されています。

### 実装の特徴

1. ✅ **完全なエラーハンドリング**
2. ✅ **ローディング状態管理**
3. ✅ **ロール別アクセス制御**
4. ✅ **セキュリティベストプラクティス**
5. ✅ **15日間のセッション有効期限**
6. ✅ **自動トークンリフレッシュ**
7. ✅ **CSP nonce 対応**
8. ✅ **メール認証統合**
9. ✅ **Rate Limiting 実装**
10. ✅ **監査ログ統合**

### 実装範囲

- **管理者ページ:** 17ページ ✅
- **スタッフページ:** 6ページ ✅
- **認証ページ:** 3ページ ✅
- **API エンドポイント:** 30+ ✅

**合計:** ✅ **すべて完全実装済み**

---

**変更不要です。現在の実装をそのまま使用してください。** 🎉✨

---

**作成日:** 2025-10-17  
**プロジェクト:** ShiftMatch - シフト管理システム  
**バージョン:** Next.js 15.5.4 + NextAuth 4.24.5  
**ステータス:** ✅ 本番環境対応完了  

