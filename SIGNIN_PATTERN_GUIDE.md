# NextAuth `signIn` ログインパターンガイド ✅

## 📋 現在の実装（完璧版）

### ✅ ベストプラクティス実装

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
      // 1. NextAuth でログイン試行
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false, // 自動リダイレクトを無効化
      })

      // 2. エラーチェック
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      // 3. セッション情報を取得してロール別リダイレクト
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
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
        required
      />
      
      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  )
}
```

---

## 🎯 重要なポイント

### 1. **`redirect: false` を必ず指定**

```typescript
const result = await signIn('credentials', {
  email,
  password,
  redirect: false, // ← これが重要！
})
```

**理由:**
- ✅ エラーハンドリングが可能
- ✅ カスタムリダイレクトが可能
- ✅ ロール別リダイレクトが可能
- ❌ `redirect: true` だとエラー時に制御不可

---

### 2. **エラーチェックパターン**

```typescript
if (result?.error) {
  setError(result.error)
  setIsLoading(false)
  return // ← 早期リターンで処理を中断
}
```

**`result.error` の例:**
- `"CredentialsSignin"` - 認証失敗
- `"Email not verified"` - メール未認証
- カスタムエラーメッセージ

---

### 3. **成功時のリダイレクト**

#### パターンA: 固定リダイレクト（シンプル）

```typescript
if (result?.ok) {
  router.push('/dashboard')
}
```

#### パターンB: ロール別リダイレクト（推奨）

```typescript
if (result?.ok) {
  // セッション情報を取得
  const response = await fetch('/api/auth/session')
  const session = await response.json()

  // ロールに応じてリダイレクト
  if (session?.user?.role === 'OWNER' || session?.user?.role === 'ADMIN') {
    router.push('/admin/dashboard')
  } else {
    router.push('/staff/dashboard')
  }
}
```

#### パターンC: callbackUrl を使用

```typescript
import { useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    // ...
    
    if (result?.ok) {
      router.push(callbackUrl)
    }
  }
}
```

---

## 📚 実装パターン比較

### ❌ 基本パターン（シンプルだが改善の余地あり）

```typescript
const res = await signIn("credentials", { 
  email, 
  password, 
  redirect: false 
})

if (res?.error) {
  setError(res.error)
}

if (res?.ok) {
  router.replace("/dashboard")
}
```

**問題点:**
- ❌ ローディング状態の管理なし
- ❌ ロール別リダイレクトなし
- ❌ try-catch によるエラーハンドリングなし
- ⚠️ `router.replace` より `router.push` が一般的

---

### ✅ 改善パターン1（ローディング状態追加）

```typescript
const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError('')
  setIsLoading(true) // ← ローディング開始

  try {
    const result = await signIn("credentials", { 
      email, 
      password, 
      redirect: false 
    })

    if (result?.error) {
      setError(result.error)
      setIsLoading(false) // ← エラー時にローディング終了
      return
    }

    if (result?.ok) {
      // ローディング中のまま画面遷移
      router.push("/dashboard")
    }
  } catch (error) {
    setError("ログインに失敗しました")
    setIsLoading(false)
  }
}
```

**改善点:**
- ✅ ボタンの二重クリック防止
- ✅ ローディング表示
- ✅ エラーハンドリング

---

### ✅ 改善パターン2（ロール別リダイレクト）

```typescript
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

    // セッション情報を取得
    const response = await fetch('/api/auth/session')
    const session = await response.json()

    // ロール別リダイレクト
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
```

**改善点:**
- ✅ ユーザーロールに応じた適切なリダイレクト
- ✅ より良いユーザーエクスペリエンス

---

### ✅ 改善パターン3（完全版 - 現在の実装）

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

      // セッション情報を取得してロール別リダイレクト
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? 'ログイン中...' : 'ログイン'}
      </Button>
    </form>
  )
}
```

**改善点:**
- ✅ 完全なエラーハンドリング
- ✅ ローディング状態管理
- ✅ ロール別リダイレクト
- ✅ UIコンポーネントの統合
- ✅ アクセシビリティ対応
- ✅ フォームバリデーション

---

## 🔍 `signIn` の戻り値の型

```typescript
type SignInResponse = {
  error?: string        // エラーメッセージ
  status?: number       // HTTPステータスコード
  ok?: boolean          // 成功フラグ
  url?: string | null   // リダイレクトURL
}
```

### 使用例

```typescript
const result = await signIn('credentials', {
  email,
  password,
  redirect: false,
})

console.log(result)
// 成功時: { ok: true, status: 200, url: null, error: undefined }
// 失敗時: { ok: false, status: 401, url: null, error: "CredentialsSignin" }
```

---

## ⚠️ よくある間違い

### ❌ 間違い1: `redirect: false` を忘れる

```typescript
// ❌ これだとエラー時に制御不可
const result = await signIn('credentials', {
  email,
  password,
})

// エラーハンドリングができない
if (result?.error) {
  setError(result.error) // ← 実行されない
}
```

**修正:**
```typescript
// ✅ 正しい
const result = await signIn('credentials', {
  email,
  password,
  redirect: false, // ← 追加
})

if (result?.error) {
  setError(result.error) // ← 正しく実行される
}
```

---

### ❌ 間違い2: エラー時に `isLoading` を `false` にしない

```typescript
// ❌ これだとボタンがずっとローディング中になる
const handleSubmit = async (e: React.FormEvent) => {
  setIsLoading(true)
  
  const result = await signIn('credentials', {
    email,
    password,
    redirect: false,
  })

  if (result?.error) {
    setError(result.error)
    // setIsLoading(false) ← これを忘れると問題
    return
  }
}
```

**修正:**
```typescript
// ✅ 正しい
if (result?.error) {
  setError(result.error)
  setIsLoading(false) // ← 必ず追加
  return
}
```

---

### ❌ 間違い3: try-catch を使わない

```typescript
// ❌ ネットワークエラー等で例外が発生すると未処理
const handleSubmit = async (e: React.FormEvent) => {
  setIsLoading(true)
  
  const result = await signIn('credentials', {
    email,
    password,
    redirect: false,
  })
  
  // ネットワークエラーでここに到達しない
  if (result?.error) {
    setError(result.error)
  }
}
```

**修正:**
```typescript
// ✅ 正しい
const handleSubmit = async (e: React.FormEvent) => {
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
    
    router.push('/dashboard')
  } catch (error) {
    setError('ログインに失敗しました')
    setIsLoading(false)
  }
}
```

---

### ❌ 間違い4: `router.replace` vs `router.push`

```typescript
// ⚠️ これは戻るボタンでログインページに戻れない
if (result?.ok) {
  router.replace('/dashboard') // replace は履歴を置き換え
}
```

**推奨:**
```typescript
// ✅ より良い（戻るボタンが正常に動作）
if (result?.ok) {
  router.push('/dashboard') // push は履歴に追加
}
```

**使い分け:**
- `router.push()`: 通常のナビゲーション（履歴に追加）
- `router.replace()`: 履歴を置き換える（戻るボタンで戻れない）

**ログイン後は `push` が推奨** ✅

---

## 🔐 セキュリティベストプラクティス

### 1. **パスワードフィールドの自動補完**

```typescript
<Input
  id="password"
  type="password"
  autoComplete="current-password" // ← 追加推奨
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>
```

### 2. **CSRF保護**

NextAuth は自動的に CSRF トークンを処理します。手動での実装は不要です。✅

### 3. **Rate Limiting**

```typescript
// プロジェクトでは API 側で実装済み
// app/api/auth/[...nextauth]/route.ts で rateLimit() を使用
```

---

## 📊 ログインフローの全体像

```
┌─────────────────┐
│  ユーザー入力   │
│  email/password │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ handleSubmit()  │
│ setIsLoading(T) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ signIn('creds') │
│ redirect: false │
└────────┬────────┘
         │
    ┌────┴────┐
    │ result  │
    └────┬────┘
         │
    ┌────┴────────┐
    │             │
    ▼             ▼
┌────────┐   ┌────────┐
│ Error? │   │  OK?   │
└───┬────┘   └───┬────┘
    │            │
    ▼            ▼
┌────────┐   ┌────────────┐
│setError│   │fetch session│
│setLoad │   └──────┬──────┘
│(false) │          │
└────────┘          ▼
               ┌─────────┐
               │Role別   │
               │redirect │
               └─────────┘
```

---

## ✅ チェックリスト

ログイン実装時のチェックポイント：

- [ ] `'use client'` ディレクティブを追加したか？
- [ ] `redirect: false` を指定したか？
- [ ] `result?.error` をチェックしたか？
- [ ] エラー時に `isLoading` を `false` にしたか？
- [ ] try-catch でエラーハンドリングしたか？
- [ ] ローディング中はボタンを無効化したか？
- [ ] ローディング中は入力フィールドを無効化したか？
- [ ] ロール別リダイレクトを実装したか？
- [ ] エラーメッセージを表示したか？
- [ ] フォームの `onSubmit` で `e.preventDefault()` したか？

---

## 🎯 まとめ

### ユーザー提供コード（基本版）

```typescript
const res = await signIn("credentials", { email, password, redirect: false });
if (res?.error) setError(res.error);
if (res?.ok) router.replace("/dashboard");
```

**評価:**
- ✅ 基本的には正しい
- ⚠️ ローディング状態管理なし
- ⚠️ try-catch なし
- ⚠️ ロール別リダイレクトなし
- ⚠️ `router.replace` より `router.push` が推奨

---

### 現在の実装（完全版）

```typescript
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
```

**評価:**
- ✅ 完全なエラーハンドリング
- ✅ ローディング状態管理
- ✅ ロール別リダイレクト
- ✅ try-catch によるエラーハンドリング
- ✅ UXの向上

---

### 推奨実装レベル

| レベル | 説明 | 適用シーン |
|--------|------|------------|
| **基本** | ユーザー提供コード | プロトタイプ、学習用 |
| **標準** | ローディング + try-catch | 小規模アプリ |
| **推奨** | 現在の実装 | **本番環境（このプロジェクト）** ✅ |

---

## 📝 結論

**現在の実装は完璧です！** ✅

ユーザーが提供したコードは基本的に正しいですが、**現在の実装の方がはるかに優れています**：

1. ✅ **完全なエラーハンドリング**
2. ✅ **ローディング状態管理**
3. ✅ **ロール別リダイレクト**
4. ✅ **より良いUX**
5. ✅ **本番環境対応**

**変更不要です。現在の実装をそのまま使用してください。** 🎉✨

---

**関連ファイル:**
- ✅ `app/auth/signin/page.tsx` - ログインページ（完璧な実装）
- ✅ `app/api/auth/[...nextauth]/route.ts` - NextAuth設定
- ✅ `lib/auth.ts` - 認証ロジック
- ✅ `middleware.ts` - サーバーサイド認証

---

**作成日:** 2025-10-17  
**プロジェクト:** ShiftMatch - シフト管理システム  
**バージョン:** Next.js 15.5.4 + NextAuth 4.24.5  

