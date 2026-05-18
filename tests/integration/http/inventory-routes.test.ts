import { describe, expect, it, vi } from 'vitest'
import createHandler from '../../../server/api/inventory/index.post'
import patchHandler from '../../../server/api/inventory/[id].patch'
import fromScanHandler from '../../../server/api/inventory/from-scan.post'
import consumeByBarcodeHandler from '../../../server/api/inventory/consume-by-barcode.post'
import { InsufficientQuantityError } from '../../../server/contexts/inventory/domain/errors/insufficient-quantity.error'
import { ItemNotFoundError } from '../../../server/contexts/inventory/domain/errors/item-not-found.error'
import { LocationConflictError } from '../../../server/contexts/inventory/domain/errors/location-conflict.error'
import { ProductNotFoundError } from '../../../server/contexts/inventory/domain/errors/product-not-found.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com' } }
const HH = 'hh-1'
const INGR = '00000000-0000-4000-8000-000000000001'
const PROD = '00000000-0000-4000-8000-000000000002'
const ITEM = '00000000-0000-4000-8000-000000000003'

interface StubUseCase { execute: ReturnType<typeof vi.fn> }

function buildContainer(overrides: Partial<Record<string, StubUseCase>> = {}) {
  return {
    getCurrentHousehold: { execute: vi.fn().mockResolvedValue({ id: HH, name: 'Famille', inviteCode: 'X', memberCount: 1 }) },
    addInventoryItem: { execute: vi.fn() },
    updateInventoryItem: { execute: vi.fn() },
    addInventoryItemFromProductScan: { execute: vi.fn() },
    consumeInventoryItemByBarcode: { execute: vi.fn() },
    ...overrides,
  }
}

function viewStub() {
  return {
    id: ITEM,
    ingredientId: INGR,
    name: 'Pâtes',
    category: 'grocery',
    quantity: { value: 500, unit: 'g' },
    location: 'pantry',
    updatedAt: '2026-05-15T10:00:00.000Z',
  }
}

describe('POST /api/inventory (upsert)', () => {
  it('returns 201 + created:true on first insert', async () => {
    const container = buildContainer()
    container.addInventoryItem.execute.mockResolvedValue({ item: viewStub(), created: true })
    const event = makeEvent({
      session,
      container,
      body: { ingredientId: INGR, quantity: { value: 500, unit: 'g' } },
    })

    const result = await (createHandler as any)(event)

    expect(result).toEqual({ item: viewStub(), created: true })
    expect(event._status).toBe(201)
  })

  it('returns 200 + created:false when incrementing an existing line', async () => {
    const container = buildContainer()
    container.addInventoryItem.execute.mockResolvedValue({
      item: { ...viewStub(), quantity: { value: 1000, unit: 'g' } },
      created: false,
    })
    const event = makeEvent({
      session,
      container,
      body: { ingredientId: INGR, quantity: { value: 500, unit: 'g' } },
    })

    const result = await (createHandler as any)(event)

    expect(result.created).toBe(false)
    expect(event._status).toBe(200)
  })
})

describe('PATCH /api/inventory/[id]', () => {
  it('returns 409 on location conflict', async () => {
    const container = buildContainer()
    container.updateInventoryItem.execute.mockRejectedValue(
      new LocationConflictError('other-line-id', INGR, 'fridge'),
    )
    const event = makeEvent({
      session,
      container,
      params: { id: ITEM },
      body: { location: 'fridge' },
    })

    await expect((patchHandler as any)(event)).rejects.toMatchObject({
      statusCode: 409,
      data: { error: 'location-conflict', conflictingLineId: 'other-line-id' },
    })
  })

  it('returns 404 when item not found', async () => {
    const container = buildContainer()
    container.updateInventoryItem.execute.mockRejectedValue(new ItemNotFoundError(ITEM))
    const event = makeEvent({
      session,
      container,
      params: { id: ITEM },
      body: { location: 'fridge' },
    })

    await expect((patchHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('POST /api/inventory/from-scan', () => {
  it('returns 201 + created:true when a new line is created', async () => {
    const container = buildContainer()
    container.addInventoryItemFromProductScan.execute.mockResolvedValue({ item: viewStub(), created: true })
    const event = makeEvent({
      session,
      container,
      body: { productId: PROD, quantity: { value: 500, unit: 'g' } },
    })

    const result = await (fromScanHandler as any)(event)

    expect(result.created).toBe(true)
    expect(event._status).toBe(201)
  })

  it('returns 200 + created:false when an existing line is incremented', async () => {
    const container = buildContainer()
    container.addInventoryItemFromProductScan.execute.mockResolvedValue({
      item: { ...viewStub(), quantity: { value: 1000, unit: 'g' } },
      created: false,
    })
    const event = makeEvent({
      session,
      container,
      body: { productId: PROD, quantity: { value: 500, unit: 'g' } },
    })

    await (fromScanHandler as any)(event)

    expect(event._status).toBe(200)
  })

  it('returns 404 on unknown product', async () => {
    const container = buildContainer()
    container.addInventoryItemFromProductScan.execute.mockRejectedValue(new ProductNotFoundError(PROD))
    const event = makeEvent({
      session,
      container,
      body: { productId: PROD, quantity: { value: 500, unit: 'g' } },
    })

    await expect((fromScanHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 400 on invalid payload', async () => {
    const container = buildContainer()
    const event = makeEvent({ session, container, body: { productId: 'not-a-uuid' } })
    await expect((fromScanHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('POST /api/inventory/consume-by-barcode', () => {
  const validBody = { barcode: '3038359002564', quantity: { value: 200, unit: 'g' } }

  it('returns the impacted lines in normal mode', async () => {
    const container = buildContainer()
    container.consumeInventoryItemByBarcode.execute.mockResolvedValue({
      mode: 'normal',
      impactedLines: [{
        lineId: ITEM,
        location: 'pantry',
        quantityRemoved: { value: 200, unit: 'g' },
        remainingQuantity: { value: 300, unit: 'g' },
        deleted: false,
      }],
    })
    const event = makeEvent({ session, container, body: validBody })

    const result = await (consumeByBarcodeHandler as any)(event)

    expect(result.impactedLines).toHaveLength(1)
    expect(result.impactedLines[0].quantityRemoved).toEqual({ value: 200, unit: 'g' })
  })

  it('returns the candidate plan in preview mode', async () => {
    const container = buildContainer()
    container.consumeInventoryItemByBarcode.execute.mockResolvedValue({
      mode: 'preview',
      candidates: [{
        lineId: ITEM,
        location: 'pantry',
        currentQuantity: { value: 500, unit: 'g' },
        wouldRemove: { value: 200, unit: 'g' },
      }],
      totalAvailable: { value: 500, unit: 'g' },
      fullyConsumed: false,
    })
    const event = makeEvent({ session, container, body: { ...validBody, preview: true } })

    const result = await (consumeByBarcodeHandler as any)(event)

    expect(result.candidates).toHaveLength(1)
    expect(result.totalAvailable).toEqual({ value: 500, unit: 'g' })
  })

  it('returns 400 with structured payload on insufficient quantity', async () => {
    const container = buildContainer()
    container.consumeInventoryItemByBarcode.execute.mockRejectedValue(
      new InsufficientQuantityError(500, 200, 'g'),
    )
    const event = makeEvent({ session, container, body: validBody })

    await expect((consumeByBarcodeHandler as any)(event)).rejects.toMatchObject({
      statusCode: 400,
      data: { error: 'insufficient-quantity', requested: 500, available: 200, unit: 'g' },
    })
  })

  it('returns 404 on unknown barcode', async () => {
    const container = buildContainer()
    container.consumeInventoryItemByBarcode.execute.mockRejectedValue(new ItemNotFoundError(validBody.barcode))
    const event = makeEvent({ session, container, body: validBody })

    await expect((consumeByBarcodeHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 400 on invalid barcode shape in body', async () => {
    const container = buildContainer()
    const event = makeEvent({ session, container, body: { barcode: 'abc', quantity: { value: 1, unit: 'g' } } })

    await expect((consumeByBarcodeHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})
