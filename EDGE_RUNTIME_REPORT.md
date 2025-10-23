# ⚡ Edge Runtime 対応レポート

## 📋 実施日
2025年10月23日

## 🎯 目的
Next.js 15のEdge Runtimeを活用してAPIルートとページの応答速度を向上させる

---

## ✅ 対応完了ファイル（2ファイル）

### 1. `/app/api/auth/test/route.ts`
- **ランタイム**: Edge Runtime ⚡
- **理由**: 環境変数チェックとfetch APIのみ使用
- **依存**: なし

### 2. `/app/api/auth/logout/route.ts`
- **ランタイム**: Edge Runtime ⚡
- **理由**: Cookie削除のみ（Web標準API）
- **依存**: `next/headers` の `cookies()` のみ

---

## ❌ 対応不可ファイル一覧

### 🔐 NextAuth依存（35+ファイル）

**理由**: `getServerSession(authOptions)` はNode.jsランタイムが必須

#### 対象ファイル:
```
app/api/staff/reports/route.ts
app/api/admin/shifts/route.ts
app/api/admin/shifts/export-excel/route.ts
app/api/admin/shift-deadline/route.ts
app/api/companies/route.ts
app/api/admin/offices/route.ts
app/api/admin/office-requirements/bulk/route.ts
app/api/admin/shifts/assignment/route.ts
app/api/admin/availability/route.ts
app/api/staff/account/route.ts
app/api/staff/profile/route.ts
app/api/admin/account/route.ts
app/api/admin/audit-logs/review/route.ts
app/api/staff/availability/route.ts
app/api/admin/shifts/auto-assign/route.ts
app/api/admin/shifts/calendar/route.ts
app/api/admin/office-requirements/route.ts
app/api/admin/shifts/[date]/route.ts
app/api/admin/members/route.ts
app/api/admin/dashboard/sales/route.ts
app/api/notifications/bulk/route.ts
app/api/admin/reports/bulk/route.ts
app/api/admin/shifts/bulk/route.ts
app/api/admin/audit-logs/route.ts
app/api/chat/messages/route.ts
app/api/admin/price-types/route.ts
app/api/admin/export/route.ts
app/api/staff/price-types/route.ts
app/api/staff/dashboard/stats/route.ts
app/api/admin/dashboard/stats/route.ts
app/api/notifications/route.ts
app/api/admin/reports/route.ts
app/api/admin/company/route.ts
app/api/staff/shifts/route.ts
app/api/auth/[...nextauth]/route.ts
```

**技術的詳細**:
```typescript
// ❌ Edge Runtimeで使用不可
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const session = await getServerSession(authOptions)
// → NextAuthのセッション管理はNode.jsの暗号化モジュールに依存
```

---

### 🔑 bcryptjs依存（6ファイル）

**理由**: `bcryptjs` はNode.jsのネイティブモジュールに依存

#### 対象ファイル:
```
app/api/companies/join/route.ts
app/api/companies/route.ts
app/api/admin/secret/verify/route.ts
app/api/auth/send-verification/route.ts
app/api/auth/verify/route.ts
```

**技術的詳細**:
```typescript
// ❌ Edge Runtimeで使用不可
import bcrypt from 'bcryptjs'

const hashedPassword = await bcrypt.hash(password, 10)
const isValid = await bcrypt.compare(password, hash)
// → bcryptjsはNode.jsのcryptoモジュールに依存
```

**代替案**:
- Web Crypto APIの`SubtleCrypto`を使用
- しかし、bcryptのアルゴリズムとは互換性がないため移行不可

---

### 🗄️ Prisma依存（40+ファイル）

**理由**: Prisma Clientは通常、Node.jsランタイムが必須

#### 対象ファイル:
```
app/api/staff/reports/route.ts
app/api/admin/shifts/route.ts
app/api/companies/validate/route.ts
app/api/admin/offices/route.ts
app/api/admin/members/route.ts
... その他35以上のAPIルート
```

**技術的詳細**:
```typescript
// ❌ Edge Runtimeで使用不可（通常のPrisma Client）
import { prisma } from '@/lib/prisma'

const users = await prisma.user.findMany()
// → 通常のPrisma ClientはNode.jsのfsモジュールなどに依存
```

**Prisma Accelerateを使用すればEdge Runtime対応可能**:
```typescript
// ✅ Prisma Accelerate使用時のみEdge Runtime対応
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate())
```

**制約**:
- Prisma Accelerateは有料プラン（月額$29〜）
- 現状のアプリケーションは通常のPrisma Clientを使用
- 大規模な移行作業が必要

---

### 📄 ページファイル（30ファイル）

**理由**: 全てのページが `'use client'` ディレクティブを使用

#### 対象ファイル:
```
app/page.tsx
app/staff/reports/page.tsx
app/staff/shifts/page.tsx
app/auth/signin/page.tsx
app/admin/shifts/page.tsx
app/staff/dashboard/page.tsx
app/admin/dashboard/page.tsx
... その他24ページ
```

**技術的詳細**:
```typescript
// ❌ Edge Runtime対象外
'use client'

export default function Page() {
  // クライアントコンポーネントはSSRを行わないため
  // Edge Runtimeの恩恵を受けられない
}
```

---

## 📊 対応状況サマリー

| カテゴリ | ファイル数 | Edge Runtime対応 | 対応率 |
|---------|----------|----------------|-------|
| APIルート | 43 | ✅ 2 | 4.7% |
| ページ | 30 | ❌ 0 | 0% |
| **合計** | **73** | **2** | **2.7%** |

---

## 🚫 Edge Runtime移行の主な障壁

### 1. NextAuthアーキテクチャ
```
認証フロー:
ユーザーリクエスト
  ↓
getServerSession(authOptions) ← Node.jsランタイム必須
  ↓
JWTトークン検証（crypto.subtle等）
  ↓
Prismaでユーザー情報取得
  ↓
レスポンス返却
```

**問題点**:
- NextAuthのコアロジックがNode.js依存
- `lib/auth.ts`の`authOptions`がNode.js専用

### 2. パスワードハッシュ
```
登録/認証フロー:
パスワード入力
  ↓
bcrypt.hash() / bcrypt.compare() ← Node.jsランタイム必須
  ↓
データベース保存/検証
```

**問題点**:
- bcryptjsは既存のパスワードハッシュと互換性あり
- Web Crypto APIに移行すると既存ユーザーがログイン不可

### 3. データベースアクセス
```
データフローアクセス:
APIリクエスト
  ↓
Prisma Client ← Node.jsランタイム必須（通常版）
  ↓
PostgreSQL（Neon）
  ↓
レスポンス返却
```

**問題点**:
- 通常のPrisma ClientはNode.jsのfsモジュール等に依存
- Prisma Accelerateへの移行は大規模な変更とコスト増

---

## 💡 Edge Runtime活用の代替案

### 案1: 認証不要エンドポイントのみ対応
**対象**:
- ✅ `/api/auth/test` (環境変数チェック)
- ✅ `/api/auth/logout` (Cookie削除)
- ✅ `/api/ping` (ヘルスチェック) ※既にNode.jsランタイム指定

**効果**: 限定的（全体の5%未満）

### 案2: Prisma Accelerate導入
**コスト**:
- Starter: $29/月
- Pro: $249/月

**移行工数**:
- Prisma Clientの全面書き換え
- 接続文字列の変更
- テスト・検証

**効果**: 大幅な速度向上（全APIルートで対応可能）

### 案3: 認証方式の変更
**変更内容**:
- NextAuth → カスタムJWT認証（Edge Runtime対応）
- bcryptjs → Web Crypto API

**移行工数**:
- 大規模（全認証フローの書き換え）
- 既存ユーザーのパスワード再設定が必要

**効果**: 大幅な速度向上

---

## 🎯 推奨アクション

### 短期（現実的）
✅ **完了**: 認証不要な軽量APIにEdge Runtimeを適用
- `/api/auth/test`
- `/api/auth/logout`

### 中期（検討が必要）
⚠️ **要検討**: Prisma Accelerateの導入
- コストとパフォーマンスのトレードオフを評価
- 無料トライアルで効果測定

### 長期（大規模改修）
🔄 **大規模**: アーキテクチャ全体の見直し
- NextAuth → カスタムEdge対応認証
- bcryptjs → Web Crypto API
- 通常Prisma → Prisma Accelerate

---

## 📈 パフォーマンス改善の優先順位

### 現状で実施可能な最適化（Edge Runtime以外）

#### 1. データベースクエリ最適化 ⭐⭐⭐
```typescript
// ✅ すでに実施済み
// - Promise.allで並列実行
// - Prisma.groupByでデータ集約
// - @@indexで高速化
```

#### 2. キャッシング戦略 ⭐⭐⭐
```typescript
// 実装可能
export const revalidate = 60 // 60秒キャッシュ

// または
import { unstable_cache } from 'next/cache'
```

#### 3. レスポンスサイズ削減 ⭐⭐
```typescript
// Prisma selectで必要なフィールドのみ取得
await prisma.user.findMany({
  select: { id: true, name: true, email: true }
})
```

#### 4. CDN活用（静的アセット） ⭐
```
// Vercelが自動対応
// 画像・CSS・JSは既にCDN経由
```

---

## 🏁 結論

### Edge Runtimeの現状
- **対応可能**: 2ファイル（2.7%）
- **対応不可**: 71ファイル（97.3%）

### 主な制約
1. NextAuth（Node.jsランタイム必須）
2. bcryptjs（Node.jsネイティブモジュール依存）
3. Prisma Client（通常版はNode.js依存）

### 推奨
現状のアーキテクチャでは**大規模なEdge Runtime移行は不可能**。  
認証不要な軽量APIのみをEdge Runtime化し、他の最適化手法（キャッシング、クエリ最適化）でパフォーマンス改善を図ることを推奨。

---

## 📝 備考

- ビルド成功: ✅ `npm run build` 正常終了
- Edge Runtime APIルート: 2ファイル
- Node.js Runtime APIルート: 41ファイル
- クライアントコンポーネント: 30ファイル

**次のステップ**:
1. ✅ 軽量APIのEdge Runtime化（完了）
2. ⏭️ Prisma Accelerate導入の費用対効果分析
3. ⏭️ キャッシング戦略の実装
4. ⏭️ レスポンスサイズ最適化

---

*Report generated: 2025-10-23*

