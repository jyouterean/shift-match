'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export function SessionInfo() {
  const { data: session } = useSession()
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!session) return

    const updateTimeLeft = () => {
      // セッションの有効期限を計算（15日間）
      const loginTime = new Date(session.user?.id ? Date.now() : Date.now()) // 実際のログイン時刻を取得できない場合は現在時刻
      const expiryTime = new Date(loginTime.getTime() + 15 * 24 * 60 * 60 * 1000)
      const now = new Date()
      const diff = expiryTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('期限切れ')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      
      setTimeLeft(`残り${days}日${hours}時間`)
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 60000) // 1分ごとに更新

    return () => clearInterval(interval)
  }, [session])

  if (!session || process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-20 right-4 bg-white border border-blue-200 rounded-lg shadow-lg p-3 text-xs z-40">
      <div className="font-semibold text-blue-900 mb-1">セッション情報</div>
      <div className="text-gray-600">
        ログイン: {session.user?.email}
      </div>
      <div className="text-gray-600">
        有効期限: {timeLeft}
      </div>
      <div className="text-green-600 font-semibold mt-1">
        15日間自動ログイン中
      </div>
    </div>
  )
}

