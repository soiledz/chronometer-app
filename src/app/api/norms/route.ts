import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const norms = await db.norm.findMany({ orderBy: { stageType: 'asc' } })
    return NextResponse.json(norms)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { norms } = body

    if (!Array.isArray(norms)) {
      return NextResponse.json({ error: 'norms must be array' }, { status: 400 })
    }

    for (const norm of norms) {
      if (norm.stageType && norm.unitsPerHour !== undefined && norm.unitName) {
        await db.norm.update({
          where: { stageType: norm.stageType },
          data: {
            unitsPerHour: parseFloat(norm.unitsPerHour),
            unitName: norm.unitName,
          },
        })
      }
    }

    const updated = await db.norm.findMany()
    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}