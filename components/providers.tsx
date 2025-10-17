'use client'

import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // 5分ごとにセッションを再取得
      refetchOnWindowFocus={true} // ウィンドウフォーカス時に再取得
    >
      {children}
    </SessionProvider>
  )
}
