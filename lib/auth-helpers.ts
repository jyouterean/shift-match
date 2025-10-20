/**
 * 認証ヘルパー関数
 * クライアント側とサーバー側の認証処理を統一
 */

import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'

/**
 * サーバー側認証チェック（APIルート用）
 * 
 * @returns セッション情報または401エラーレスポンス
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: '認証が必要です。ログインしてください。' },
        { status: 401 }
      ),
      session: null,
    }
  }

  return { error: null, session }
}

/**
 * サーバー側管理者権限チェック（APIルート用）
 * 
 * @returns セッション情報またはエラーレスポンス
 */
export async function requireAdmin() {
  const { error, session } = await requireAuth()

  if (error) {
    return { error, session: null }
  }

  if (session!.user.role !== 'OWNER' && session!.user.role !== 'ADMIN') {
    return {
      error: NextResponse.json(
        { error: '管理者権限が必要です。' },
        { status: 403 }
      ),
      session: null,
    }
  }

  return { error: null, session }
}

/**
 * サーバー側オーナー権限チェック（APIルート用）
 * 
 * @returns セッション情報またはエラーレスポンス
 */
export async function requireOwner() {
  const { error, session } = await requireAuth()

  if (error) {
    return { error, session: null }
  }

  if (session!.user.role !== 'OWNER') {
    return {
      error: NextResponse.json(
        { error: 'オーナー権限が必要です。' },
        { status: 403 }
      ),
      session: null,
    }
  }

  return { error: null, session }
}

/**
 * セッション情報の型定義
 */
export type SessionUser = {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'STAFF'
  companyId: string
  officeId?: string
}

/**
 * 認証エラーレスポンスのヘルパー関数
 */
export function unauthorizedResponse(message = '認証が必要です') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = '権限がありません') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function notFoundResponse(message = 'リソースが見つかりません') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function badRequestResponse(message = '不正なリクエストです') {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function serverErrorResponse(message = 'サーバーエラーが発生しました') {
  return NextResponse.json({ error: message }, { status: 500 })
}

