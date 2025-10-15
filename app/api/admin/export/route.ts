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
    const type = searchParams.get('type') // 'shifts' | 'reports' | 'members'

    let csv = ''
    let filename = ''

    switch (type) {
      case 'shifts': {
        const shifts = await prisma.shift.findMany({
          where: { companyId: session.user.companyId },
          include: {
            user: { select: { name: true, email: true } },
            office: { select: { name: true } },
            route: { select: { name: true } },
          },
          orderBy: { date: 'desc' },
        })

        csv = '日付,担当者,メール,営業所,ルート,開始時刻,終了時刻,ステータス,備考\n'
        shifts.forEach(shift => {
          csv += `${new Date(shift.date).toLocaleDateString('ja-JP')},`
          csv += `${shift.user.name},`
          csv += `${shift.user.email},`
          csv += `${shift.office.name},`
          csv += `${shift.route?.name || '未設定'},`
          csv += `${new Date(shift.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })},`
          csv += `${new Date(shift.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })},`
          csv += `${shift.status},`
          csv += `${shift.notes || ''}\n`
        })
        filename = `shifts_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'reports': {
        const reports = await prisma.dailyReport.findMany({
          where: { companyId: session.user.companyId },
          include: {
            user: { select: { name: true, email: true } },
            office: { select: { name: true } },
            routeRelation: { select: { name: true } },
            items: {
              include: {
                priceType: true,
              }
            },
          },
          orderBy: { date: 'desc' },
        })

        csv = '日付,担当者,メール,営業所,ルート,開始時刻,終了時刻,休憩(分),実働(分),配送数,ステータス,単価明細,合計金額,備考\n'
        reports.forEach(report => {
          const totalAmount = report.items.reduce((sum, item) => sum + (item.priceType.unitPrice * item.quantity), 0)
          const itemsDetail = report.items.map(item => `${item.priceType.name}×${item.quantity}`).join('; ')
          
          csv += `${new Date(report.date).toLocaleDateString('ja-JP')},`
          csv += `${report.user.name},`
          csv += `${report.user.email},`
          csv += `${report.office.name},`
          csv += `${report.route || report.routeRelation?.name || '未設定'},`
          csv += `${new Date(report.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })},`
          csv += `${new Date(report.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })},`
          csv += `${report.breakMinutes},`
          csv += `${report.workMinutes},`
          csv += `${report.deliveryCount},`
          csv += `${report.status},`
          csv += `${itemsDetail},`
          csv += `${totalAmount},`
          csv += `${report.notes || ''}\n`
        })
        filename = `reports_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      case 'members': {
        const members = await prisma.user.findMany({
          where: { companyId: session.user.companyId },
          include: {
            office: { select: { name: true } },
          },
          orderBy: [{ role: 'asc' }, { name: 'asc' }],
        })

        csv = '名前,メール,電話,役割,ステータス,営業所,登録日\n'
        members.forEach(member => {
          csv += `${member.name},`
          csv += `${member.email},`
          csv += `${member.phone || ''},`
          csv += `${member.role},`
          csv += `${member.status},`
          csv += `${member.office?.name || '未割当'},`
          csv += `${new Date(member.createdAt).toLocaleDateString('ja-JP')}\n`
        })
        filename = `members_${new Date().toISOString().split('T')[0]}.csv`
        break
      }

      default:
        return NextResponse.json({ error: '不正なエクスポートタイプです' }, { status: 400 })
    }

    // CSVをBOMつきで返す（Excel対応）
    const bom = '\uFEFF'
    const csvWithBom = bom + csv

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'エクスポートに失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'



