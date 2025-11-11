import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // 'month' | 'week' | 'all'

    // 期間設定
    let startDate = new Date()
    if (period === 'month') {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    } else if (period === 'week') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
    } else {
      startDate = new Date(0) // 全期間
    }

    // 承認済み日報から売上を計算
    const reports = await prisma.dailyReport.findMany({
      where: {
        companyId: session.user.companyId,
        status: 'APPROVED',
        date: { gte: startDate },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        office: {
          select: {
            id: true,
            name: true,
          }
        },
        items: {
          include: {
            priceType: true,
          }
        },
      },
    })

    // 総売上計算
    let totalSales = 0
    const userSales: Record<string, { name: string; amount: number; count: number }> = {}
    const officeSales: Record<string, { name: string; amount: number; count: number }> = {}

    reports.forEach(report => {
      const reportAmount = report.items.reduce((sum, item) => {
        return sum + (item.priceType.unitPrice * item.quantity)
      }, 0)

      totalSales += reportAmount

      // 個人売上集計
      if (!userSales[report.user.id]) {
        userSales[report.user.id] = {
          name: report.user.name,
          amount: 0,
          count: 0,
        }
      }
      userSales[report.user.id].amount += reportAmount
      userSales[report.user.id].count += 1

      // 営業所売上集計
      if (report.office) {
        if (!officeSales[report.office.id]) {
          officeSales[report.office.id] = {
            name: report.office.name,
            amount: 0,
            count: 0,
          }
        }
        officeSales[report.office.id].amount += reportAmount
        officeSales[report.office.id].count += 1
      }
    })

    // 配列に変換してソート
    const userSalesArray = Object.values(userSales).sort((a, b) => b.amount - a.amount)
    const officeSalesArray = Object.values(officeSales).sort((a, b) => b.amount - a.amount)

    return NextResponse.json({
      totalSales,
      totalReports: reports.length,
      userSales: userSalesArray,
      officeSales: officeSalesArray,
      period,
    })
  } catch (error) {
    console.error('Get sales stats error:', error)
    return NextResponse.json(
      { error: '売上統計の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'





