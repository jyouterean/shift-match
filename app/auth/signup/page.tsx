'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    // このページにアクセスしたら裏モードにリダイレクト
    router.push('/admin/secret')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">アクセス制限</CardTitle>
          <CardDescription>
            管理者アカウントの作成は特別な方法でのみ可能です
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center">
            リダイレクトしています...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}



