import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workerId = searchParams.get('workerId')
    const month = searchParams.get('month')

    if (!workerId) {
      return NextResponse.json({ error: 'workerId required' }, { status: 400 })
    }

    let startDate: Date
    let endDate: Date

    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      startDate = new Date(year, monthNum - 1, 1)
      endDate = new Date(year, monthNum, 0, 23, 59, 59)
    } else {
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }

    const days = await db.day.findMany({
      where: {
        workerId: parseInt(workerId),
        date: { gte: startDate, lte: endDate },
      },
      include: {
        tasks: { include: { stages: true, extraWorks: true } },
      },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(days)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workerId, date, type } = body

    if (!workerId || !date) {
      return NextResponse.json({ error: 'workerId and date required' }, { status: 400 })
    }

    const dayDate = new Date(date)
    dayDate.setHours(0, 0, 0, 0)

    const existing = await db.day.findFirst({
      where: { workerId: parseInt(workerId), date: dayDate },
    })

    if (existing) {
      return NextResponse.json({ error: 'Day exists', day: existing }, { status: 400 })
    }

    const day = await db.day.create({
      data: {
        workerId: parseInt(workerId),
        date: dayDate,
        type: type || 'WORKING',
        startTime: type === 'WORKING' ? new Date() : null,
      },
      include: { tasks: true },
    })

    return NextResponse.json(day)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}