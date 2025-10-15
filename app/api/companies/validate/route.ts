import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ valid: false }, { status: 400 })
    }

    const company = await prisma.company.findUnique({
      where: { code },
      select: { id: true, name: true },
    })

    if (company) {
      return NextResponse.json({
        valid: true,
        companyName: company.name,
      })
    } else {
      return NextResponse.json({ valid: false })
    }
  } catch (error) {
    console.error('Validate company code error:', error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'



