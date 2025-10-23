import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawCode = searchParams.get('code')

    if (!rawCode) {
      return NextResponse.json({ valid: false }, { status: 400 })
    }

    // 前後の空白を削除し、大文字に統一
    const code = rawCode.trim().toUpperCase()

    console.log('Validating company code:', { rawCode, normalized: code })

    // まず正規化されたコードで検索
    let company = await prisma.company.findUnique({
      where: { code },
      select: { id: true, name: true, code: true },
    })

    // 見つからない場合は、大文字小文字を無視して検索
    if (!company) {
      const allCompanies = await prisma.company.findMany({
        select: { id: true, name: true, code: true },
      })
      
      company = allCompanies.find(
        c => c.code.trim().toUpperCase() === code
      ) || null
      
      if (company) {
        console.log('Company found with case-insensitive match:', company.code)
      }
    }

    if (company) {
      return NextResponse.json({
        valid: true,
        companyName: company.name,
        companyCode: company.code, // 実際の会社コードも返す
      })
    } else {
      console.log('Company not found for code:', code)
      return NextResponse.json({ valid: false })
    }
  } catch (error) {
    console.error('Validate company code error:', error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'



