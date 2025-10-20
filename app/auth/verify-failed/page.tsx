'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, AlertTriangle } from 'lucide-react'

function VerifyFailedContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = () => {
    switch (error) {
      case 'token_missing':
        return '認証トークンが見つかりません'
      case 'token_invalid':
        return '認証トークンが無効または期限切れです'
      case 'user_not_found':
        return 'ユーザーが見つかりません'
      case 'server_error':
        return 'サーバーエラーが発生しました'
      default:
        return '不明なエラーが発生しました'
    }
  }

  const getErrorDetails = () => {
    switch (error) {
      case 'token_missing':
        return 'メール内のリンクが正しくコピーされていない可能性があります。'
      case 'token_invalid':
        return '認証リンクの有効期限（24時間）が切れている可能性があります。新しい認証メールをリクエストしてください。'
      case 'user_not_found':
        return 'アカウントが削除されているか、メールアドレスが正しくない可能性があります。'
      case 'server_error':
        return '一時的なエラーです。しばらく待ってから再度お試しください。'
      default:
        return '詳細は管理者にお問い合わせください。'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-red-200">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-4">
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl text-gray-900">
            メール認証失敗
          </CardTitle>
          <CardDescription className="text-base mt-2">
            メールアドレスの認証に失敗しました
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 mb-1">
                  {getErrorMessage()}
                </p>
                <p className="text-xs text-red-700">
                  {getErrorDetails()}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">次の手順をお試しください：</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>メールアプリで最新の認証メールを確認</li>
              <li>リンク全体が正しくコピーされているか確認</li>
              <li>24時間以内にリンクをクリック</li>
              <li>問題が解決しない場合は管理者に連絡</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Link href="/auth/signin" className="block">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                size="lg"
              >
                ログインページに戻る
              </Button>
            </Link>
            <Link href="/auth/join" className="block">
              <Button
                variant="outline"
                className="w-full"
                size="lg"
              >
                新規登録
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              エラーコード: {error || 'unknown'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <VerifyFailedContent />
    </Suspense>
  )
}

export const dynamic = 'force-dynamic'

