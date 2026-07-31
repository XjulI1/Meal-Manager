import { describe, expect, it, vi } from 'vitest'
import addItemHandler from '../../../server/api/menus/[id]/slots/items/index.post'
import removeItemHandler from '../../../server/api/menus/[id]/slots/items/[itemId].delete'
import clearSlotHandler from '../../../server/api/menus/[id]/slots/index.delete'
import { InvalidIngredientReferenceError } from '../../../server/contexts/meal-planning/domain/errors/invalid-ingredient-reference.error'
import { MenuNotFoundError } from '../../../server/contexts/meal-planning/domain/errors/menu-not-found.error'
import { RecipeNotInHouseholdError } from '../../../server/contexts/meal-planning/domain/errors/recipe-not-in-household.error'
import { SlotItemNotFoundError } from '../../../server/contexts/meal-planning/domain/errors/slot-item-not-found.error'
import { makeEvent } from './nuxt-runtime-stubs'

const session = { user: { id: 'u1', email: 'alice@example.com' } }
const HH = 'hh-1'

interface StubUseCase { execute: ReturnType<typeof vi.fn> }

function buildContainer(overrides: Partial<Record<string, StubUseCase>> = {}) {
  return {
    getCurrentHousehold: { execute: vi.fn().mockResolvedValue({ id: HH, name: 'Famille', inviteCode: 'X', memberCount: 1 }) },
    addSlotItem: { execute: vi.fn() },
    removeSlotItem: { execute: vi.fn() },
    clearSlot: { execute: vi.fn() },
    ...overrides,
  }
}

describe('POST /api/menus/[id]/slots/items', () => {
  it('adds a recipe item and returns 201', async () => {
    const container = buildContainer()
    container.addSlotItem.execute.mockResolvedValue({
      dayOfWeek: 'monday', mealType: 'dinner', items: [{ id: 'item-1', kind: 'recipe', recipeId: 'recipe-A', servings: 4 }],
    })
    const event = makeEvent({
      session,
      container,
      params: { id: 'menu-1' },
      body: { dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: '3c9a8e2e-8b2a-4a3e-9b0a-1f2c3d4e5f60', servings: 4 },
    })
    const result = await (addItemHandler as any)(event)
    expect(event._status).toBe(201)
    expect(result.items[0]).toMatchObject({ kind: 'recipe', recipeId: 'recipe-A' })
  })

  it('adds a free ingredient item and returns 201', async () => {
    const container = buildContainer()
    container.addSlotItem.execute.mockResolvedValue({
      dayOfWeek: 'monday', mealType: 'dinner', items: [{ id: 'item-1', kind: 'ingredient', ingredientId: 'ing-bread', quantity: { value: 300, unit: 'g' } }],
    })
    const event = makeEvent({
      session,
      container,
      params: { id: 'menu-1' },
      body: { dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: '3c9a8e2e-8b2a-4a3e-9b0a-1f2c3d4e5f60', quantity: { value: 300, unit: 'g' } },
    })
    const result = await (addItemHandler as any)(event)
    expect(event._status).toBe(201)
    expect(result.items[0]).toMatchObject({ kind: 'ingredient', ingredientId: 'ing-bread' })
  })

  it('returns 400 on invalid payload (missing kind)', async () => {
    const container = buildContainer()
    const event = makeEvent({ session, container, params: { id: 'menu-1' }, body: { dayOfWeek: 'monday', mealType: 'dinner' } })
    await expect((addItemHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 404 when the menu is not found', async () => {
    const container = buildContainer()
    container.addSlotItem.execute.mockRejectedValue(new MenuNotFoundError('menu-1'))
    const event = makeEvent({
      session,
      container,
      params: { id: 'menu-1' },
      body: { dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: '3c9a8e2e-8b2a-4a3e-9b0a-1f2c3d4e5f60', servings: 4 },
    })
    await expect((addItemHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 404 when the recipe does not belong to the household', async () => {
    const container = buildContainer()
    container.addSlotItem.execute.mockRejectedValue(new RecipeNotInHouseholdError('recipe-other'))
    const event = makeEvent({
      session,
      container,
      params: { id: 'menu-1' },
      body: { dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: '3c9a8e2e-8b2a-4a3e-9b0a-1f2c3d4e5f60', servings: 4 },
    })
    await expect((addItemHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 404 when the ingredient does not belong to the household', async () => {
    const container = buildContainer()
    container.addSlotItem.execute.mockRejectedValue(new InvalidIngredientReferenceError('ing-other', 'not-found'))
    const event = makeEvent({
      session,
      container,
      params: { id: 'menu-1' },
      body: { dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: '3c9a8e2e-8b2a-4a3e-9b0a-1f2c3d4e5f60', quantity: { value: 1, unit: 'g' } },
    })
    await expect((addItemHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 400 on an incompatible unit', async () => {
    const container = buildContainer()
    container.addSlotItem.execute.mockRejectedValue(new InvalidIngredientReferenceError('ing-bread', 'unit-incompatible'))
    const event = makeEvent({
      session,
      container,
      params: { id: 'menu-1' },
      body: { dayOfWeek: 'monday', mealType: 'dinner', kind: 'ingredient', ingredientId: '3c9a8e2e-8b2a-4a3e-9b0a-1f2c3d4e5f60', quantity: { value: 1, unit: 'l' } },
    })
    await expect((addItemHandler as any)(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns 403 when the caller has no household', async () => {
    const container = buildContainer()
    container.getCurrentHousehold.execute.mockRejectedValue(new Error('no household'))
    const event = makeEvent({
      session,
      container,
      params: { id: 'menu-1' },
      body: { dayOfWeek: 'monday', mealType: 'dinner', kind: 'recipe', recipeId: '3c9a8e2e-8b2a-4a3e-9b0a-1f2c3d4e5f60', servings: 4 },
    })
    await expect((addItemHandler as any)(event)).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('DELETE /api/menus/[id]/slots/items/[itemId]', () => {
  it('returns 204 on success', async () => {
    const container = buildContainer()
    container.removeSlotItem.execute.mockResolvedValue(undefined)
    const event = makeEvent({ session, container, params: { id: 'menu-1', itemId: 'item-1' } })
    const result = await (removeItemHandler as any)(event)
    expect(result).toBeNull()
    expect(event._status).toBe(204)
  })

  it('returns 404 when the item is not found', async () => {
    const container = buildContainer()
    container.removeSlotItem.execute.mockRejectedValue(new SlotItemNotFoundError('item-1'))
    const event = makeEvent({ session, container, params: { id: 'menu-1', itemId: 'item-1' } })
    await expect((removeItemHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('DELETE /api/menus/[id]/slots', () => {
  it('clears the slot and returns 204', async () => {
    const container = buildContainer()
    container.clearSlot.execute.mockResolvedValue(undefined)
    const event = makeEvent({ session, container, params: { id: 'menu-1' }, query: { dayOfWeek: 'monday', mealType: 'dinner' } })
    const result = await (clearSlotHandler as any)(event)
    expect(result).toBeNull()
    expect(event._status).toBe(204)
  })

  it('returns 404 when the menu is not found', async () => {
    const container = buildContainer()
    container.clearSlot.execute.mockRejectedValue(new MenuNotFoundError('menu-1'))
    const event = makeEvent({ session, container, params: { id: 'menu-1' }, query: { dayOfWeek: 'monday', mealType: 'dinner' } })
    await expect((clearSlotHandler as any)(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})
