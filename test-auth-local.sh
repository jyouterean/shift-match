#!/bin/bash

echo "🚀 開発サーバーを起動します..."
echo ""

# 開発サーバーを起動（バックグラウンド）
npm run dev > dev-server.log 2>&1 &
DEV_PID=$!

echo "⏳ サーバー起動を待機中... (PID: $DEV_PID)"
sleep 10

echo ""
echo "✅ 開発サーバーが起動しました"
echo ""
echo "📝 ブラウザで以下のURLにアクセスしてください:"
echo "   http://localhost:3000"
echo ""
echo "🔑 ログイン情報:"
echo "   Email: konnitihadesukon@yahoo.co.jp"
echo "   Password: TestPassword123!"
echo ""
echo "📊 ログを監視中..."
echo "   (Ctrl+C で終了)"
echo ""

# ログをリアルタイム表示
tail -f dev-server.log | grep -E "\[auth\]|\[prisma\]|error|Error|ログイン|認証"

