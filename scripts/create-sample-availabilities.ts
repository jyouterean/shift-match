import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('サンプル希望提出を作成中...')

  // STAFF権限のユーザーを取得
  const users = await prisma.user.findMany({
    where: {
      role: 'STAFF',
      status: 'ACTIVE',
    },
    take: 10, // 最大10名
  })

  if (users.length === 0) {
    console.log('STAFFユーザーが見つかりません。')
    return
  }

  console.log(`${users.length}名のスタッフが見つかりました`)

  // 今日から10日間の希望を作成
  const today = new Date()
  const availabilities = []

  for (let i = 0; i < 10; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    
    // 各ユーザーがランダムに希望提出（70%の確率）
    for (const user of users) {
      if (Math.random() < 0.7) {
        availabilities.push({
          userId: user.id,
          date: date,
          status: 'AVAILABLE' as const,
          notes: i % 3 === 0 ? '希望します' : null,
        })
      }
    }
  }

  console.log(`${availabilities.length}件の希望提出を作成します...`)

  // 一括作成（upsert）
  let created = 0
  for (const avail of availabilities) {
    await prisma.shiftAvailability.upsert({
      where: {
        userId_date: {
          userId: avail.userId,
          date: avail.date,
        },
      },
      update: avail,
      create: avail,
    })
    created++
  }

  console.log(`✓ ${created}件の希望提出を作成しました`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

