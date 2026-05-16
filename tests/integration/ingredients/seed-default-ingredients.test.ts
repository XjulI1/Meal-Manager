import { beforeEach, describe, expect, it } from 'vitest'
import { SeedDefaultIngredientsUseCase } from '../../../server/contexts/ingredients/application/use-cases/seed-default-ingredients.use-case'
import { DEFAULT_SEED } from '../../../server/contexts/ingredients/application/seed-data'
import { InMemoryIngredientRepository } from './in-memory/in-memory-ingredient.repository'
import { InMemoryProductRepository } from './in-memory/in-memory-product.repository'

const HH = 'household-1'

describe('SeedDefaultIngredientsUseCase', () => {
  let ingredients: InMemoryIngredientRepository
  let products: InMemoryProductRepository
  let seed: SeedDefaultIngredientsUseCase
  let counter = 0

  beforeEach(() => {
    counter = 0
    ingredients = new InMemoryIngredientRepository()
    products = new InMemoryProductRepository()
    seed = new SeedDefaultIngredientsUseCase(ingredients, DEFAULT_SEED, () => `ing-${++counter}`)
  })

  it('seeds a non-empty catalog covering all categories', async () => {
    const { inserted } = await seed.execute({ householdId: HH })
    expect(inserted).toBeGreaterThanOrEqual(30)
    expect(ingredients.forHousehold(HH).length).toBe(inserted)

    const categories = new Set(ingredients.forHousehold(HH).map((i) => i.category.value))
    expect(categories.has('produce')).toBe(true)
    expect(categories.has('dairy')).toBe(true)
    expect(categories.has('grocery')).toBe(true)
    expect(categories.has('bakery')).toBe(true)
    expect(categories.has('meat-fish')).toBe(true)
    expect(categories.has('beverages')).toBe(true)
  })

  it('does not seed any products', async () => {
    await seed.execute({ householdId: HH })
    expect(products.size()).toBe(0)
  })

  it('is idempotent (no-op when household already has ingredients)', async () => {
    const first = await seed.execute({ householdId: HH })
    const second = await seed.execute({ householdId: HH })

    expect(first.inserted).toBeGreaterThan(0)
    expect(second.inserted).toBe(0)
    expect(ingredients.forHousehold(HH).length).toBe(first.inserted)
  })

  it('scopes per household', async () => {
    await seed.execute({ householdId: HH })
    await seed.execute({ householdId: 'household-2' })

    expect(ingredients.forHousehold(HH).length).toBeGreaterThan(0)
    expect(ingredients.forHousehold('household-2').length).toBe(ingredients.forHousehold(HH).length)
  })

  it('every seeded ingredient has valid category, canonicalUnit and storage', async () => {
    await seed.execute({ householdId: HH })
    for (const ing of ingredients.forHousehold(HH)) {
      expect(['pantry', 'fridge']).toContain(ing.storage)
      expect(['g', 'ml', 'unit']).toContain(ing.canonicalUnit)
      expect(ing.category.value).toBeDefined()
    }
  })
})
