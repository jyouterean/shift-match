import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ja } from 'date-fns/locale'

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
    const yearMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM')

    const [year, month] = yearMonth.split('-').map(Number)
    const targetDate = new Date(year, month - 1, 1)
    const start = startOfMonth(targetDate)
    const end = endOfMonth(targetDate)
    const days = eachDayOfInterval({ start, end })

    // 全メンバーを取得
    const users = await prisma.user.findMany({
      where: {
        companyId: session.user.companyId,
        role: 'STAFF',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        office: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // 該当月のシフトを取得
    const shifts = await prisma.shift.findMany({
      where: {
        companyId: session.user.companyId,
        date: {
          gte: start,
          lte: end,
        },
        status: 'CONFIRMED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        office: {
          select: {
            name: true,
          },
        },
      },
    })

    // ユーザーごとのシフトマップを作成
    const shiftMap: { [userId: string]: { [date: string]: { office: string; startTime: string; endTime: string } } } = {}

    shifts.forEach((shift) => {
      if (!shiftMap[shift.userId]) {
        shiftMap[shift.userId] = {}
      }
      const dateStr = format(shift.date, 'yyyy-MM-dd')
      shiftMap[shift.userId][dateStr] = {
        office: shift.office?.name || '-',
        startTime: shift.startTime || '-',
        endTime: shift.endTime || '-',
      }
    })

    // CSV形式でデータを生成
    const csvLines: string[] = []

    // ヘッダー行1: 月
    csvLines.push(`"${format(targetDate, 'yyyy年M月', { locale: ja })} シフト表"`)

    // ヘッダー行2: 列名
    const headerRow = ['氏名', '営業所', ...days.map(d => format(d, 'M/d(E)', { locale: ja }))]
    csvLines.push(headerRow.map(h => `"${h}"`).join(','))

    // データ行: 各メンバー
    users.forEach((user) => {
      const row = [
        user.name,
        user.office?.name || '未配属',
        ...days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const shift = shiftMap[user.id]?.[dateStr]
          if (shift) {
            return `${shift.office} ${shift.startTime}-${shift.endTime}`
          }
          return ''
        }),
      ]
      csvLines.push(row.map(cell => `"${cell}"`).join(','))
    })

    // 空行
    csvLines.push('')

    // 営業所別の集計
    csvLines.push(`"営業所別集計"`)

    const offices = await prisma.office.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true },
    })

    offices.forEach((office) => {
      const officeRow = [
        office.name,
        '',
        ...days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const count = shifts.filter(
            s => s.officeId === office.id && format(s.date, 'yyyy-MM-dd') === dateStr
          ).length
          return count > 0 ? count.toString() : ''
        }),
      ]
      csvLines.push(officeRow.map(cell => `"${cell}"`).join(','))
    })

    const csv = csvLines.join('\n')

    // BOM付きUTF-8で返す（Excelで正しく開ける）
    const bom = '\uFEFF'
    const csvWithBom = bom + csv

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="shift_${yearMonth}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export shift error:', error)
    return NextResponse.json(
      { error: 'シフト表のエクスポートに失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

