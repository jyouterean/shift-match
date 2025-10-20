/**
 * 登録アカウント情報確認スクリプト
 */

import { prisma } from '../lib/prisma'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function checkAccounts() {
  console.log('📊 登録アカウント情報を確認しています...\n')

  try {
    // 会社情報とユーザー情報を取得
    const companies = await prisma.company.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            status: true,
            emailVerified: true,
            verifiedAt: true,
            createdAt: true,
            updatedAt: true,
            officeId: true,
            office: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        offices: {
          select: {
            id: true,
            name: true,
            address: true,
            _count: {
              select: {
                users: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            offices: true,
            shifts: true,
            dailyReports: true,
            messages: true,
            notifications: true,
          },
        },
      },
    })

    console.log('=' .repeat(80))
    console.log('🏢 会社・アカウント情報')
    console.log('='.repeat(80) + '\n')

    if (companies.length === 0) {
      console.log('⚠️  登録されている会社・アカウントはありません。\n')
      return
    }

    for (const company of companies) {
      console.log(`🏢 会社名: ${company.name}`)
      console.log(`   会社ID: ${company.id}`)
      console.log(`   会社コード: ${company.code}`)
      console.log(`   承認必要: ${company.requireApproval ? 'はい' : 'いいえ'}`)
      console.log(`   作成日: ${company.createdAt.toLocaleString('ja-JP')}`)
      console.log(`   更新日: ${company.updatedAt.toLocaleString('ja-JP')}`)
      console.log('')

      console.log('   📊 統計情報:')
      console.log(`      ユーザー数: ${company._count.users}人`)
      console.log(`      営業所数: ${company._count.offices}か所`)
      console.log(`      シフト数: ${company._count.shifts}件`)
      console.log(`      日報数: ${company._count.dailyReports}件`)
      console.log(`      メッセージ数: ${company._count.messages}件`)
      console.log(`      通知数: ${company._count.notifications}件`)
      console.log('')

      // 営業所情報
      if (company.offices.length > 0) {
        console.log('   🏪 営業所一覧:')
        for (const office of company.offices) {
          console.log(`      - ${office.name}`)
          console.log(`        ID: ${office.id}`)
          console.log(`        住所: ${office.address || '未設定'}`)
          console.log(`        所属人数: ${office._count.users}人`)
        }
        console.log('')
      } else {
        console.log('   🏪 営業所: なし\n')
      }

      // ユーザー情報
      console.log('   👥 登録ユーザー一覧:\n')
      
      if (company.users.length === 0) {
        console.log('      ⚠️  登録ユーザーなし\n')
        continue
      }

      for (let i = 0; i < company.users.length; i++) {
        const user = company.users[i]
        console.log(`   ${i + 1}. ${user.name}`)
        console.log(`      ├─ メールアドレス: ${user.email}`)
        console.log(`      ├─ 電話番号: ${user.phone || '未設定'}`)
        console.log(`      ├─ ロール: ${getRoleLabel(user.role)}`)
        console.log(`      ├─ ステータス: ${getStatusLabel(user.status)}`)
        console.log(`      ├─ メール認証: ${user.emailVerified ? '✅ 認証済み' : '❌ 未認証'}`)
        if (user.verifiedAt) {
          console.log(`      ├─ 認証日時: ${user.verifiedAt.toLocaleString('ja-JP')}`)
        }
        console.log(`      ├─ 営業所: ${user.office?.name || '未配属'}`)
        console.log(`      ├─ 登録日: ${user.createdAt.toLocaleString('ja-JP')}`)
        console.log(`      └─ 更新日: ${user.updatedAt.toLocaleString('ja-JP')}`)
        console.log('')
      }

      console.log('-'.repeat(80) + '\n')
    }

    // サマリー
    const totalUsers = companies.reduce((sum, c) => sum + c._count.users, 0)
    const totalOffices = companies.reduce((sum, c) => sum + c._count.offices, 0)
    
    console.log('=' .repeat(80))
    console.log('📈 全体サマリー')
    console.log('='.repeat(80))
    console.log(`   会社数: ${companies.length}社`)
    console.log(`   総ユーザー数: ${totalUsers}人`)
    console.log(`   総営業所数: ${totalOffices}か所`)
    console.log('=' .repeat(80) + '\n')

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function getRoleLabel(role: string): string {
  const labels: { [key: string]: string } = {
    OWNER: '👑 オーナー',
    ADMIN: '🔧 管理者',
    STAFF: '👤 スタッフ',
  }
  return labels[role] || role
}

function getStatusLabel(status: string): string {
  const labels: { [key: string]: string } = {
    ACTIVE: '✅ アクティブ',
    INACTIVE: '⏸️  非アクティブ',
    SUSPENDED: '🚫 停止中',
  }
  return labels[status] || status
}

checkAccounts()

