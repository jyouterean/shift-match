'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  Menu,
  Building2,
  MapPin,
  DollarSign,
  Shield,
  LogOut
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from 'next-auth/react'

// メインナビゲーション（ボトムバー用）
const mainNavigation = [
  { name: 'ホーム', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'シフト', href: '/admin/shifts/calendar', icon: Calendar },
  { name: '日報', href: '/admin/reports', icon: FileText },
  { name: 'チャット', href: '/admin/chat', icon: MessageSquare },
  { name: 'メニュー', href: '#', icon: Menu, isMenu: true },
]

// サブメニュー
const subNavigation = [
  { name: 'シフト一覧', href: '/admin/shifts/manage', icon: Calendar },
  { name: 'メンバー', href: '/admin/members', icon: Users },
  { name: '営業所', href: '/admin/offices', icon: Building2 },
  { name: '単価設定', href: '/admin/price-types', icon: DollarSign },
  { name: '監査ログ', href: '/admin/audit-logs', icon: Shield },
  { name: '設定', href: '/admin/settings', icon: Settings },
]

export default function AdminNav() {
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <>
      {/* モバイル用ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 safe-area-bottom">
        <div className="grid grid-cols-5 h-16">
          {mainNavigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            if (item.isMenu) {
              return (
                <button
                  key={item.name}
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-blue-600 transition-colors active:scale-95"
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
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600'
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">メニュー</h3>
            <div className="grid grid-cols-3 gap-3">
              {subNavigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    <Icon className="h-7 w-7" />
                    <span className="text-xs font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>
            <button
              onClick={() => {
                if (confirm('ログアウトしますか？')) {
                  signOut({ callbackUrl: '/' })
                }
              }}
              className="w-full mt-4 py-4 bg-red-100 text-red-700 rounded-2xl font-medium active:scale-95 transition-transform flex items-center justify-center gap-2"
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

