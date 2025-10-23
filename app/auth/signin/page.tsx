'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession, getCsrfToken } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import SessionDebug from '@/components/session-debug'

export default function SignInPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [csrfToken, setCsrfToken] = useState<string | undefined>(undefined)

  // CSRFトークンを取得
  useEffect(() => {
    const fetchCsrfToken = async () => {
      // 既存の古いNextAuth系Cookieがあるとログインが固まる場合があるため、ログイン画面表示時にクライアント側で削除
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
          // 現在のドメイン/パスのCookieを速やかに失効
          document.cookie = `${name}=; path=/; max-age=0; secure; samesite=lax`
        })
      } catch {}

      const token = await getCsrfToken()
      console.log('[login] CSRF token取得:', token ? '成功' : '失敗')
      setCsrfToken(token)
    }
    fetchCsrfToken()
  }, [])

  // セッションがある場合は自動的にリダイレクト
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (session.user.role === 'OWNER' || session.user.role === 'ADMIN') {
        router.push('/admin/dashboard')
      } else {
        router.push('/staff/dashboard')
      }
    }
  }, [session, status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    console.log('[login] ログイン処理開始... email:', email)
    console.log('[login] CSRF token:', csrfToken ? '有効' : '無効')

    // ログイン前にキャッシュをクリア
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
        console.log('[login] ✅ キャッシュクリア完了')
      }
    } catch (cacheError) {
      console.warn('[login] キャッシュクリアに失敗:', cacheError)
    }

    // CSRFトークンがない場合は警告
    if (!csrfToken) {
      console.warn('[login] ⚠️ CSRF tokenが取得できていません')
    }

    try {
      // タイムアウト処理を追加（30秒）
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('タイムアウト')), 30000)
      )

      const signInPromise = signIn('credentials', {
        email,
        password,
        csrfToken, // CSRFトークンを追加
        redirect: false,
      })

      const result = await Promise.race([signInPromise, timeoutPromise]) as any

      console.log('📝 signIn結果:', result)

      // resultがundefinedの場合
      if (!result) {
        console.error('❌ resultがundefinedです')
        setError('認証サーバーに接続できませんでした')
        setIsLoading(false)
        return
      }

      // エラーがある場合
      if (result.error) {
        console.error('❌ ログインエラー:', result.error)
        
        // エラーメッセージをユーザーフレンドリーに変換
        let errorMessage = result.error
        if (result.error === 'CredentialsSignin') {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません'
        }
        
        setError(errorMessage)
        setIsLoading(false)
        return
      }

      // ログイン成功
      if (result.ok) {
        console.log('✅ ログイン成功、セッション情報を取得中...')
        // useEffectによる自動リダイレクトを待つ
        // isLoadingはtrueのままにして、リダイレクトを示す
        return
      }

      // 予期しないレスポンス
      console.error('❌ 予期しないレスポンス:', result)
      setError('ログインに失敗しました。もう一度お試しください。')
      setIsLoading(false)
    } catch (error) {
      console.error('🔥 ログイン処理中にエラー:', error)
      
      if (error instanceof Error && error.message === 'タイムアウト') {
        setError('接続がタイムアウトしました。もう一度お試しください。')
      } else {
        setError('ログインに失敗しました。もう一度お試しください。')
      }
      
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              ShiftMatch
            </h1>
          </Link>
          <p className="text-gray-600 mt-2">シフト管理システム</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">ログイン</CardTitle>
            <CardDescription>
              メールアドレスとパスワードを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>アカウントをお持ちでないですか？</p>
              <Link href="/auth/join" className="text-blue-600 hover:underline font-medium">
                会社に参加する
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* デバッグ用（問題解決後に削除） */}
        {process.env.NODE_ENV === 'development' && <SessionDebug />}
      </div>
    </div>
  )
}



