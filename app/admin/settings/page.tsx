'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AdminNav from '@/components/admin-nav'
import Link from 'next/link'
import { Settings, Building2, Shield, Download, Calendar, Users as UsersIcon, Trash2, AlertTriangle } from 'lucide-react'

interface Company {
  id: string
  name: string
  code: string
  requireApproval: boolean
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [formData, setFormData] = useState({
    name: '',
  })

  const fetchCompany = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/company')
      const data = await response.json()
      if (response.ok) {
        setCompany(data.company)
        setFormData({
          name: data.company.name,
        })
      }
    } catch (error) {
      console.error('Failed to fetch company:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      router.push('/staff/dashboard')
      return
    }

    fetchCompany()
  }, [session, status, router, fetchCompany])

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (response.ok) {
        fetchCompany()
        alert('会社情報を更新しました')
      } else {
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== company?.name) {
      alert('会社名が正しくありません')
      return
    }

    if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
      return
    }

    try {
      const response = await fetch('/api/admin/account', {
        method: 'DELETE',
      })

      const data = await response.json()
      if (response.ok) {
        alert('アカウントを削除しました。ログアウトします。')
        router.push('/api/auth/signout')
      } else {
        alert(data.error || 'アカウント削除に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            設定
          </h1>
          <p className="text-sm sm:text-base text-gray-600">会社情報とシステム設定</p>
        </div>

        {company && (
          <div className="space-y-6">
            {/* クイックアクセス */}
            <div className="grid grid-cols-1 gap-4">
              <Link href="/admin/notifications">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-green-100 p-3">
                        <UsersIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">通知設定</h3>
                        <p className="text-sm text-gray-600">システム通知を管理</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* 会社情報カード */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  会社情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">会社コード</p>
                    <p className="font-mono font-bold text-lg text-blue-600">{company.code}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">会社ID</p>
                    <p className="font-mono text-xs text-gray-600">{company.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 設定フォーム */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  会社設定
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateCompany} className="space-y-4">
                  <div>
                    <Label htmlFor="name">会社名</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    設定を保存
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* データエクスポート */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  データエクスポート
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">データをCSV形式でダウンロードできます</p>
                <div className="grid grid-cols-3 gap-3">
                  <a href="/api/admin/export?type=shifts" download>
                    <Button variant="outline" className="w-full" type="button">
                      <Download className="h-4 w-4 mr-2" />
                      シフト
                    </Button>
                  </a>
                  <a href="/api/admin/export?type=reports" download>
                    <Button variant="outline" className="w-full" type="button">
                      <Download className="h-4 w-4 mr-2" />
                      日報
                    </Button>
                  </a>
                  <a href="/api/admin/export?type=members" download>
                    <Button variant="outline" className="w-full" type="button">
                      <Download className="h-4 w-4 mr-2" />
                      メンバー
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* アカウント削除 */}
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  危険な操作
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-2">アカウントの削除</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    アカウントを削除すると、すべてのデータが完全に削除されます。
                    この操作は取り消すことができません。
                  </p>
                  <Button
                    type="button"
                    onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                    variant="outline"
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    アカウント削除
                  </Button>
                </div>

                {showDeleteConfirm && (
                  <div className="bg-white p-4 rounded-lg border-2 border-red-300 space-y-4">
                    <div className="bg-red-100 p-3 rounded-md">
                      <p className="text-sm font-semibold text-red-900 mb-2">
                        ⚠️ 警告: この操作は取り消せません
                      </p>
                      <p className="text-xs text-red-800">
                        削除されるデータ: 会社情報、全メンバー、シフト、日報、チャット履歴、監査ログなど
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="deleteConfirm" className="text-sm font-semibold text-gray-900">
                        確認のため会社名「{company?.name}」を入力してください
                      </Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={company?.name}
                        className="mt-2 border-red-300 focus:border-red-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== company?.name}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        完全に削除する
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                        }}
                        className="flex-1"
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
