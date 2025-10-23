'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  FileText,
  MessageSquare,
  Bell,
  LogOut,
  User,
  Settings
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

const navigation = [
  { name: 'ホーム', href: '/staff/dashboard', icon: LayoutDashboard },
  { name: 'シフト', href: '/staff/shifts', icon: Calendar },
  { name: '日報', href: '/staff/reports', icon: FileText },
  { name: 'チャット', href: '/staff/chat', icon: MessageSquare },
  { name: 'メニュー', href: '#', icon: User, isMenu: true },
]

const subNavigation = [
  { name: '通知', href: '/staff/notifications', icon: Bell },
  { name: '設定', href: '/staff/settings', icon: Settings },
]

export default function StaffNav() {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)
  const { data: session } = useSession()

  return (
    <>
      {/* モバイル用ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 safe-area-bottom">
        <div className="grid grid-cols-5 h-16">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            if (item.isMenu) {
              return (
                <button
                  key={item.name}
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-green-600 transition-colors active:scale-95"
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            }
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-all active:scale-95',
                  isActive
                    ? 'text-green-600 bg-green-50'
                    : 'text-gray-600 hover:text-green-600'
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* サブメニューモーダル */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-fadeIn"
          onClick={() => setShowMenu(false)}
        >
          <div 
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
            
            {/* ユーザー情報 */}
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl">
              <p className="text-sm text-gray-600">ログイン中</p>
              <p className="font-bold text-gray-900">{session?.user.name}</p>
              <p className="text-xs text-gray-500">{session?.user.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {subNavigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95',
                      isActive
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    <Icon className="h-7 w-7" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>

            <button
              onClick={async () => {
                if (confirm('ログアウトしますか？')) {
                  try {
                    // キャッシュをクリア
                    if ('caches' in window) {
                      const cacheNames = await caches.keys()
                      await Promise.all(cacheNames.map(name => caches.delete(name)))
                      console.log('[logout] ✅ キャッシュクリア完了')
                    }
                    
                    // カスタムログアウトAPIを呼び出してCookieを削除
                    await fetch('/api/auth/logout', { method: 'POST' })
                    // NextAuthのsignOutを呼び出してセッションをクリア
                    // redirect: falseにしてから手動でリダイレクトすることでページをリロード
                    await signOut({ redirect: false })
                    // ページを完全にリロードしてトップページに遷移
                    window.location.href = '/'
                  } catch (error) {
                    console.error('Logout error:', error)
                    // エラーが発生してもログアウトを実行
                    await signOut({ redirect: false })
                    window.location.href = '/'
                  }
                }
              }}
              className="w-full py-4 bg-red-100 text-red-700 rounded-2xl font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <LogOut className="h-5 w-5" />
              ログアウト
            </button>
          </div>
        </div>
      )}

      {/* コンテンツの下部パディング（ボトムナビの高さ分） */}
      <div className="h-16"></div>
    </>
  )
}

