-- メール認証フィールドを追加するマイグレーション
-- 実行日: 2025-10-15
-- データベース: Neon PostgreSQL

-- User テーブルにメール認証関連フィールドを追加
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP;

-- 既存ユーザーは認証済みとしてマーク（オプション）
-- UPDATE "User" SET "emailVerified" = true WHERE "createdAt" < NOW();

-- インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS "User_emailVerified_idx" ON "User"("emailVerified");

-- 確認クエリ
-- SELECT "id", "email", "emailVerified", "verifiedAt" FROM "User" LIMIT 5;

