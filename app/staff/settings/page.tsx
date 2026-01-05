'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import StaffNav from '@/components/staff-nav'
import { Settings, User, Mail, Phone, Building2, AlertTriangle, Trash2 } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  status: string
  office?: {
    id: string
    name: string
  }
  company: {
    id: string
    name: string
    code: string
  }
}

export default function StaffSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/staff/profile')
      const data = await response.json()
      if (response.ok) {
        setProfile(data.user)
        setFormData({
          name: data.user.name,
          phone: data.user.phone || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
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

    if (session.user.role !== 'STAFF') {
      router.push('/admin/dashboard')
      return
    }

    fetchProfile()
  }, [session, status, router, fetchProfile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/staff/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (response.ok) {
        fetchProfile()
        alert('プロフィールを更新しました')
      } else {
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== profile?.name) {
      alert('名前が正しくありません')
      return
    }

    if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
      return
    }

    try {
      const response = await fetch('/api/staff/account', {
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
      <StaffNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            設定
          </h1>
          <p className="text-sm sm:text-base text-gray-600">プロフィールとアカウント設定</p>
        </div>

        {profile && (
          <div className="space-y-6">
            {/* プロフィール情報 */}
            <Card className="bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  プロフィール情報
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">メールアドレス</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">所属営業所</p>
                      <p className="font-medium">{profile.office?.name || '未割当'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">会社</p>
                      <p className="font-medium">{profile.company.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">役割</p>
                      <p className="font-medium">従業員</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="name">名前</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">電話番号（任意）</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="090-1234-5678"
                      className="bg-white"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    プロフィール更新
                  </Button>
                </form>
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
                        削除されるデータ: プロフィール、シフト希望、日報、チャット履歴など
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="deleteConfirm" className="text-sm font-semibold text-gray-900">
                        確認のため名前「{profile?.name}」を入力してください
                      </Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={profile?.name}
                        className="mt-2 border-red-300 focus:border-red-500 bg-white"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== profile?.name}
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
                        className="flex-1 bg-gray-100 hover:bg-gray-200"
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

