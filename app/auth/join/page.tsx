'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function JoinPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyCode: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [codeValidation, setCodeValidation] = useState<{
    isValid: boolean | null
    companyName: string | null
    isChecking: boolean
  }>({
    isValid: null,
    companyName: null,
    isChecking: false,
  })

  // 会社コードのリアルタイム検証
  useEffect(() => {
    const validateCompanyCode = async () => {
      // 入力値を正規化（前後の空白削除、大文字変換）
      const normalizedCode = formData.companyCode.trim().toUpperCase()
      
      if (normalizedCode.length < 4) {
        setCodeValidation({ isValid: null, companyName: null, isChecking: false })
        return
      }

      setCodeValidation({ isValid: null, companyName: null, isChecking: true })

      try {
        // 正規化されたコードで検証
        const response = await fetch(`/api/companies/validate?code=${encodeURIComponent(normalizedCode)}`)
        const data = await response.json()

        if (data.valid) {
          setCodeValidation({
            isValid: true,
            companyName: data.companyName,
            isChecking: false,
          })
        } else {
          setCodeValidation({
            isValid: false,
            companyName: null,
            isChecking: false,
          })
        }
      } catch (error) {
        console.error('Company code validation error:', error)
        setCodeValidation({
          isValid: false,
          companyName: null,
          isChecking: false,
        })
      }
    }

    const debounceTimer = setTimeout(validateCompanyCode, 500)
    return () => clearTimeout(debounceTimer)
  }, [formData.companyCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // パスワード確認
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    // 会社コード検証
    if (!codeValidation.isValid) {
      setError('有効な会社コードを入力してください')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/companies/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message || '登録が完了しました')
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        setError(data.error || '登録に失敗しました')
      }
    } catch (error) {
      setError('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // パスワード確認の検証
  const passwordsMatch = formData.password && formData.confirmPassword 
    ? formData.password === formData.confirmPassword 
    : null

  // 会社コード入力欄のボーダー色
  const getCodeBorderColor = () => {
    if (codeValidation.isChecking) return 'border-gray-300'
    if (codeValidation.isValid === true) return 'border-green-500'
    if (codeValidation.isValid === false) return 'border-red-500'
    return 'border-gray-300'
  }

  // パスワード確認欄のボーダー色
  const getPasswordBorderColor = () => {
    if (!formData.confirmPassword) return 'border-gray-300'
    if (passwordsMatch === true) return 'border-green-500'
    if (passwordsMatch === false) return 'border-red-500'
    return 'border-gray-300'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
              ShiftMatch
            </h1>
          </Link>
          <p className="text-gray-600 mt-2">会社に参加</p>
        </div>

        {/* Join Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Building2 className="h-6 w-6 text-green-600" />
              従業員登録
            </CardTitle>
            <CardDescription>
              会社コードを使用してアカウントを作成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 会社コード */}
              <div className="space-y-2">
                <Label htmlFor="companyCode">会社コード *</Label>
                <div className="relative">
                  <Input
                    id="companyCode"
                    type="text"
                    placeholder="例: A9FJAY9I"
                    value={formData.companyCode}
                    onChange={(e) => setFormData({ ...formData, companyCode: e.target.value.toUpperCase() })}
                    required
                    disabled={isLoading}
                    className={`pr-10 ${getCodeBorderColor()}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {codeValidation.isChecking && (
                      <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                    )}
                    {codeValidation.isValid === true && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {codeValidation.isValid === false && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  管理者から共有された8桁の会社コードを入力してください
                </p>
                {codeValidation.companyName && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    {codeValidation.companyName}
                  </p>
                )}
                {codeValidation.isValid === false && formData.companyCode.length >= 4 && (
                  <p className="text-sm text-red-600">
                    会社が見つかりません。会社コードを確認してください。
                  </p>
                )}
              </div>

              {/* 名前 */}
              <div className="space-y-2">
                <Label htmlFor="name">お名前 *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="山田 太郎"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* メールアドレス */}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* 電話番号 */}
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号（任意）</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="090-1234-5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              {/* パスワード */}
              <div className="space-y-2">
                <Label htmlFor="password">パスワード *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="6文字以上"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* パスワード確認 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード確認 *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="パスワードを再入力"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                    className={`pr-10 ${getPasswordBorderColor()}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch === true && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {passwordsMatch === false && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
                {passwordsMatch === false && (
                  <p className="text-sm text-red-600">パスワードが一致しません</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isLoading || !codeValidation.isValid}
              >
                {isLoading ? '登録中...' : '登録する'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>既にアカウントをお持ちですか？</p>
              <Link href="/auth/signin" className="text-green-600 hover:underline font-medium">
                ログインする
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



