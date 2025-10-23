/**
 * クライアント側認証ヘルパー関数
 */

'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React from 'react'

/**
 * クライアントサイドのキャッシュ/ストレージ/Cookieのクリア
 * - NextAuth関連Cookieの失効
 * - localStorage / sessionStorage のクリア
 * - Service Worker の登録解除
 * - Cache Storage の削除
 */
export async function clearClientCaches(): Promise<void> {
  try {
    // 1) NextAuth関連Cookieを明示的に無効化
    try {
      const cookieNames = [
        '__Secure-next-auth.session-token',
        'next-auth.session-token',
        '__Secure-next-auth.callback-url',
        'next-auth.callback-url',
        '__Secure-next-auth.csrf-token',
        'next-auth.csrf-token',
      ]
      cookieNames.forEach((name) => {
        document.cookie = `${name}=; path=/; max-age=0; secure; samesite=lax`
      })
    } catch {}

    // 2) Web Storage のクリア
    try {
      window.localStorage?.clear?.()
    } catch {}
    try {
      window.sessionStorage?.clear?.()
    } catch {}

    // 3) Service Worker の登録解除
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister().catch(() => {})))
      }
    } catch {}

    // 4) Cache Storage の削除
    try {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)))
      }
    } catch {}
  } catch {}
}

/**
 * ページ認証フック（管理者用）
 * 
 * @returns セッション情報とステータス
 */
export function useAdminAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    // 未認証の場合はログインページへ
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // スタッフの場合はスタッフダッシュボードへ
    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      router.push('/staff/dashboard')
      return
    }
  }, [session, status, router])

  return { session, status, isLoading: status === 'loading' }
}

/**
 * ページ認証フック（スタッフ用）
 * 
 * @returns セッション情報とステータス
 */
export function useStaffAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    // 未認証の場合はログインページへ
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // 管理者の場合は管理者ダッシュボードへ
    if (session.user.role === 'OWNER' || session.user.role === 'ADMIN') {
      router.push('/admin/dashboard')
      return
    }
  }, [session, status, router])

  return { session, status, isLoading: status === 'loading' }
}

/**
 * ページ認証フック（一般用）
 * ロールによるリダイレクトなし
 * 
 * @returns セッション情報とステータス
 */
export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    // 未認証の場合はログインページへ
    if (!session) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  return { session, status, isLoading: status === 'loading' }
}

/**
 * ログインリダイレクトフック
 * ログイン済みユーザーを適切なダッシュボードへリダイレクト
 * 
 * @returns セッション情報とステータス
 */
export function useLoginRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    // 認証済みの場合は適切なダッシュボードへ
    if (session?.user) {
      if (session.user.role === 'OWNER' || session.user.role === 'ADMIN') {
        router.push('/admin/dashboard')
      } else {
        router.push('/staff/dashboard')
      }
    }
  }, [session, status, router])

  return { session, status }
}

/**
 * ローディング状態のUI
 */
export function LoadingScreen({ message = '読み込み中...' }: { message?: string }): React.ReactElement {
  return React.createElement('div', { className: 'min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white' },
    React.createElement('div', { className: 'text-center' },
      React.createElement('div', { className: 'animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mx-auto' }),
      React.createElement('p', { className: 'mt-6 text-gray-700 text-lg font-medium' }, message)
    )
  )
}

/**
 * エラー処理ヘルパー
 */
export async function handleApiError(response: Response) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const errorMessage = data.error || `エラーが発生しました (${response.status})`
    
    // 401エラーの場合はログインページへリダイレクト
    if (response.status === 401) {
      window.location.href = '/auth/signin'
      throw new Error('認証が必要です')
    }
    
    // 403エラーの場合
    if (response.status === 403) {
      throw new Error('権限がありません')
    }
    
    throw new Error(errorMessage)
  }
  
  return response.json()
}

/**
 * フェッチヘルパー関数（認証付き）
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  return handleApiError(response)
}

