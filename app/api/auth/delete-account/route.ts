import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーを削除（Cascadeで関連データも削除される）
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({ 
      success: true,
      message: 'アカウントを削除しました' 
    })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'アカウント削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

