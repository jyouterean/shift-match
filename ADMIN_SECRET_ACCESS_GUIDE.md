# 管理者専用アカウント アクセスガイド

**最終更新:** 2025年10月17日

---

## 🔐 管理者専用エリアへのアクセス方法

### ステップ1: URLにアクセス

**現在の状況:**
- ❌ `shiftmatch.net` - DNSがまだ伝播していません
- ✅ Vercel URL - 利用可能（認証必要）

**利用可能なURL:**
```
https://shiftmatch-ly729h6up-reans-projects-a6ca2978.vercel.app/admin/secret
```

### ステップ2: Vercel認証（Vercel URLの場合）

Vercel URLにアクセスすると、最初にVercelの認証画面が表示されます。

**認証方法:**
1. Vercelアカウントでログイン
2. または、Vercelプロジェクト管理者に認証を依頼

### ステップ3: パスワード入力

Vercel認証後、管理者専用エリアのパスワード入力画面が表示されます。

**パスワード:**
```
Remon5252
```

**注意点:**
- 大文字・小文字を区別します
- `R`は大文字、残りは小文字です

### ステップ4: 会社情報登録

パスワード認証後、会社登録フォームが表示されます。

**入力項目:**
- 会社名（必須）
- 管理者名（必須）
- 管理者メールアドレス（必須）
- 管理者パスワード（必須、8文字以上）
- 管理者電話番号（任意）

### ステップ5: 会社コード取得

登録完了後、会社コードが表示されます。

**重要:**
- 会社コードは従業員招待に使用します
- 必ずメモしてください
- 後から確認できます（管理者ダッシュボード → 会社情報）

### ステップ6: ログイン

以下のURLからログインします：

**Vercel URL:**
```
https://shiftmatch-ly729h6up-reans-projects-a6ca2978.vercel.app/auth/signin
```

**カスタムドメイン（DNS伝播後）:**
```
https://shiftmatch.net/auth/signin
```

---

## 🌐 DNS伝播について

### 現在の状況

ドメイン `shiftmatch.net` は登録済みですが、DNSがまだ完全に伝播していません。

**確認方法:**
```bash
nslookup shiftmatch.net
```

**伝播状況:**
- ✅ Vercel側設定完了
- ⏳ DNS伝播中（24-48時間かかる場合があります）

### DNS伝播後のURL

**伝播完了後は以下のURLが使用できます:**
- `https://shiftmatch.net/admin/secret`
- `https://www.shiftmatch.net/admin/secret`
- `https://shiftmatch.net/auth/signin`

---

## 🐛 トラブルシューティング

### 問題1: 「パスワードが正しくありません」

**解決策:**
1. パスワードを再確認
   - 正しいパスワード: `Remon5252`
   - 大文字・小文字を区別
   - `R`は大文字、残りは小文字

2. ブラウザのキャッシュをクリア
   ```
   Chrome: Cmd + Shift + Delete
   Safari: Cmd + Option + E
   Firefox: Cmd + Shift + Delete
   ```

3. シークレットモード/プライベートブラウジングで試す

### 問題2: 「設定エラーが発生しました」

**原因:**
環境変数が設定されていません。

**解決策:**
管理者が以下を確認：
```bash
# 環境変数確認
npx vercel env ls

# ADMIN_SECRET_PASSWORD_HASHが存在するか確認
```

### 問題3: 「試行回数が多すぎます」

**原因:**
レート制限（5回/15分）に達しました。

**解決策:**
- 15分待ってから再試行
- 正しいパスワードを使用

### 問題4: Vercel認証画面が表示される

**原因:**
Vercel URLはプロジェクト保護されています。

**解決策:**
1. Vercelアカウントでログイン
2. プロジェクト管理者に認証を依頼
3. DNS伝播後はカスタムドメインを使用（認証不要）

### 問題5: ページが開けない

**確認事項:**
1. ブラウザのJavaScript有効化
2. HTTPSでアクセス
3. ネットワーク接続確認
4. ブラウザコンソールでエラー確認

---

## 📋 チェックリスト

### アクセス前の確認

- [ ] URLを確認
  - Vercel URL: `https://shiftmatch-ly729h6up-reans-projects-a6ca2978.vercel.app/admin/secret`
  - カスタムドメイン（DNS伝播後）: `https://shiftmatch.net/admin/secret`

- [ ] パスワードを確認
  - パスワード: `Remon5252`
  - 大文字・小文字・記号を正確に

- [ ] ブラウザ環境
  - JavaScript有効
  - Cookie有効
  - 最新ブラウザ推奨

### 登録時の準備

- [ ] 会社情報を準備
  - 会社名
  - 管理者名
  - メールアドレス
  - 管理パスワード（8文字以上）
  - 電話番号（任意）

- [ ] メール確認
  - 受信可能なメールアドレス
  - 迷惑メールフォルダ確認

### 登録後の確認

- [ ] 会社コードをメモ
- [ ] メール認証リンクをクリック
- [ ] ログインテスト
- [ ] 管理者ダッシュボードにアクセス

---

## 🔒 セキュリティ

### パスワードの管理

**現在のパスワード:**
```
Remon5252
```

**パスワード変更方法:**
```bash
# ハッシュ生成
npm run generate-secret-hash

# 環境変数更新
# 1. .env.local に追加
# 2. Vercel環境変数に追加
# 3. 再デプロイ
```

### アクセス制御

- ✅ レート制限: 5回/15分
- ✅ bcryptハッシュ化
- ✅ HTTPS強制
- ✅ CSP保護

---

## 💡 ヒント

### スムーズなアクセス

1. **ブックマーク登録**
   - Vercel URLをブックマーク
   - DNS伝播後にカスタムドメインに更新

2. **パスワード管理**
   - パスワードマネージャー使用推奨
   - 安全な場所に保管

3. **初回登録**
   - メールアドレス確認
   - 会社コードを安全に保管
   - 初期設定を完了

### よくある質問

**Q: カスタムドメインはいつ使えますか？**
A: DNS伝播後（24-48時間以内）

**Q: パスワードを変更したい**
A: `npm run generate-secret-hash` でハッシュを生成し、環境変数を更新

**Q: 会社コードを忘れた**
A: 管理者ダッシュボード → 会社情報で確認可能

**Q: Vercel認証が面倒**
A: DNS伝播後はカスタムドメインで認証不要

---

## 📞 サポート

### 問題が解決しない場合

1. ブラウザコンソールのエラーを確認
2. ネットワークタブでAPIエラーを確認
3. Vercelデプロイログを確認
4. 環境変数が正しく設定されているか確認

### 確認コマンド

```bash
# ローカルテスト
npm run dev
# http://localhost:3000/admin/secret にアクセス

# 環境変数確認
npx vercel env ls

# デプロイログ確認
npx vercel logs

# DNS確認
nslookup shiftmatch.net
```

---

## 🎯 まとめ

**現在の推奨アクセス方法:**

1. **Vercel URL**を使用
   ```
   https://shiftmatch-ly729h6up-reans-projects-a6ca2978.vercel.app/admin/secret
   ```

2. **Vercel認証**を完了

3. **パスワード**を入力
   ```
   Remon5252
   ```

4. **会社情報**を登録

5. **会社コード**をメモ

6. **ログイン**
   ```
   https://shiftmatch-ly729h6up-reans-projects-a6ca2978.vercel.app/auth/signin
   ```

**DNS伝播後は以下が使用可能:**
```
https://shiftmatch.net/admin/secret
https://shiftmatch.net/auth/signin
```

---

**作成日:** 2025年10月17日  
**ステータス:** ✅ 本番環境デプロイ済み  
**パスワード:** `Remon5252`

