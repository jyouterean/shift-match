'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import StaffNav from '@/components/staff-nav'
import { Settings, User, AlertTriangle } from 'lucide-react'

export default function StaffSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '削除') {
      alert('「削除」と入力してください')
      return
    }

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
      })

      const data = await response.json()
      if (response.ok) {
        alert('アカウントを削除しました。ログアウトします。')
        router.push('/auth/signin')
      } else {
        alert(data.error || 'アカウント削除に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
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
          <p className="text-sm sm:text-base text-gray-600">アカウント設定</p>
        </div>

        <div className="space-y-6">
          {/* ユーザー情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                ユーザー情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">名前</p>
                  <p className="font-medium text-gray-900">{session.user.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">メールアドレス</p>
                  <p className="font-medium text-gray-900">{session.user.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">役割</p>
                  <p className="font-medium text-gray-900">
                    {session.user.role === 'STAFF' ? '従業員' : session.user.role}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">ステータス</p>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    有効
                  </span>
                </div>
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
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">アカウント削除</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    この操作は取り消せません。すべてのデータが完全に削除されます。
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    アカウントを削除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 削除確認モーダル */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md shadow-2xl border-2 border-red-200 bg-white">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b-2 border-red-100">
                <CardTitle className="text-xl font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  アカウント削除の確認
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white pt-6">
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800 font-medium mb-2">
                      ⚠️ 警告: この操作は取り消せません
                    </p>
                    <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                      <li>アカウントが完全に削除されます</li>
                      <li>すべてのデータが失われます</li>
                      <li>この操作は元に戻せません</li>
                    </ul>
                  </div>

                  <div>
                    <Label htmlFor="deleteConfirm" className="text-gray-900">
                      削除を確認するには「削除」と入力してください
                    </Label>
                    <Input
                      id="deleteConfirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="削除"
                      className="mt-2"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== '削除'}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
                    >
                      削除を実行
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 border-gray-300"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

