# セキュリティチェックリスト

このドキュメントは、ShiftMatchプロジェクトのセキュリティ実装状況を簡潔にまとめたものです。

---

## ✅ 実装済みのセキュリティ対策

### 1. 認証とセッション管理
- [x] NextAuth.js による認証
- [x] JWT トークンベースのセッション
- [x] セッション有効期限: 15日間
- [x] 自動更新: 24時間ごと
- [x] Cookie設定:
  - HttpOnly: `true` (XSS対策)
  - Secure: `true` (本番環境、HTTPS強制)
  - SameSite: `lax` (CSRF対策)
  - MaxAge: 15日間

### 2. パスワードセキュリティ
- [x] bcrypt によるパスワードハッシュ化 (ソルトラウンド: 10)
- [x] 環境変数によるシークレット管理
- [x] ハードコードされたパスワードの削除
- [x] パスワードハッシュ生成スクリプト: `scripts/generate-secret-hash.ts`

### 3. セキュリティヘッダー
- [x] Content-Security-Policy (XSS対策)
- [x] X-Frame-Options: DENY (クリックジャッキング対策)
- [x] X-Content-Type-Options: nosniff (MIMEスニッフィング対策)
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Permissions-Policy (不要な機能の無効化)
- [x] Strict-Transport-Security (本番環境、HTTPS強制)

### 4. データベースセキュリティ
- [x] Prisma による型安全なクエリ (SQLインジェクション対策)
- [x] 環境変数による接続文字列管理
- [x] SSL/TLS強制 (`sslmode=require`)
- [x] ロールベースアクセス制御 (RBAC)

### 5. API セキュリティ
- [x] すべてのエンドポイントで認証チェック
- [x] 権限チェック (OWNER/ADMIN/STAFF)
- [x] エラーメッセージの一般化 (情報漏洩防止)

### 6. XSS (Cross-Site Scripting) 対策
- [x] React の自動エスケープ
- [x] `dangerouslySetInnerHTML` 不使用
- [x] `eval()` / `Function()` 不使用
- [x] CSP ヘッダーによる追加保護

### 7. CSRF (Cross-Site Request Forgery) 対策
- [x] Cookie の `SameSite=lax` 設定
- [x] NextAuth.js の CSRF トークン自動管理
- [x] Origin ヘッダーチェック

### 8. 依存関係のセキュリティ
- [x] npm audit で脆弱性チェック (脆弱性なし)
- [x] Semgrep でのセキュリティスキャン
- [x] 定期的な依存関係の更新

### 9. 環境変数と秘密情報
- [x] `.env` ファイルを `.gitignore` に追加
- [x] Vercel Environment Variables の使用
- [x] 秘密情報のハードコード禁止
- [x] `env.example` による設定ガイド

### 10. 監査とログ
- [x] 監査ログ機能の実装
- [x] ユーザー操作の記録
- [x] エラーログの記録

---

## ⚠️ 今後実装を推奨する対策

### 優先度: 高
- [ ] **レート制限の実装**
  - ログインエンドポイント
  - API エンドポイント
  - Vercel Edge Config の活用

### 優先度: 中
- [ ] **多要素認証 (2FA)**
  - 管理者アカウント向け
  - TOTP (Time-based One-Time Password)

- [ ] **CSP の強化**
  - nonce ベースの CSP
  - `'unsafe-eval'` と `'unsafe-inline'` の削除

### 優先度: 低
- [ ] **Subresource Integrity (SRI)**
  - CDN リソースの整合性チェック

- [ ] **セキュリティ監視ツール**
  - Snyk, Dependabot, GitHub Advanced Security

---

## 📝 定期的なセキュリティチェック

### 月次チェック
- [ ] npm audit の実行
- [ ] 依存関係の更新
- [ ] 監査ログのレビュー

### 四半期チェック
- [ ] Semgrep によるセキュリティスキャン
- [ ] セキュリティヘッダーの確認
- [ ] CSP ポリシーのレビュー

### 年次チェック
- [ ] 全体的なセキュリティ監査
- [ ] 脅威モデルの見直し
- [ ] セキュリティポリシーの更新

---

## 🔐 環境変数の設定

### 必須の環境変数

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production-min-32-chars"

# Admin Secret (管理者登録用パスワード)
ADMIN_SECRET_PASSWORD_HASH="$2a$10$..."
```

### ハッシュの生成方法

```bash
npx tsx scripts/generate-secret-hash.ts
```

---

## 🚨 セキュリティインシデント発生時の対応

1. **即座に対応**
   - アプリケーションの一時停止を検討
   - 影響範囲の特定

2. **調査**
   - 監査ログの確認
   - データベースの整合性チェック

3. **修正**
   - 脆弱性の修正
   - セキュリティパッチの適用

4. **再発防止**
   - セキュリティポリシーの見直し
   - チーム内での情報共有

---

## 📚 参考リソース

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js セキュリティ](https://nextjs.org/docs/advanced-features/security-headers)
- [NextAuth.js セキュリティ](https://next-auth.js.org/configuration/options#security)
- [Prisma セキュリティ](https://www.prisma.io/docs/concepts/components/prisma-client/security)

---

**最終更新日:** 2025年10月15日  
**次回レビュー予定:** 2025年11月15日

