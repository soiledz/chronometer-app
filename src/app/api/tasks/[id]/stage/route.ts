import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { stageType, units } = body

    if (!stageType) {
      return NextResponse.json({ error: 'stageType required' }, { status: 400 })
    }

    console.log('Toggle stage:', { taskId: id, stageType, units })

    // Найти существующий этап
    const existing = await db.stage.findFirst({
      where: { 
        taskId: parseInt(id), 
        stageType: stageType as any 
      },
    })

    console.log('Existing stage:', existing)

    if (existing) {
      // Если этап уже начат (есть startTime, нет endTime) - завершаем
      if (existing.startTime && !existing.endTime) {
        const endTime = new Date()
        const startTime = new Date(existing.startTime)
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

        console.log('Completing stage:', { duration })

        // Получаем норму для расчёта эффективности
        const norm = await db.norm.findUnique({ 
          where: { stageType: stageType as any } 
        })

        let efficiency: number | null = null
        if (norm && duration > 0) {
          if (stageType === 'PRINTING' && units && units > 0) {
            // Для печати: эффективность = (оттиски/час) / норма × 100
            const hours = duration / 3600
            const actualUnitsPerHour = units / hours
            efficiency = (actualUnitsPerHour / norm.unitsPerHour) * 100
          } else {
            // Для других этапов: эффективность = норма_время / факт_время × 100
            const normTimeSeconds = 3600 / norm.unitsPerHour
            efficiency = (normTimeSeconds / duration) * 100
          }
        }

        console.log('Efficiency:', efficiency)

        const updated = await db.stage.update({
          where: { id: existing.id },
          data: { 
            endTime, 
            duration, 
            units: units || existing.units, 
            efficiency 
          },
        })

        console.log('Stage completed:', updated)
        return NextResponse.json(updated)
      } else {
        // Если этап завершён - перезапускаем
        console.log('Restarting stage')
        const updated = await db.stage.update({
          where: { id: existing.id },
          data: { 
            startTime: new Date(), 
            endTime: null, 
            duration: null, 
            efficiency: null 
          },
        })
        return NextResponse.json(updated)
      }
    } else {
      // Создаём новый этап
      console.log('Creating new stage')
      const newStage = await db.stage.create({
        data: {
          taskId: parseInt(id),
          stageType: stageType as any,
          startTime: new Date(),
          units: units || null,
        },
      })
      console.log('New stage created:', newStage)
      return NextResponse.json(newStage)
    }
  } catch (error) {
    console.error('Error toggling stage:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}