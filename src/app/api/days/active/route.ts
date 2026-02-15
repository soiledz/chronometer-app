import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workerId = searchParams.get('workerId')

    if (!workerId) {
      return NextResponse.json({ error: 'workerId required' }, { status: 400 })
    }

    const activeDay = await db.day.findFirst({
      where: {
        workerId: parseInt(workerId),
        type: 'WORKING',
      },
      include: {
        tasks: {
          include: { stages: true, extraWorks: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!activeDay) return NextResponse.json(null)

    const activeTask = activeDay.tasks.find(t => !t.endTime)

    return NextResponse.json({ ...activeDay, activeTask })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}