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
import { Settings, Building2, Shield, Download, Calendar, Users as UsersIcon } from 'lucide-react'

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
  const [formData, setFormData] = useState({
    name: '',
    requireApproval: false,
  })

  const fetchCompany = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/company')
      const data = await response.json()
      if (response.ok) {
        setCompany(data.company)
        setFormData({
          name: data.company.name,
          requireApproval: data.company.requireApproval,
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

    if (!session) {
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/admin/shifts/requirements">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-blue-100 p-3">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">シフト必要人数設定</h3>
                        <p className="text-sm text-gray-600">営業所ごとの必要人数を設定</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

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

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-base">新規従業員の承認</Label>
                      <p className="text-sm text-gray-600">
                        新しく参加した従業員を管理者が承認する
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, requireApproval: !formData.requireApproval })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.requireApproval ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.requireApproval ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
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
          </div>
        )}
      </div>
    </div>
  )
}
