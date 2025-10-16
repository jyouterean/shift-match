'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AdminNav from '@/components/admin-nav'
import { Bell, Plus, CheckCircle, Info, AlertTriangle, XCircle, Trash2 } from 'lucide-react'

interface Notification {
  id: string
  title: string
  content: string
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  isRead: boolean
  createdAt: string
}

export default function AdminNotificationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'INFO' as const,
  })

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications')
      const data = await response.json()
      if (response.ok) {
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
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

    fetchNotifications()
  }, [session, status, router, fetchNotifications])

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (response.ok) {
        setShowCreateForm(false)
        setFormData({ title: '', content: '', type: 'INFO' })
        fetchNotifications()
        alert('通知を送信しました')
      } else {
        alert(data.error || '送信に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'ERROR':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'border-l-4 border-green-500 bg-green-50'
      case 'WARNING':
        return 'border-l-4 border-yellow-500 bg-yellow-50'
      case 'ERROR':
        return 'border-l-4 border-red-500 bg-red-50'
      default:
        return 'border-l-4 border-blue-500 bg-blue-50'
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
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Bell className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
              通知
            </h1>
            <p className="text-sm sm:text-base text-gray-600">全社通知の送信と管理（{notifications.length}件）</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            通知作成
          </Button>
        </div>

        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className={`${getTypeColor(notification.type)} ${!notification.isRead ? 'shadow-lg' : ''}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {getTypeIcon(notification.type)}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{notification.title}</h3>
                    <p className="text-sm text-gray-700 mt-1">{notification.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(notification.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {notifications.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>通知がありません</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 作成モーダル */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-2xl border-2 border-blue-200 bg-white">
            <CardHeader>
              <CardTitle>通知作成</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateNotification} className="space-y-4">
                <div>
                  <Label htmlFor="title">タイトル *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="例: 重要なお知らせ"
                  />
                </div>

                <div>
                  <Label htmlFor="content">内容 *</Label>
                  <textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    placeholder="通知の内容を入力..."
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="type">種類</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="INFO">情報</option>
                    <option value="SUCCESS">成功</option>
                    <option value="WARNING">警告</option>
                    <option value="ERROR">エラー</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">送信</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
