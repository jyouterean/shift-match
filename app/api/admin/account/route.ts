import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // オーナーのみアカウント削除可能
    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: '権限がありません。オーナーのみアカウントを削除できます。' }, { status: 403 })
    }

    // 会社IDを取得
    const companyId = session.user.companyId

    // 会社を削除（カスケード削除により関連データも削除される）
    await prisma.company.delete({
      where: { id: companyId },
    })

    return NextResponse.json({ 
      success: true,
      message: 'アカウントを削除しました'
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'アカウント削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

