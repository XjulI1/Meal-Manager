import { beforeEach, describe, expect, it } from 'vitest'
import { AddInventoryItemFromProductScanUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item-from-product-scan.use-case'
import { AddInventoryItemUseCase } from '../../../server/contexts/inventory/application/use-cases/add-inventory-item.use-case'
import { InvalidIngredientReferenceError } from '../../../server/contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { ProductNotFoundError } from '../../../server/contexts/inventory/domain/errors/product-not-found.error'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'
import { InMemoryInventoryItemRepository } from './in-memory/in-memory-inventory-item.repository'
import { InMemoryProductLookup } from './in-memory/in-memory-product-lookup'

const HH = 'hh-1'
const PROD_PASTA = 'prod-pasta'
const PROD_FOREIGN = 'prod-foreign'
const PROD_MILK = 'prod-milk'

describe('AddInventoryItemFromProductScanUseCase', () => {
  let repo: InMemoryInventoryItemRepository
  let ingredients: InMemoryIngredientLookup
  let products: InMemoryProductLookup
  let useCase: AddInventoryItemFromProductScanUseCase

  beforeEach(() => {
    repo = new InMemoryInventoryItemRepository()
    ingredients = new InMemoryIngredientLookup()
    products = new InMemoryProductLookup()

    ingredients.add(HH, { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: false })
    ingredients.add(HH, { id: 'ing-milk', name: 'Lait', category: 'dairy', canonicalUnit: 'ml', storage: 'fridge', archived: false })

    products.add(HH, { id: PROD_PASTA, ingredientId: 'ing-pasta', packSize: 500, packUnit: 'g' })
    products.add(HH, { id: PROD_MILK, ingredientId: 'ing-milk', packSize: 1000, packUnit: 'ml' })
    products.add('hh-other', { id: PROD_FOREIGN, ingredientId: 'ing-pasta', packSize: 500, packUnit: 'g' })

    let counter = 0
    const now = new Date('2026-05-15T10:00:00Z')
    const add = new AddInventoryItemUseCase(repo, ingredients, () => `item-${++counter}`, () => now)
    useCase = new AddInventoryItemFromProductScanUseCase(products, add)
  })

  it('creates a new inventory line from a scan (defaults)', async () => {
    const result = await useCase.execute({
      householdId: HH,
      productId: PROD_PASTA,
      quantity: { value: 500, unit: 'g' },
    })

    expect(result.created).toBe(true)
    expect(result.item).toMatchObject({
      ingredientId: 'ing-pasta',
      location: 'pantry',
      quantity: { value: 500, unit: 'g' },
    })
  })

  it('increments an existing line on a second scan of the same product', async () => {
    await useCase.execute({ householdId: HH, productId: PROD_PASTA, quantity: { value: 500, unit: 'g' } })
    const second = await useCase.execute({ householdId: HH, productId: PROD_PASTA, quantity: { value: 500, unit: 'g' } })

    expect(second.created).toBe(false)
    expect(second.item.quantity).toEqual({ value: 1000, unit: 'g' })
    expect(await repo.listForHousehold(HH)).toHaveLength(1)
  })

  it('accepts an explicit location override', async () => {
    const result = await useCase.execute({
      householdId: HH,
      productId: PROD_PASTA,
      quantity: { value: 500, unit: 'g' },
      location: 'freezer',
    })
    expect(result.item.location).toBe('freezer')
  })

  it('rejects an unknown product', async () => {
    await expect(useCase.execute({
      householdId: HH,
      productId: 'prod-unknown',
      quantity: { value: 500, unit: 'g' },
    })).rejects.toBeInstanceOf(ProductNotFoundError)
  })

  it('rejects a product from another household', async () => {
    await expect(useCase.execute({
      householdId: HH,
      productId: PROD_FOREIGN,
      quantity: { value: 500, unit: 'g' },
    })).rejects.toBeInstanceOf(ProductNotFoundError)
  })

  it('rejects an incompatible unit', async () => {
    await expect(useCase.execute({
      householdId: HH,
      productId: PROD_PASTA,
      quantity: { value: 1, unit: 'l' },
    })).rejects.toBeInstanceOf(InvalidIngredientReferenceError)
  })
})
