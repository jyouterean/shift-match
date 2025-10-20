'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { AlertCircle } from 'lucide-react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'メールアドレスまたはパスワードが正しくありません'
      case 'Callback':
        return '認証コールバックでエラーが発生しました'
      case 'OAuthSignin':
        return 'OAuth認証の開始に失敗しました'
      case 'OAuthCallback':
        return 'OAuth認証のコールバックに失敗しました'
      case 'OAuthCreateAccount':
        return 'OAuthアカウントの作成に失敗しました'
      case 'EmailCreateAccount':
        return 'メールアカウントの作成に失敗しました'
      case 'EmailSignin':
        return 'メール認証に失敗しました'
      case 'SessionRequired':
        return 'ログインが必要です'
      case 'Default':
      default:
        return '認証エラーが発生しました。もう一度お試しください。'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* エラーカード */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          {/* エラーアイコン */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>

          {/* エラータイトル */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              認証エラー
            </h1>
            <p className="text-red-600 font-medium">
              {getErrorMessage(error)}
            </p>
          </div>

          {/* エラー詳細（開発環境のみ） */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 font-mono">
                Error Code: {error}
              </p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="w-full block py-3 bg-blue-600 text-white text-center rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all"
            >
              ログイン画面に戻る
            </Link>

            <Link
              href="/"
              className="w-full block py-3 bg-gray-100 text-gray-700 text-center rounded-xl font-medium hover:bg-gray-200 active:scale-95 transition-all"
            >
              トップページに戻る
            </Link>
          </div>
        </div>

        {/* ヘルプテキスト */}
        <div className="text-center text-sm text-gray-600">
          <p>問題が解決しない場合は、管理者にお問い合わせください。</p>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-6 text-gray-700 text-lg font-medium">読み込み中...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}

