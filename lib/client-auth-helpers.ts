/**
 * クライアント側認証ヘルパー関数
 */

'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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
export function LoadingScreen({ message = '読み込み中...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mx-auto"></div>
        <p className="mt-6 text-gray-700 text-lg font-medium">{message}</p>
      </div>
    </div>
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

