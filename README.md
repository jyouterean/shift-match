# ShiftMatch - シフト管理システム

配送業界向けのシフト管理・日報システム

## 主な機能

- シフト管理
- 日報提出・承認
- メンバー管理
- チャット機能
- 通知機能
- ルート管理
- 単価設定
- ダッシュボード

## 技術スタック

- Next.js 15.5.4
- TypeScript 5
- Prisma 6.16.3
- PostgreSQL (Neon)
- NextAuth.js 4
- Tailwind CSS 3
- Radix UI

## 開発環境のセットアップ

```bash
# 依存パッケージのインストール
npm install

# データベースのセットアップ
npm run db:push

# 開発サーバーの起動
npm run dev
```

## デプロイ

Vercelにデプロイされています: https://shiftmatch-eight.vercel.app

## 検証: Vercel 実行リージョン (Tokyo hnd1)

- 検証コマンド
  - 本番またはプレビューのドメインで実行
  - `curl -I https://<YOUR_DOMAIN>/api/ping`
  - レスポンスヘッダ `x-vercel-id` に `hnd1::` を含むことを確認

- 注意事項
  - Middleware は Edge で実行され、地域指定はできません
  - 重い処理は API/SSR 側（Node.js Runtime）に配置してください

## ライセンス

© 2025 ShiftMatch. All rights reserved.



