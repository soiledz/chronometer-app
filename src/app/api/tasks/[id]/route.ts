import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const task = await db.task.findUnique({
      where: { id: parseInt(id) },
      include: { stages: true, extraWorks: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const endTime = new Date()
    const startTime = new Date(task.startTime)
    const totalDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    let totalEfficiency = 0
    let efficiencyCount = 0

    for (const stage of task.stages) {
      if (stage.efficiency !== null) {
        totalEfficiency += stage.efficiency
        efficiencyCount++
      }
    }

    const overallEfficiency = efficiencyCount > 0 ? totalEfficiency / efficiencyCount : null

    const updated = await db.task.update({
      where: { id: parseInt(id) },
      data: { endTime, totalDuration },
      include: { stages: true, extraWorks: true },
    })

    return NextResponse.json({ ...updated, overallEfficiency })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}