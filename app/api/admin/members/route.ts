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

    const users = await prisma.user.findMany({
      where: {
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        office: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ members: users })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json(
      { error: 'メンバーの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, email, phone, role, status, officeId } = body

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 })
    }

    // 自分のOWNERアカウントは変更できない
    if (id === session.user.id && session.user.role === 'OWNER') {
      return NextResponse.json({ error: 'オーナーアカウントは変更できません' }, { status: 403 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        role,
        status,
        officeId: officeId || null,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json(
      { error: 'メンバーの更新に失敗しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'IDは必須です' }, { status: 400 })
    }

    // 自分のアカウントは削除できない
    if (id === session.user.id) {
      return NextResponse.json({ error: '自分のアカウントは削除できません' }, { status: 403 })
    }

    // OWNERは削除できない
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    })

    if (targetUser?.role === 'OWNER') {
      return NextResponse.json({ error: 'オーナーアカウントは削除できません' }, { status: 403 })
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'メンバーを削除しました' })
  } catch (error) {
    console.error('Delete member error:', error)
    return NextResponse.json(
      { error: 'メンバーの削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
