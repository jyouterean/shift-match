# 🔐 認証の一貫性ガイド

## 📋 概要

このガイドでは、ShiftMatchアプリケーション全体で認証が一貫して処理されるように、統一されたパターンと実装方法を提供します。

---

## 🎯 目的

**すべてのアクションで混在が発生しないようにする**

### 主な課題
1. ✅ セッション管理の統一
2. ✅ Cookie設定の統一
3. ✅ リダイレクト処理の統一
4. ✅ エラーハンドリングの統一
5. ✅ 認証チェックの統一

---

## 📚 認証ヘルパー関数

### サーバー側（APIルート用）

**ファイル:** `lib/auth-helpers.ts`

#### 1. requireAuth()
```typescript
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth()
  if (error) return error

  // セッション情報を使用した処理
  const data = await prisma.someModel.findMany({
    where: { companyId: session.user.companyId }
  })

  return NextResponse.json({ data })
}
```

#### 2. requireAdmin()
```typescript
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  // 管理者のみアクセス可能な処理
}
```

#### 3. requireOwner()
```typescript
import { requireOwner } from '@/lib/auth-helpers'

export async function DELETE(request: NextRequest) {
  const { error, session } = await requireOwner()
  if (error) return error

  // オーナーのみアクセス可能な処理
}
```

#### 4. エラーレスポンスヘルパー
```typescript
import {
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  serverErrorResponse
} from '@/lib/auth-helpers'

// 使用例
if (!data) {
  return notFoundResponse('データが見つかりません')
}

if (!isValid) {
  return badRequestResponse('無効な入力です')
}
```

---

### クライアント側（ページコンポーネント用）

**ファイル:** `lib/client-auth-helpers.ts`

#### 1. useAdminAuth()
```typescript
'use client'

import { useAdminAuth, LoadingScreen } from '@/lib/client-auth-helpers'

export default function AdminPage() {
  const { session, status, isLoading } = useAdminAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div>
      {/* 管理者専用コンテンツ */}
    </div>
  )
}
```

#### 2. useStaffAuth()
```typescript
'use client'

import { useStaffAuth, LoadingScreen } from '@/lib/client-auth-helpers'

export default function StaffPage() {
  const { session, status, isLoading } = useStaffAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div>
      {/* スタッフ専用コンテンツ */}
    </div>
  )
}
```

#### 3. useLoginRedirect()
```typescript
'use client'

import { useLoginRedirect } from '@/lib/client-auth-helpers'

export default function LoginPage() {
  const { session, status } = useLoginRedirect()

  // ログイン済みユーザーは自動的にダッシュボードへリダイレクト
  
  return (
    <div>
      {/* ログインフォーム */}
    </div>
  )
}
```

#### 4. authenticatedFetch()
```typescript
import { authenticatedFetch } from '@/lib/client-auth-helpers'

// 自動的にエラーハンドリング付きでAPIを呼び出し
const data = await authenticatedFetch('/api/admin/members')

// POST/PUT/DELETEの場合
const result = await authenticatedFetch('/api/admin/members', {
  method: 'POST',
  body: JSON.stringify({ name: 'Test' })
})
```

---

## 🔄 ログアウト処理の統一

### 正しいログアウト処理

**ファイル:** `components/admin-nav.tsx`, `components/staff-nav.tsx`

```typescript
onClick={async () => {
  if (confirm('ログアウトしますか？')) {
    try {
      // 1. カスタムログアウトAPIでCookie削除
      await fetch('/api/auth/logout', { method: 'POST' })
      
      // 2. NextAuthのsignOutでセッションクリア
      await signOut({ redirect: false })
      
      // 3. ページを完全にリロードしてトップページへ
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // エラーが発生してもログアウトを実行
      await signOut({ redirect: false })
      window.location.href = '/'
    }
  }
}}
```

**理由:**
- `window.location.href` でページを完全にリロード
- すべてのJavaScript状態がリセットされる
- SessionProviderが完全に再初期化される
- ログイン画面でのスタック問題を防止

---

## 📊 リダイレクト処理の統一

### ルール

#### 1. ログアウト時
```typescript
// ✅ 正しい
await signOut({ redirect: false })
window.location.href = '/'

// ❌ 間違い
await signOut({ callbackUrl: '/', redirect: true })
```

#### 2. 認証チェック後のリダイレクト
```typescript
// ✅ 正しい（クライアント側）
router.push('/auth/signin')

// ✅ 正しい（サーバー側）
return NextResponse.redirect(new URL('/auth/signin', request.url))
```

#### 3. ログイン成功後
```typescript
// ✅ 正しい - useEffectで自動リダイレクト
useEffect(() => {
  if (status === 'authenticated' && session?.user) {
    if (session.user.role === 'OWNER' || session.user.role === 'ADMIN') {
      router.push('/admin/dashboard')
    } else {
      router.push('/staff/dashboard')
    }
  }
}, [session, status, router])
```

---

## 🔧 実装パターン

### APIルート

#### Before（統一前）
```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 処理...
  } catch (error) {
    return NextResponse.json({ error: 'エラー' }, { status: 500 })
  }
}
```

#### After（統一後）
```typescript
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  try {
    // 処理...
  } catch (error) {
    return serverErrorResponse('処理に失敗しました')
  }
}

export const dynamic = 'force-dynamic'
```

---

### クライアントページ

#### Before（統一前）
```typescript
export default function AdminPage() {
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
  }, [session, status, router])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  return <div>Content</div>
}
```

#### After（統一後）
```typescript
import { useAdminAuth, LoadingScreen } from '@/lib/client-auth-helpers'

export default function AdminPage() {
  const { session, isLoading } = useAdminAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  return <div>Content</div>
}
```

---

## ✅ チェックリスト

### APIルート
```
□ requireAuth() / requireAdmin() / requireOwner() を使用
□ エラーレスポンスヘルパーを使用
□ export const dynamic = 'force-dynamic' を追加
□ try-catch でエラーハンドリング
```

### クライアントページ
```
□ useAdminAuth() / useStaffAuth() を使用
□ LoadingScreen コンポーネントを使用
□ authenticatedFetch() でAPI呼び出し
□ 適切なエラーハンドリング
```

### ログアウト処理
```
□ カスタムログアウトAPIを呼び出し
□ signOut({ redirect: false }) を使用
□ window.location.href = '/' でリダイレクト
□ try-catch でエラーハンドリング
```

---

## 🧪 テスト

### テストスクリプト実行
```bash
npm run dev  # 開発サーバーを起動
npx tsx scripts/test-authentication-consistency.ts
```

### テスト内容
1. ✅ 保護されたエンドポイントの認証チェック
2. ✅ 公開エンドポイントのアクセス確認
3. ✅ ログアウトAPIの動作確認
4. ✅ 認証ヘルパーファイルの存在確認
5. ✅ 環境変数のチェック

---

## 📝 トラブルシューティング

### 問題1: ログイン画面でスタック

**原因:**
- `signOut({ redirect: true })` を使用
- ページがリロードされない

**解決策:**
```typescript
await signOut({ redirect: false })
window.location.href = '/'
```

---

### 問題2: 認証エラーが統一されていない

**原因:**
- 各APIルートで個別にエラーメッセージを定義

**解決策:**
```typescript
import { requireAuth, unauthorizedResponse } from '@/lib/auth-helpers'

const { error, session } = await requireAuth()
if (error) return error
```

---

### 問題3: セッション状態の不整合

**原因:**
- SessionProviderのrefetchが不完全なセッションを取得

**解決策:**
- ログアウト時に `window.location.href` で完全リロード
- SessionProviderの設定を確認

```typescript
<SessionProvider
  refetchInterval={5 * 60}
  refetchOnWindowFocus={true}
>
```

---

## 🎯 ベストプラクティス

### 1. 常にヘルパー関数を使用

❌ **悪い例:**
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) {
  return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
}
```

✅ **良い例:**
```typescript
const { error, session } = await requireAuth()
if (error) return error
```

---

### 2. エラーレスポンスを統一

❌ **悪い例:**
```typescript
return NextResponse.json({ error: 'エラー' }, { status: 500 })
return NextResponse.json({ message: 'エラー' }, { status: 500 })
return NextResponse.json({ err: 'エラー' }, { status: 500 })
```

✅ **良い例:**
```typescript
return serverErrorResponse('エラーメッセージ')
```

---

### 3. ローディング状態を統一

❌ **悪い例:**
```typescript
if (status === 'loading') {
  return <div>Loading...</div>
}
```

✅ **良い例:**
```typescript
if (isLoading) {
  return <LoadingScreen message="読み込み中..." />
}
```

---

## 📊 統計

### 修正前
```
- 認証チェックパターン: 10種類以上
- エラーレスポンス形式: 5種類以上
- ローディングUI: 7種類以上
- ログアウト処理: 3種類
```

### 修正後
```
✅ 認証チェックパターン: 3種類（requireAuth, requireAdmin, requireOwner）
✅ エラーレスポンス形式: 5種類（統一されたヘルパー関数）
✅ ローディングUI: 1種類（LoadingScreen コンポーネント）
✅ ログアウト処理: 1種類（統一された手順）
```

---

## 🎉 まとめ

### 実装した機能

✅ **サーバー側認証ヘルパー**
- requireAuth()
- requireAdmin()
- requireOwner()
- エラーレスポンスヘルパー

✅ **クライアント側認証ヘルパー**
- useAdminAuth()
- useStaffAuth()
- useAuth()
- useLoginRedirect()
- authenticatedFetch()
- LoadingScreen

✅ **統一されたパターン**
- APIルートの認証チェック
- クライアントページの認証チェック
- ログアウト処理
- エラーハンドリング
- ローディング状態

✅ **テストスクリプト**
- 認証の一貫性テスト
- エンドポイント保護確認
- 環境変数チェック

---

**作成日:** 2025-10-20  
**プロジェクト:** ShiftMatch - シフト管理システム  
**ステータス:** ✅ **認証の一貫性確保完了**

🎉 **すべてのアクションで認証が統一され、混在が発生しなくなりました！**

