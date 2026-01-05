'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AdminNav from '@/components/admin-nav'
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Report {
  id: string
  date: string
  route: string
  startTime: string
  endTime: string
  breakMinutes: number
  workMinutes: number
  deliveryCount: number
  notes?: string
  status: string
  createdAt: string
  user: {
    id: string
    name: string
  }
  office: {
    id: string
    name: string
  }
  items?: Array<{
    priceType: {
      name: string
      unitPrice: number
    }
    quantity: number
  }>
}

export default function AdminReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  })
  const [statusFilter, setStatusFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])

  const fetchReports = useCallback(async () => {
    try {
      let url = '/api/admin/reports?'
      if (dateFilter.startDate && dateFilter.endDate) {
        url += `startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}&`
      }
      if (statusFilter) {
        url += `status=${statusFilter}&`
      }
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setReports(data.reports)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dateFilter, statusFilter])

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

    fetchReports()
    fetchUsers()
  }, [session, status, router, fetchReports])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/members')
      const data = await response.json()
      if (response.ok) {
        setUsers(data.members.map((m: any) => ({ id: m.id, name: m.name })))
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'APPROVED' }),
      })

      if (response.ok) {
        fetchReports()
        alert('日報を承認しました')
      }
    } catch (error) {
      alert('承認に失敗しました')
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('この日報を却下しますか？')) return
    
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'REJECTED' }),
      })

      if (response.ok) {
        fetchReports()
        alert('日報を却下しました')
      }
    } catch (error) {
      alert('却下に失敗しました')
    }
  }

  const handleBulkApprove = async () => {
    if (selectedReports.length === 0) {
      alert('日報を選択してください')
      return
    }
    if (!confirm(`${selectedReports.length}件の日報を一括承認しますか？`)) return

    try {
      const response = await fetch('/api/admin/reports/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportIds: selectedReports,
          status: 'APPROVED',
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setSelectedReports([])
        fetchReports()
        alert(data.message || '一括承認しました')
      } else {
        alert(data.error || '一括承認に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleBulkReject = async () => {
    if (selectedReports.length === 0) {
      alert('日報を選択してください')
      return
    }
    if (!confirm(`${selectedReports.length}件の日報を一括却下しますか？`)) return

    try {
      const response = await fetch('/api/admin/reports/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportIds: selectedReports,
          status: 'REJECTED',
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setSelectedReports([])
        fetchReports()
        alert(data.message || '一括却下しました')
      } else {
        alert(data.error || '一括却下に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const toggleSelectReport = (id: string) => {
    setSelectedReports(prev =>
      prev.includes(id)
        ? prev.filter(reportId => reportId !== id)
        : [...prev, id]
    )
  }

  const selectAllPending = () => {
    const pendingIds = reports
      .filter(r => r.status === 'SUBMITTED')
      .map(r => r.id)
    setSelectedReports(pendingIds)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'REJECTED': return <XCircle className="h-5 w-5 text-red-600" />
      default: return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED': return '承認済み'
      case 'REJECTED': return '却下'
      case 'DRAFT': return '下書き'
      default: return '承認待ち'
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
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                日報管理
              </h1>
              <p className="text-sm sm:text-base text-gray-600">日報を管理します（{reports.length}件）</p>
            </div>
            {selectedReports.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleBulkApprove} size="sm" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  一括承認({selectedReports.length})
                </Button>
                <Button onClick={handleBulkReject} size="sm" variant="outline" className="text-red-600">
                  <XCircle className="h-4 w-4 mr-1" />
                  一括却下({selectedReports.length})
                </Button>
              </div>
            )}
          </div>
          {reports.filter(r => r.status === 'SUBMITTED').length > 0 && (
            <Button onClick={selectAllPending} size="sm" variant="outline" className="mb-2">
              承認待ち全選択
            </Button>
          )}
        </div>

        {/* フィルター */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[140px]">
                <Label htmlFor="filter-start">開始日</Label>
                <Input
                  id="filter-start"
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <Label htmlFor="filter-end">終了日</Label>
                <Input
                  id="filter-end"
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <Label htmlFor="filter-status">ステータス</Label>
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">全て</option>
                  <option value="SUBMITTED">承認待ち</option>
                  <option value="APPROVED">承認済み</option>
                  <option value="REJECTED">却下</option>
                </select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <Label htmlFor="filter-user">担当者</Label>
                <select
                  id="filter-user"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">全員</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={fetchReports} variant="outline">
                フィルター
              </Button>
              <Button 
                onClick={() => {
                  setDateFilter({ startDate: '', endDate: '' })
                  setStatusFilter('')
                  setUserFilter('')
                  fetchReports()
                }}
                variant="outline"
              >
                クリア
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {reports
            .filter(report => !userFilter || report.user.id === userFilter)
            .map((report) => (
            <Card key={report.id} className={`hover:shadow-lg transition-shadow ${selectedReports.includes(report.id) ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {report.status === 'SUBMITTED' && (
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(report.id)}
                        onChange={() => toggleSelectReport(report.id)}
                        className="w-5 h-5 rounded border-gray-300"
                      />
                    )}
                    <span>{new Date(report.date).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(report.status)}
                    <span className="text-sm font-normal text-gray-600">
                      {getStatusText(report.status)}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-blue-600">{report.user.name}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-600">{report.office.name}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">ルート</p>
                      <p className="font-medium">{report.route}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">配送数</p>
                      <p className="font-medium">{report.deliveryCount}件</p>
                    </div>
                    <div>
                      <p className="text-gray-500">勤務時間</p>
                      <p className="font-medium">
                        {new Date(report.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(report.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">実働時間</p>
                      <p className="font-medium">{Math.floor(report.workMinutes / 60)}時間{report.workMinutes % 60}分</p>
                    </div>
                  </div>

                  {report.items && report.items.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">単価明細</p>
                      <div className="space-y-1">
                        {report.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {item.priceType.name} × {item.quantity}
                            </span>
                            <span className="font-medium">
                              ¥{(item.priceType.unitPrice * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold pt-2 border-t">
                          <span>合計</span>
                          <span className="text-blue-600">
                            ¥{report.items.reduce((sum, item) => sum + (item.priceType.unitPrice * item.quantity), 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {report.notes && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-600">{report.notes}</p>
                    </div>
                  )}

                  {report.status === 'SUBMITTED' && (
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(report.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReject(report.id)}
                        variant="outline"
                        className="flex-1 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        却下
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {reports.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>日報がありません</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
