'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdminNav from '@/components/admin-nav'
import { Shield, User, Calendar, FileText, Settings } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string
  details?: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/audit-logs')
      const data = await response.json()
      if (response.ok) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
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

    fetchLogs()
  }, [session, status, router, fetchLogs])

  const getActionIcon = (entity: string) => {
    switch (entity) {
      case 'User':
        return <User className="h-5 w-5 text-blue-600" />
      case 'Shift':
        return <Calendar className="h-5 w-5 text-green-600" />
      case 'DailyReport':
        return <FileText className="h-5 w-5 text-orange-600" />
      default:
        return <Settings className="h-5 w-5 text-gray-600" />
    }
  }

  const getActionText = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '作成'
      case 'UPDATE':
        return '更新'
      case 'DELETE':
        return '削除'
      default:
        return action
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
      
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            監査ログ
          </h1>
          <p className="text-sm sm:text-base text-gray-600">操作履歴を確認します（{logs.length}件）</p>
        </div>

        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {getActionIcon(log.entity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{log.user.name}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-sm text-gray-600">{getActionText(log.action)}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-sm text-gray-600">{log.entity}</span>
                    </div>
                    {log.details && (
                      <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(log.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {logs.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>監査ログがありません</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}





