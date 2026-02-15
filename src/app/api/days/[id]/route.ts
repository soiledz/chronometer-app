import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const day = await db.day.findUnique({
      where: { id: parseInt(id) },
      include: { tasks: { include: { stages: true } } },
    })

    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 })
    }

    const endTime = new Date()
    const startTime = day.startTime ? new Date(day.startTime) : endTime
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    let totalEfficiency = 0
    let efficiencyCount = 0

    for (const task of day.tasks) {
      for (const stage of task.stages) {
        if (stage.efficiency !== null) {
          totalEfficiency += stage.efficiency
          efficiencyCount++
        }
      }
    }

    const efficiency = efficiencyCount > 0 ? totalEfficiency / efficiencyCount : null

    const updated = await db.day.update({
      where: { id: parseInt(id) },
      data: {
        type: 'COMPLETED',
        endTime,
        duration,
        efficiency,
      },
      include: { tasks: { include: { stages: true, extraWorks: true } } },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}