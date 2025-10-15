import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('サンプル必要人数設定を作成中...')

  // 全営業所を取得
  const offices = await prisma.office.findMany()

  if (offices.length === 0) {
    console.log('営業所が見つかりません。先に営業所を作成してください。')
    return
  }

  // 今日から30日間の必要人数を設定
  const today = new Date()
  const requirements = []

  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    
    // 週末は少なめ、平日は多めに設定
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    for (const office of offices) {
      requirements.push({
        officeId: office.id,
        date: date,
        requiredCount: isWeekend ? 1 : 3, // 週末1名、平日3名
        startTime: '18:00',
        endTime: '03:00',
        notes: 'サンプルデータ',
      })
    }
  }

  // 一括作成（upsert）
  let created = 0
  for (const req of requirements) {
    await prisma.officeRequirement.upsert({
      where: {
        officeId_date: {
          officeId: req.officeId,
          date: req.date,
        },
      },
      update: req,
      create: req,
    })
    created++
  }

  console.log(`✓ ${created}件の必要人数設定を作成しました`)
  console.log(`営業所数: ${offices.length}`)
  console.log(`期間: ${requirements[0].date.toLocaleDateString('ja-JP')} 〜 ${requirements[requirements.length - 1].date.toLocaleDateString('ja-JP')}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

