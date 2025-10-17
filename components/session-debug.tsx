'use client'

import { useSession } from 'next-auth/react'

/**
 * SessionDebug - デバッグ用コンポーネント
 * 
 * セッション情報をJSON形式で表示
 * ログイン画面フリーズ問題の調査用
 * 
 * 使用方法:
 * import SessionDebug from '@/components/session-debug'
 * 
 * <SessionDebug />
 * 
 * 問題が解決したら削除してください
 */
export default function SessionDebug() {
  const { data, status } = useSession()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff00',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '400px',
        maxHeight: '300px',
        overflow: 'auto',
        zIndex: 9999,
        border: '1px solid #00ff00',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#ffff00' }}>
        🔍 Session Debug
      </div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(
          {
            status,
            user: data?.user || null,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )}
      </pre>
    </div>
  )
}

