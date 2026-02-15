import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const extraWork = await db.extraWork.findUnique({
      where: { id: parseInt(id) },
    })

    if (!extraWork) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (extraWork.startTime && !extraWork.endTime) {
      const endTime = new Date()
      const startTime = new Date(extraWork.startTime)
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      const updated = await db.extraWork.update({
        where: { id: parseInt(id) },
        data: { endTime, duration },
      })
      return NextResponse.json(updated)
    } else {
      const updated = await db.extraWork.update({
        where: { id: parseInt(id) },
        data: { startTime: new Date(), endTime: null, duration: null },
      })
      return NextResponse.json(updated)
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.extraWork.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}