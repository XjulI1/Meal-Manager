import { beforeEach, describe, expect, it, vi } from 'vitest'
import listHandler from '../../../server/api/ingredients/index.get'
import createHandler from '../../../server/api/ingredients/index.post'
import getHandler from '../../../server/api/ingredients/[id].get'
import patchHandler from '../../../server/api/ingredients/[id].patch'
import deleteHandler from '../../../server/api/ingredients/[id].delete'
import addProductHandler from '../../../server/api/ingredients/[id]/products.post'
import getProductHandler from '../../../server/api/products/[id].get'
import patchProductHandler from '../../../server/api/products/[id].patch'
import deleteProductHandler from '../../../server/api/products/[id].delete'
import resolveBarcodeHandler from '../../../server/api/barcodes/[code].get'
import { CanonicalUnitLockedError } from '../../../server/contexts/ingredients/domain/errors/canonical-unit-locked.error'
import { DuplicateBarcodeError } from '../../../server/contexts/ingredients/domain/errors/duplicate-barcode.error'
import { DuplicateIngredientNameError } from '../../../server/contexts/ingredients/domain/errors/duplicate-ingredient-name.error'
import { IngredientNotFoundError } from '../../../server/contexts/ingredients/domain/errors/ingredient-not-found.error'
import { ProductNotFoundError } from '../../../server/contexts/ingredients/domain/errors/product-not-found.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com' } }
const HH = 'hh-1'

interface StubUseCase { execute: ReturnType<typeof vi.fn> }

function buildContainer(overrides: Partial<Record<string, StubUseCase>> = {}) {
  return {
    getCurrentHousehold: { execute: vi.fn().mockResolvedValue({ id: HH, name: 'Famille', inviteCode: 'X', memberCount: 1 }) },
    listIngredients: { execute: vi.fn() },
    createIngredient: { execute: vi.fn() },
    getIngredient: { execute: vi.fn() },
    updateIngredient: { execute: vi.fn() },
    deleteIngredient: { execute: vi.fn() },
    addProduct: { execute: vi.fn() },
    getProduct: { execute: vi.fn() },
    updateProduct: { execute: vi.fn() },
    removeProduct: { execute: vi.fn() },
    resolveByBarcode: { execute: vi.fn() },
    ...overrides,
  }
}

describe('GET /api/ingredients', () => {
  it('returns the list', async () => {
    const container = buildContainer()
    container.listIngredients.execute.mockResolvedValue([{ id: 'ing-1', name: 'Tomate' }])
    const event = makeEvent({ session, container, query: {} })
    const result = await (listHandler as any)(event)
    expect(result).toEqual([{ id: 'ing-1', name: 'Tomate' }])
  })

  it('returns 401 when no session', async () => {
    const event = makeEvent({ container: buildContainer(), query: {} })
    await expect((listHandler as any)(event)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('returns 400 on invalid query', async () => {
    const event = makeEvent({ session, container: buildContainer(), query: { category: 'invalid' } })
    await expect((listHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('POST /api/ingredients', () => {
  const validBody = {
    name: 'Tomate',
    storage: 'fridge',
    category: 'produce',
    canonicalUnit: 'g',
  }

  it('returns 201 with the created ingredient', async () => {
    const container = buildContainer()
    container.createIngredient.execute.mockResolvedValue({ id: 'ing-1', name: 'Tomate' })
    const event = makeEvent({ session, container, body: validBody })
    const result = await (createHandler as any)(event)
    expect(result).toEqual({ id: 'ing-1', name: 'Tomate' })
    expect(event._status).toBe(201)
  })

  it('returns 400 on invalid payload', async () => {
    const container = buildContainer()
    const event = makeEvent({ session, container, body: { name: '' } })
    await expect((createHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 409 on duplicate name', async () => {
    const container = buildContainer()
    container.createIngredient.execute.mockRejectedValue(new DuplicateIngredientNameError('Tomate'))
    const event = makeEvent({ session, container, body: validBody })
    await expect((createHandler as any)(event)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('GET /api/ingredients/[id]', () => {
  it('returns the ingredient with products', async () => {
    const container = buildContainer()
    container.getIngredient.execute.mockResolvedValue({ id: 'ing-1', name: 'Tomate', products: [] })
    const event = makeEvent({ session, container, params: { id: 'ing-1' } })
    const result = await (getHandler as any)(event)
    expect(result.id).toBe('ing-1')
  })

  it('returns 404 when missing', async () => {
    const container = buildContainer()
    container.getIngredient.execute.mockRejectedValue(new IngredientNotFoundError('x'))
    const event = makeEvent({ session, container, params: { id: 'x' } })
    await expect((getHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('PATCH /api/ingredients/[id]', () => {
  it('updates the ingredient', async () => {
    const container = buildContainer()
    container.updateIngredient.execute.mockResolvedValue({ id: 'ing-1', name: 'New' })
    const event = makeEvent({ session, container, params: { id: 'ing-1' }, body: { name: 'New' } })
    const result = await (patchHandler as any)(event)
    expect(result.name).toBe('New')
  })

  it('returns 409 when canonicalUnit is locked', async () => {
    const container = buildContainer()
    container.updateIngredient.execute.mockRejectedValue(new CanonicalUnitLockedError('ing-1'))
    const event = makeEvent({ session, container, params: { id: 'ing-1' }, body: { canonicalUnit: 'ml' } })
    await expect((patchHandler as any)(event)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('returns 404 when not found', async () => {
    const container = buildContainer()
    container.updateIngredient.execute.mockRejectedValue(new IngredientNotFoundError('x'))
    const event = makeEvent({ session, container, params: { id: 'x' }, body: { name: 'New' } })
    await expect((patchHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('DELETE /api/ingredients/[id]', () => {
  it('returns 204 on success', async () => {
    const container = buildContainer()
    container.deleteIngredient.execute.mockResolvedValue({ mode: 'hard' })
    const event = makeEvent({ session, container, params: { id: 'ing-1' } })
    const result = await (deleteHandler as any)(event)
    expect(result).toBeNull()
    expect(event._status).toBe(204)
  })

  it('returns 404 when missing', async () => {
    const container = buildContainer()
    container.deleteIngredient.execute.mockRejectedValue(new IngredientNotFoundError('x'))
    const event = makeEvent({ session, container, params: { id: 'x' } })
    await expect((deleteHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('POST /api/ingredients/[id]/products', () => {
  const validBody = { packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] }

  it('returns 201 with the product', async () => {
    const container = buildContainer()
    container.addProduct.execute.mockResolvedValue({ id: 'prod-1', barcodes: ['3038359002564'] })
    const event = makeEvent({ session, container, params: { id: 'ing-1' }, body: validBody })
    const result = await (addProductHandler as any)(event)
    expect(result.id).toBe('prod-1')
    expect(event._status).toBe(201)
  })

  it('returns 404 when the ingredient is missing', async () => {
    const container = buildContainer()
    container.addProduct.execute.mockRejectedValue(new IngredientNotFoundError('x'))
    const event = makeEvent({ session, container, params: { id: 'x' }, body: validBody })
    await expect((addProductHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 409 on duplicate barcode', async () => {
    const container = buildContainer()
    container.addProduct.execute.mockRejectedValue(new DuplicateBarcodeError('3038359002564'))
    const event = makeEvent({ session, container, params: { id: 'ing-1' }, body: validBody })
    await expect((addProductHandler as any)(event)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('returns 400 on invalid payload', async () => {
    const container = buildContainer()
    const event = makeEvent({ session, container, params: { id: 'ing-1' }, body: { packSize: -1 } })
    await expect((addProductHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('GET /api/products/[id]', () => {
  it('returns the product', async () => {
    const container = buildContainer()
    container.getProduct.execute.mockResolvedValue({ id: 'prod-1' })
    const event = makeEvent({ session, container, params: { id: 'prod-1' } })
    const result = await (getProductHandler as any)(event)
    expect(result.id).toBe('prod-1')
  })

  it('returns 404 when missing', async () => {
    const container = buildContainer()
    container.getProduct.execute.mockRejectedValue(new ProductNotFoundError('x'))
    const event = makeEvent({ session, container, params: { id: 'x' } })
    await expect((getProductHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('PATCH /api/products/[id]', () => {
  it('updates the product', async () => {
    const container = buildContainer()
    container.updateProduct.execute.mockResolvedValue({ id: 'prod-1', brand: 'New' })
    const event = makeEvent({ session, container, params: { id: 'prod-1' }, body: { brand: 'New' } })
    const result = await (patchProductHandler as any)(event)
    expect(result.brand).toBe('New')
  })

  it('returns 409 on duplicate barcode', async () => {
    const container = buildContainer()
    container.updateProduct.execute.mockRejectedValue(new DuplicateBarcodeError('3038359002564'))
    const event = makeEvent({
      session, container, params: { id: 'prod-1' }, body: { barcodes: ['3038359002564'] },
    })
    await expect((patchProductHandler as any)(event)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('DELETE /api/products/[id]', () => {
  it('returns 204 on success', async () => {
    const container = buildContainer()
    container.removeProduct.execute.mockResolvedValue(undefined)
    const event = makeEvent({ session, container, params: { id: 'prod-1' } })
    const result = await (deleteProductHandler as any)(event)
    expect(result).toBeNull()
    expect(event._status).toBe(204)
  })

  it('returns 404 when missing', async () => {
    const container = buildContainer()
    container.removeProduct.execute.mockRejectedValue(new ProductNotFoundError('x'))
    const event = makeEvent({ session, container, params: { id: 'x' } })
    await expect((deleteProductHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('GET /api/barcodes/[code]', () => {
  it('returns the resolution on success', async () => {
    const container = buildContainer()
    container.resolveByBarcode.execute.mockResolvedValue({
      ingredient: { id: 'ing-1', name: 'Pâtes' },
      product: { id: 'prod-1' },
    })
    const event = makeEvent({ session, container, params: { code: '3038359002564' } })
    const result = await (resolveBarcodeHandler as any)(event)
    expect(result.ingredient.id).toBe('ing-1')
  })

  it('returns 404 when not found in the household', async () => {
    const container = buildContainer()
    container.resolveByBarcode.execute.mockResolvedValue(null)
    const event = makeEvent({ session, container, params: { code: '3038359002564' } })
    await expect((resolveBarcodeHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 400 on malformed barcode', async () => {
    // The use case is wired to do the Barcode.fromString call. Test simulates by mocking.
    const container = buildContainer()
    const { InvalidBarcodeFormatError } = await import('../../../server/contexts/ingredients/domain/value-objects/barcode.vo')
    container.resolveByBarcode.execute.mockRejectedValue(new InvalidBarcodeFormatError('abc', 'bad'))
    const event = makeEvent({ session, container, params: { code: 'abc' } })
    await expect((resolveBarcodeHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('cross-household access (forbidden via NotInHouseholdError)', () => {
  it('returns 403 when getCurrentHousehold throws', async () => {
    const container = buildContainer()
    container.getCurrentHousehold.execute.mockRejectedValue(new Error('no household'))
    const event = makeEvent({ session, container, query: {} })
    await expect((listHandler as any)(event)).rejects.toMatchObject({ statusCode: 403 })
  })
})
