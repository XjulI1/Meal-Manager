import { beforeEach, describe, expect, it } from 'vitest'
import { CreateWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/create-wine.use-case'
import { UpdateWineUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/update-wine.use-case'
import { FakeLabelPhotoStorage } from './in-memory/fake-label-photo-storage'
import { InMemoryBottleRepository } from './in-memory/in-memory-bottle.repository'
import { InMemoryWineRepository } from './in-memory/in-memory-wine.repository'

const HH = 'hh-1'
const now = () => new Date('2026-07-13T10:00:00Z')

describe('wine creation/update with a label photo', () => {
  let wines: InMemoryWineRepository
  let bottles: InMemoryBottleRepository
  let storage: FakeLabelPhotoStorage
  let createWine: CreateWineUseCase
  let updateWine: UpdateWineUseCase
  let n: number

  beforeEach(() => {
    wines = new InMemoryWineRepository()
    bottles = new InMemoryBottleRepository()
    storage = new FakeLabelPhotoStorage()
    n = 0
    const ids = () => `id-${++n}`
    createWine = new CreateWineUseCase(wines, storage, ids, now)
    updateWine = new UpdateWineUseCase(wines, bottles, storage, now)
  })

  it('persists an uploaded label photo and sets photoUrl to the served URL', async () => {
    const wine = await createWine.execute({
      householdId: HH,
      name: 'Saint-Amour',
      color: 'rouge',
      labelPhoto: { mediaType: 'image/jpeg', data: 'AAAA' },
    })

    expect(storage.stored).toHaveLength(1)
    expect(storage.stored[0]).toMatchObject({ householdId: HH, mediaType: 'image/jpeg', data: 'AAAA' })
    expect(wine.photoUrl).toBe(`/api/cave/label-photos/${HH}/photo-0.jpg`)
  })

  it('does not touch storage when no label photo is provided', async () => {
    const wine = await createWine.execute({ householdId: HH, name: 'Chablis', color: 'blanc' })
    expect(storage.stored).toHaveLength(0)
    expect(wine.photoUrl).toBeNull()
  })

  it('replaces photoUrl when a new label photo is uploaded on update', async () => {
    const created = await createWine.execute({ householdId: HH, name: 'Saint-Amour', color: 'rouge' })
    const updated = await updateWine.execute({
      householdId: HH,
      id: created.id,
      labelPhoto: { mediaType: 'image/png', data: 'BBBB' },
    })
    expect(storage.stored).toHaveLength(1)
    expect(updated.photoUrl).toBe(`/api/cave/label-photos/${HH}/photo-0.jpg`)
  })
})
