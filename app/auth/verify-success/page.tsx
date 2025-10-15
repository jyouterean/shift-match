'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function VerifySuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(5)
  const alreadyVerified = searchParams.get('status') === 'already_verified'

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/auth/signin')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-green-200">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl text-gray-900">
            {alreadyVerified ? 'すでに認証済みです' : 'メール認証完了'}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {alreadyVerified
              ? 'このメールアドレスはすでに認証されています'
              : 'メールアドレスの認証が完了しました'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-800 font-medium">
              ✅ アカウントが有効化されました
            </p>
            <p className="text-xs text-green-700 mt-2">
              これでShiftMatchのすべての機能をご利用いただけます
            </p>
          </div>

          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              {countdown}秒後にログインページに移動します...
            </p>
            <Button
              onClick={() => router.push('/auth/signin')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              size="lg"
            >
              今すぐログイン
            </Button>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              問題が発生した場合は、管理者にお問い合わせください
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const dynamic = 'force-dynamic'

