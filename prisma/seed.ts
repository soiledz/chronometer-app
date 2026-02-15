import { PrismaClient, StageType } from '@prisma/client'

const prisma = new PrismaClient()

const defaultNorms = [
  { stageType: StageType.PREPARATION, unitsPerHour: 4, unitName: 'форма' },
  { stageType: StageType.EXPOSURE, unitsPerHour: 8, unitName: 'форма' },
  { stageType: StageType.SETUP, unitsPerHour: 2, unitName: 'настройка' },
  { stageType: StageType.PRINTING, unitsPerHour: 60, unitName: 'оттисков' },
  { stageType: StageType.WASHING, unitsPerHour: 6, unitName: 'форма' },
]

async function main() {
  console.log('Seeding norms...')
  for (const norm of defaultNorms) {
    await prisma.norm.upsert({
      where: { stageType: norm.stageType },
      update: norm,
      create: norm,
    })
  }
  console.log('Done!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })