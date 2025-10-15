'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Building2 } from 'lucide-react'

export default function SecretAdminPage() {
  const router = useRouter()
  const [step, setStep] = useState<'password' | 'register'>('password')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
  })
  const [createdCompany, setCreatedCompany] = useState<{
    name: string
    code: string
  } | null>(null)

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // サーバーサイドでパスワード検証
      const response = await fetch('/api/admin/secret/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      
      if (response.ok) {
        setStep('register')
        setError('')
      } else {
        setError('パスワードが正しくありません')
      }
    } catch (error) {
      setError('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.companyName,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          adminPhone: formData.adminPhone,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // 会社コードを表示
        setCreatedCompany({
          name: data.company.name,
          code: data.company.code,
        })
      } else {
        setError(data.error || '登録に失敗しました')
      }
    } catch (error) {
      setError('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-400 bg-clip-text text-transparent">
              ShiftMatch
            </h1>
          </Link>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Shield className="h-5 w-5 text-red-600" />
            <p className="text-red-600 font-medium">管理者専用エリア</p>
          </div>
        </div>

        {step === 'password' ? (
          <Card className="shadow-xl border-red-200">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Shield className="h-6 w-6 text-red-600" />
                パスワード認証
              </CardTitle>
              <CardDescription>
                このエリアは管理者のみアクセス可能です
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="パスワードを入力"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                  確認
                </Button>

                <div className="text-center">
                  <Link href="/" className="text-sm text-gray-600 hover:underline">
                    トップページに戻る
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                新規会社作成
              </CardTitle>
              <CardDescription>
                会社情報と管理者アカウントを作成します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">会社名 *</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="株式会社サンプル"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-600">
                    💡 会社コードは作成後に自動発行されます
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminName">管理者名 *</Label>
                  <Input
                    id="adminName"
                    type="text"
                    placeholder="山田 太郎"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">管理者メールアドレス *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@company.com"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPhone">管理者電話番号（任意）</Label>
                  <Input
                    id="adminPhone"
                    type="tel"
                    placeholder="090-1234-5678"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPassword">管理者パスワード *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="6文字以上"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? '作成中...' : '作成'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 会社コード表示モーダル */}
      {createdCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-2xl text-green-600 flex items-center justify-center gap-2">
                <Shield className="h-8 w-8" />
                会社作成完了！
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    会社とアカウントが正常に作成されました。
                  </p>
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-6">
                    <p className="text-sm text-gray-700 mb-2">会社名</p>
                    <p className="text-xl font-bold text-gray-900 mb-4">{createdCompany.name}</p>
                    
                    <p className="text-sm text-gray-700 mb-2">会社コード（従業員参加用）</p>
                    <div className="bg-white rounded-lg p-4 border-2 border-dashed border-blue-400">
                      <p className="text-3xl font-mono font-bold text-blue-600 tracking-wider">
                        {createdCompany.code}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                    <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ 重要</p>
                    <ul className="text-xs text-yellow-800 space-y-1">
                      <li>• この会社コードは従業員が参加する際に必要です</li>
                      <li>• 必ず控えておいてください</li>
                      <li>• ログイン後、設定ページでも確認できます</li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={() => router.push('/auth/signin')}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  ログインページへ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

