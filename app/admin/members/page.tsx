'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AdminNav from '@/components/admin-nav'
import { Users, Edit, Trash2, UserCheck, UserX } from 'lucide-react'

interface Office {
  id: string
  name: string
}

interface Member {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  status: string
  office?: Office
}

export default function AdminMembersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [offices, setOffices] = useState<Office[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'STAFF',
    status: 'ACTIVE',
    officeId: '',
  })

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/members')
      const data = await response.json()
      if (response.ok) {
        setMembers(data.members)
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchOffices = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/offices')
      const data = await response.json()
      if (response.ok) {
        setOffices(data.offices)
      }
    } catch (error) {
      console.error('Failed to fetch offices:', error)
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

    fetchMembers()
    fetchOffices()
  }, [session, status, router, fetchMembers, fetchOffices])

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    try {
      const response = await fetch('/api/admin/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          ...formData,
          officeId: formData.officeId || null,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setEditingMember(null)
        fetchMembers()
        alert('メンバー情報を更新しました')
      } else {
        alert(data.error || '更新に失敗しました')
      }
    } catch (error) {
      alert('ネットワークエラーが発生しました')
    }
  }

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`${name}さんを削除しますか？`)) return

    try {
      const response = await fetch(`/api/admin/members?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (response.ok) {
        fetchMembers()
        alert('メンバーを削除しました')
      } else {
        alert(data.error || '削除に失敗しました')
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
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            メンバー管理
          </h1>
          <p className="text-sm sm:text-base text-gray-600">チームメンバーを管理します（{members.length}人）</p>
        </div>

        {/* 検索バー */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <Input
              placeholder="名前またはメールアドレスで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {members
            .filter(member => 
              member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              member.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{member.name}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>{member.email}</p>
                      {member.phone && <p>📱 {member.phone}</p>}
                      {member.office && <p>🏢 {member.office.name}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap mt-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                        member.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {member.role === 'OWNER' ? 'オーナー' : member.role === 'ADMIN' ? '管理者' : '従業員'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        member.status === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {member.status === 'ACTIVE' ? '有効' : 
                         member.status === 'SUSPENDED' ? '停止中' : '無効'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingMember(member)
                        setFormData({
                          name: member.name,
                          email: member.email,
                          phone: member.phone || '',
                          role: member.role,
                          status: member.status,
                          officeId: member.office?.id || '',
                        })
                      }}
                      className="bg-blue-50 hover:bg-blue-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {member.role !== 'OWNER' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        className="bg-red-50 hover:bg-red-100 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {members.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>メンバーがいません</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 編集モーダル */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>メンバー編集</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateMember} className="space-y-4">
                <div>
                  <Label htmlFor="name">名前</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">電話番号</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="office">営業所</Label>
                  <select
                    id="office"
                    value={formData.officeId}
                    onChange={(e) => setFormData({ ...formData, officeId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">未割当</option>
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                </div>

                {editingMember.role !== 'OWNER' && (
                  <>
                    <div>
                      <Label htmlFor="role">役割</Label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="STAFF">従業員</option>
                        <option value="ADMIN">管理者</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="status">ステータス</Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="ACTIVE">有効</option>
                        <option value="INACTIVE">無効</option>
                        <option value="SUSPENDED">停止中</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">更新</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingMember(null)}
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
