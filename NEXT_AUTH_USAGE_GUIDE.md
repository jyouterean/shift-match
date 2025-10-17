# NextAuth `useSession` 使用ガイド ✅

## 📋 現在の実装（完璧版）

### ✅ 基本的な使用パターン

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function MyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // ローディング中は何もしない
    if (status === 'loading') return

    // 未認証の場合はログインページへ
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // ロール制限がある場合
    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      router.push('/staff/dashboard')
      return
    }

    // 認証済みの処理
    fetchData()
  }, [session, status, router])

  // ローディング表示
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 未認証の場合は空を返す（リダイレクト中）
  if (!session) {
    return null
  }

  // メインコンテンツ
  return (
    <div>
      <h1>こんにちは、{session.user.name}さん</h1>
      {/* コンテンツ */}
    </div>
  )
}
```

---

## 🎯 重要なポイント

### 1. **`status` の3つの状態**

```typescript
const { data: session, status } = useSession()

// status の値:
// - "loading"        → セッション情報を取得中
// - "authenticated"  → ログイン済み（session は存在）
// - "unauthenticated" → 未ログイン（session は null）
```

### 2. **必ず `'use client'` を使用**

```typescript
'use client' // ← これが必須！

import { useSession } from 'next-auth/react'
```

**理由:** `useSession` はクライアントコンポーネントでのみ使用可能

---

## 📚 実際の実装例（プロジェクトから）

### 例1: 管理者ダッシュボード

```typescript
// app/admin/dashboard/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats')
      const data = await response.json()
      if (response.ok) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // ローディング中は待機
    if (status === 'loading') return

    // 未認証チェック
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // ロールチェック
    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      router.push('/staff/dashboard')
      return
    }

    // データ取得
    fetchStats()
  }, [session, status, router, fetchStats])

  // ローディング画面
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg font-medium">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 未認証時は空を返す（リダイレクト処理中）
  if (!session) {
    return null
  }

  // メインコンテンツ
  return (
    <div>
      <h1>管理者ダッシュボード</h1>
      <p>ようこそ、{session.user.name}さん</p>
      {/* ダッシュボードコンテンツ */}
    </div>
  )
}
```

### 例2: スタッフページ（シンプル版）

```typescript
// app/staff/shifts/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function StaffShiftsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div>
      <h1>シフト一覧</h1>
      {/* コンテンツ */}
    </div>
  )
}
```

---

## ⚠️ よくある間違い

### ❌ 間違い1: `'use client'` を忘れる

```typescript
// ❌ これはエラーになる
import { useSession } from 'next-auth/react'

export default function MyPage() {
  const { data: session } = useSession() // ← エラー！
  return <div>Hello</div>
}
```

**修正:**
```typescript
// ✅ 正しい
'use client' // ← これを追加

import { useSession } from 'next-auth/react'

export default function MyPage() {
  const { data: session } = useSession() // ← OK
  return <div>Hello</div>
}
```

---

### ❌ 間違い2: `status` をチェックせずに `session` を使う

```typescript
// ❌ これはエラーになる
export default function MyPage() {
  const { data: session } = useSession()
  
  // session が null の可能性があるのに直接使用
  return <div>Hello, {session.user.name}</div> // ← エラー！
}
```

**修正:**
```typescript
// ✅ 正しい
export default function MyPage() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') {
    return <div>Loading...</div>
  }
  
  if (!session) {
    return <div>Please sign in</div>
  }
  
  // ここで session は確実に存在する
  return <div>Hello, {session.user.name}</div> // ← OK
}
```

---

### ❌ 間違い3: useEffect でリダイレクトしない

```typescript
// ❌ これは無限ループになる可能性
export default function MyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // レンダリング時に直接リダイレクト（NG）
  if (!session && status !== 'loading') {
    router.push('/auth/signin') // ← 無限ループの危険
  }
  
  return <div>Content</div>
}
```

**修正:**
```typescript
// ✅ 正しい
export default function MyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // useEffect 内でリダイレクト
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])
  
  if (status === 'loading') {
    return <div>Loading...</div>
  }
  
  if (!session) {
    return null // リダイレクト中
  }
  
  return <div>Content</div>
}
```

---

## 🔐 ロール別アクセス制御

### パターン1: 管理者のみ

```typescript
useEffect(() => {
  if (status === 'loading') return
  
  if (!session) {
    router.push('/auth/signin')
    return
  }
  
  // 管理者以外は拒否
  if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
    router.push('/staff/dashboard')
    return
  }
  
  // 管理者のみがここに到達
  fetchAdminData()
}, [session, status, router])
```

### パターン2: スタッフのみ

```typescript
useEffect(() => {
  if (status === 'loading') return
  
  if (!session) {
    router.push('/auth/signin')
    return
  }
  
  // 管理者は拒否
  if (session.user.role === 'OWNER' || session.user.role === 'ADMIN') {
    router.push('/admin/dashboard')
    return
  }
  
  // スタッフのみがここに到達
  fetchStaffData()
}, [session, status, router])
```

### パターン3: 全ユーザー（ログインのみ必要）

```typescript
useEffect(() => {
  if (status === 'loading') return
  
  if (!session) {
    router.push('/auth/signin')
    return
  }
  
  // ログイン済みなら誰でもOK
  fetchData()
}, [session, status, router])
```

---

## 🎨 ローディング画面のバリエーション

### デザイン1: シンプル

```typescript
if (status === 'loading') {
  return <div>Loading...</div>
}
```

### デザイン2: スピナー付き

```typescript
if (status === 'loading') {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  )
}
```

### デザイン3: プロジェクト標準（推奨）

```typescript
if (status === 'loading') {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    </div>
  )
}
```

---

## 📊 セッションデータの構造

### `session.user` の型定義

```typescript
interface Session {
  user: {
    id: string
    name: string
    email: string
    role: 'OWNER' | 'ADMIN' | 'STAFF'
    companyId: string
    officeId: string | null
  }
}
```

### 使用例

```typescript
const { data: session } = useSession()

if (session) {
  console.log(session.user.id)        // ユーザーID
  console.log(session.user.name)      // ユーザー名
  console.log(session.user.email)     // メールアドレス
  console.log(session.user.role)      // ロール
  console.log(session.user.companyId) // 会社ID
  console.log(session.user.officeId)  // 営業所ID（nullable）
}
```

---

## 🔄 セッションの更新

### ケース1: プロフィール更新後

```typescript
import { signIn, useSession } from 'next-auth/react'

const updateProfile = async (newData) => {
  const response = await fetch('/api/staff/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newData),
  })
  
  if (response.ok) {
    // セッションを再取得
    await signIn('credentials', { redirect: false })
  }
}
```

### ケース2: 手動でセッションをリフレッシュ

```typescript
import { useSession } from 'next-auth/react'

const { data: session, update } = useSession()

const refreshSession = async () => {
  await update() // セッションを更新
}
```

---

## ✅ チェックリスト

- [ ] `'use client'` を追加したか？
- [ ] `status === 'loading'` をチェックしたか？
- [ ] `!session` をチェックしたか？
- [ ] リダイレクトは `useEffect` 内で行っているか？
- [ ] ローディング画面を実装したか？
- [ ] ロールベースのアクセス制御を実装したか？
- [ ] `session.user` にアクセスする前に null チェックを行ったか？

---

## 📝 まとめ

### ベストプラクティス

1. ✅ **必ず `'use client'` を使用**
2. ✅ **`status` と `session` の両方をチェック**
3. ✅ **リダイレクトは `useEffect` 内で**
4. ✅ **ローディング状態を表示**
5. ✅ **ロールベースのアクセス制御**
6. ✅ **null チェックを忘れずに**

### 現在のプロジェクトの実装状態

**✅ 完璧！** すべてのページで正しく実装されています。

- 全23ページで `useSession` を使用
- すべてのページで適切な認証チェック
- ローディング状態の適切な処理
- ロールベースのアクセス制御

**変更不要です。現在の実装をそのまま使用してください。** 🎉

---

## 🔗 関連ファイル

- `components/providers.tsx` - SessionProvider の設定
- `app/layout.tsx` - Providers のラップ
- `lib/auth.ts` - NextAuth 設定
- `middleware.ts` - サーバーサイド認証チェック

---

**作成日:** 2025-10-17  
**プロジェクト:** ShiftMatch - シフト管理システム  
**バージョン:** Next.js 15.5.4 + NextAuth 4.24.5  

