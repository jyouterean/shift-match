'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AdminNav from '@/components/admin-nav'
import { Wand2, AlertCircle } from 'lucide-react'

interface Office {
  id: string
  name: string
}

export default function AutoAssignPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [offices, setOffices] = useState<Office[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    officeIds: [] as string[],
  })

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

    fetchOffices()
  }, [session, status, router])

  const fetchOffices = async () => {
    try {
      const response = await fetch('/api/admin/offices')
      const data = await response.json()
      if (response.ok) {
        setOffices(data.offices)
      }
    } catch (error) {
      console.error('Failed to fetch offices:', error)
    }
  }

  const handleAutoAssign = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/shifts/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        alert(data.error || '自動割当に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleOffice = (officeId: string) => {
    setFormData(prev => ({
      ...prev,
      officeIds: prev.officeIds.includes(officeId)
        ? prev.officeIds.filter(id => id !== officeId)
        : [...prev.officeIds, officeId]
    }))
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
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
      
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-purple-600" />
              シフト自動割当
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">自動割当の仕組み</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 希望提出済みのドライバーを優先的に割当</li>
                <li>• 稼働回数が少ないドライバーから順に割当（バランス調整）</li>
                <li>• 対応可能営業所に所属するドライバーのみ割当</li>
                <li>• 不足がある場合はエラーとして表示</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">開始日</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">終了日</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>対象営業所（未選択時は全営業所）</Label>
                <div className="mt-2 space-y-2">
                  {offices.map((office) => (
                    <label
                      key={office.id}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.officeIds.includes(office.id)}
                        onChange={() => toggleOffice(office.id)}
                        className="h-4 w-4"
                      />
                      <span>{office.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAutoAssign}
                disabled={isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? '割当中...' : '自動割当を実行'}
              </Button>
              <Button
                onClick={() => router.back()}
                variant="outline"
              >
                キャンセル
              </Button>
            </div>

            {result && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <h3 className={`font-semibold mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.success ? '✓ 自動割当完了' : '✗ エラー'}
                  </h3>
                  <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                    {result.message}
                  </p>
                  {result.assigned > 0 && (
                    <p className="text-green-800 mt-2">
                      {result.assigned}件のシフトを作成しました
                    </p>
                  )}
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      不足のある日
                    </h3>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {result.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={() => router.push('/admin/shifts/calendar')}
                  className="w-full"
                >
                  カレンダーに戻る
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

