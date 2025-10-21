# 🔧 NEXTAUTH_URL 修正手順

## 問題

**NEXTAUTH_URLに改行が含まれています:**
```
"https://shiftmatch-eight.vercel.app\nn\n"
                                    ^^^^
                                    改行文字
```

これが原因でNextAuthが正しく動作せず、ログイン時にフリーズします。

---

## 修正手順

### 方法1: Vercel Dashboardから修正（推奨）

#### ステップ1: Vercel Dashboardにアクセス
```
https://vercel.com/reans-projects-a6ca2978/shiftmatch/settings/environment-variables
```

#### ステップ2: NEXTAUTH_URLを探す
- Environment Variables タブを開く
- `NEXTAUTH_URL` を見つける

#### ステップ3: 編集
1. `NEXTAUTH_URL` の右にある「Edit」ボタンをクリック
2. 値を以下に変更（改行なし）:
   ```
   https://shiftmatch-eight.vercel.app
   ```
3. 「Save」をクリック

#### ステップ4: 再デプロイ
```bash
cd /Users/rean/Desktop
npx vercel --prod --force
```

---

### 方法2: コマンドラインから修正

#### ステップ1: 削除
```bash
cd /Users/rean/Desktop
npx vercel env rm NEXTAUTH_URL production
# 「y」を入力して確認
```

#### ステップ2: 追加（改行なし）
```bash
printf "https://shiftmatch-eight.vercel.app" | npx vercel env add NEXTAUTH_URL production
```

#### ステップ3: 再デプロイ
```bash
npx vercel --prod --force
```

---

## 確認方法

### 1. 疎通テスト
```bash
curl https://shiftmatch-eight.vercel.app/api/auth/test
```

**期待される結果:**
```json
{
  "success": true,
  "tests": [
    {
      "name": "NEXTAUTH_URL",
      "status": "OK",
      "value": "https://shiftmatch-eight.vercel.app"
    }
  ]
}
```

**改行がないことを確認してください！**

### 2. CSRFエンドポイント確認
```bash
curl https://shiftmatch-eight.vercel.app/api/auth/csrf
```

**期待される結果:**
```json
{
  "csrfToken": "..."
}
```

### 3. ログイン試行
```
1. https://shiftmatch-eight.vercel.app/auth/signin にアクセス
2. admin@test.com / test1234 でログイン
3. 正常にダッシュボードにリダイレクトされる
```

---

## 原因

`npx vercel env add` コマンドで環境変数を設定した際、エコーやヒアドキュメントに改行が含まれていました。

### NG（改行あり）
```bash
echo "https://shiftmatch-eight.vercel.app" | npx vercel env add NEXTAUTH_URL production
     ↑ echoは改行を追加する
```

### OK（改行なし）
```bash
printf "https://shiftmatch-eight.vercel.app" | npx vercel env add NEXTAUTH_URL production
       ↑ printfは改行を追加しない
```

または、Vercel Dashboardから直接設定する。

---

## 現在の状態

```
✅ NEXTAUTH_SECRET: 正常（長さ: 45）
❌ NEXTAUTH_URL: 改行あり（要修正）
✅ DATABASE_URL: 正常
❌ CSRF Endpoint: NEXTAUTH_URLが原因でエラー
❌ Session Endpoint: NEXTAUTH_URLが原因でエラー
```

---

## 修正後の期待される状態

```
✅ NEXTAUTH_SECRET: 正常
✅ NEXTAUTH_URL: 正常（改行なし）
✅ DATABASE_URL: 正常
✅ CSRF Endpoint: 200 OK
✅ Session Endpoint: 200 OK
```

---

## 📌 重要

**NEXTAUTH_URLを修正したら必ず再デプロイしてください:**
```bash
npx vercel --prod --force
```

デプロイ後、ブラウザのキャッシュをクリアしてからログインを試してください。

---

**作成日:** 2025-10-21  
**問題:** NEXTAUTH_URLに改行が含まれている  
**影響:** ログインがフリーズする  
**解決策:** 改行を削除して再デプロイ

