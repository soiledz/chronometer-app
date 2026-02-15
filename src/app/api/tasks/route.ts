import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workerId = searchParams.get('workerId')

    if (!workerId) {
      return NextResponse.json({ error: 'workerId required' }, { status: 400 })
    }

    const tasks = await db.task.findMany({
      where: {
        workerId: parseInt(workerId),
        endTime: { not: null },
      },
      include: { stages: true, extraWorks: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskNumber, workerId, dayId } = body

    if (!taskNumber || !workerId) {
      return NextResponse.json({ error: 'taskNumber and workerId required' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        taskNumber,
        workerId: parseInt(workerId),
        dayId: dayId ? parseInt(dayId) : null,
        startTime: new Date(),
      },
      include: { stages: true, extraWorks: true },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}