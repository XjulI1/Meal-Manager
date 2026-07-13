import { describe, expect, it, vi } from 'vitest'
import createCellarHandler from '../../../server/api/cave/cellars/index.post'
import placeBottleHandler from '../../../server/api/cave/bottles/[id]/position.patch'
import importHandler from '../../../server/api/cave/import.post'
import { SlotOccupiedError } from '../../../server/contexts/wine-cellar/domain/errors/slot-occupied.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com' } }
const HH = 'hh-1'
const ROW = '00000000-0000-4000-8000-0000000000aa'
const BOTTLE = '00000000-0000-4000-8000-0000000000bb'

function buildContainer(overrides: Record<string, { execute: ReturnType<typeof vi.fn> }> = {}) {
  return {
    getCurrentHousehold: { execute: vi.fn().mockResolvedValue({ id: HH, name: 'Foyer', inviteCode: 'X', memberCount: 1 }) },
    createCellar: { execute: vi.fn() },
    placeBottle: { execute: vi.fn() },
    importVinotag: { execute: vi.fn() },
    ...overrides,
  }
}

describe('POST /api/cave/cellars', () => {
  it('returns 201 with the created cellar', async () => {
    const container = buildContainer()
    container.createCellar.execute.mockResolvedValue({ id: 'c1', name: 'Cave J.R', shelfCount: 0, bottleCount: 0 })
    const event = makeEvent({ session, container, body: { name: 'Cave J.R' } })

    const result = await (createCellarHandler as any)(event)

    expect(result).toMatchObject({ name: 'Cave J.R' })
    expect(event._status).toBe(201)
  })

  it('returns 400 on an empty name', async () => {
    const container = buildContainer()
    const event = makeEvent({ session, container, body: { name: '' } })
    await expect((createCellarHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('PATCH /api/cave/bottles/[id]/position', () => {
  it('returns 409 when the slot is occupied', async () => {
    const container = buildContainer()
    container.placeBottle.execute.mockRejectedValue(new SlotOccupiedError(ROW, 'back', 2))
    const event = makeEvent({
      session,
      container,
      params: { id: BOTTLE },
      body: { position: { rowId: ROW, depth: 'back', index: 2 } },
    })

    await expect((placeBottleHandler as any)(event)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('POST /api/cave/import', () => {
  it('returns the import report', async () => {
    const container = buildContainer()
    container.importVinotag.execute.mockResolvedValue({ winesCreated: 2, bottlesCreated: 6, skippedRows: [] })
    const event = makeEvent({
      session,
      container,
      body: { fileBase64: Buffer.from('x').toString('base64'), filename: 'cave.xlsx' },
    })

    const result = await (importHandler as any)(event)

    expect(result).toEqual({ winesCreated: 2, bottlesCreated: 6, skippedRows: [] })
  })

  it('returns 400 for a non-xlsx filename', async () => {
    const container = buildContainer()
    const event = makeEvent({
      session,
      container,
      body: { fileBase64: 'abc', filename: 'cave.csv' },
    })
    await expect((importHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})
