import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, name } = body

    if (!telegramId || !name) {
      return NextResponse.json({ error: 'telegramId and name required' }, { status: 400 })
    }

    let worker = await db.worker.findUnique({ where: { telegramId } })
    if (worker) return NextResponse.json(worker)

    worker = await db.worker.create({
      data: { telegramId, name },
    })

    return NextResponse.json(worker)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}