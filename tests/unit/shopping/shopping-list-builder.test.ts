import { describe, expect, it } from 'vitest'
import { Quantity } from '../../../shared/units/quantity'
import { ShoppingListBuilder } from '../../../server/contexts/shopping/domain/services/shopping-list-builder'

interface IngEntry { id: string, name: string, category: string, value: number, unit: string }

function recipe(id: string, servings: number, ingredients: IngEntry[]) {
  return {
    id,
    servings,
    ingredients: ingredients.map((ing) => ({
      ingredientId: ing.id,
      quantity: Quantity.fromUserInput(ing.value, ing.unit),
    })),
  }
}

function stock(items: Array<{ id: string, value: number, unit: string }>) {
  return items.map((ing) => ({ ingredientId: ing.id, quantity: Quantity.fromUserInput(ing.value, ing.unit) }))
}

function summariesOf(...entries: IngEntry[]): Map<string, { id: string, name: string, category: string }> {
  return new Map(entries.map((e) => [e.id, { id: e.id, name: e.name, category: e.category }]))
}

let counter = 0
const idGen = () => `i-${++counter}`

describe('ShoppingListBuilder', () => {
  it('scales ingredients by slot.servings / recipe.servings', () => {
    counter = 0
    const pasta = { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', value: 200, unit: 'g' }
    const butter = { id: 'ing-butter', name: 'Beurre', category: 'dairy', value: 30, unit: 'g' }
    const items = ShoppingListBuilder.build({
      slots: [{ recipe: recipe('r1', 2, [pasta, butter]), servings: 4 }],
      inventory: [],
      summaries: summariesOf(pasta, butter),
      idGenerator: idGen,
    })

    expect(items.map((i) => ({ id: i.ingredientId, name: i.ingredientName, qty: i.quantity.value, unit: i.quantity.unit, cat: i.category })))
      .toEqual([
        { id: 'ing-pasta', name: 'Pâtes', qty: 400, unit: 'g', cat: 'grocery' },
        { id: 'ing-butter', name: 'Beurre', qty: 60, unit: 'g', cat: 'dairy' },
      ])
  })

  it('subtracts inventory and omits negative results entirely', () => {
    counter = 0
    const pasta = { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', value: 200, unit: 'g' }
    const butter = { id: 'ing-butter', name: 'Beurre', category: 'dairy', value: 30, unit: 'g' }
    const items = ShoppingListBuilder.build({
      slots: [{ recipe: recipe('r1', 2, [pasta, butter]), servings: 4 }],
      inventory: stock([{ id: 'ing-butter', value: 100, unit: 'g' }]),
      summaries: summariesOf(pasta, butter),
      idGenerator: idGen,
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.ingredientName).toBe('Pâtes')
    expect(items[0]?.quantity.value).toBe(400)
  })

  it('aggregates the same ingredient across recipes by ingredientId', () => {
    counter = 0
    const butter = { id: 'ing-butter', name: 'Beurre', category: 'dairy', value: 30, unit: 'g' }
    const butter2 = { ...butter, value: 50 }
    const items = ShoppingListBuilder.build({
      slots: [
        { recipe: recipe('r1', 1, [butter]), servings: 1 },
        { recipe: recipe('r2', 1, [butter2]), servings: 1 },
      ],
      inventory: [],
      summaries: summariesOf(butter),
      idGenerator: idGen,
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.quantity.value).toBe(80)
    expect(items[0]?.ingredientId).toBe('ing-butter')
    expect(items[0]?.ingredientName).toBe('Beurre')
  })

  it('returns an empty list for an empty menu', () => {
    counter = 0
    const items = ShoppingListBuilder.build({
      slots: [], inventory: [], summaries: new Map(), idGenerator: idGen,
    })
    expect(items).toEqual([])
  })

  it('marks every item as unchecked', () => {
    counter = 0
    const pasta = { id: 'ing-pasta', name: 'Pâtes', category: 'grocery', value: 100, unit: 'g' }
    const items = ShoppingListBuilder.build({
      slots: [{ recipe: recipe('r1', 1, [pasta]), servings: 1 }],
      inventory: [],
      summaries: summariesOf(pasta),
      idGenerator: idGen,
    })
    expect(items.every((i) => i.isChecked === false)).toBe(true)
  })

  it('drops entries when inventory exactly matches the need', () => {
    counter = 0
    const butter = { id: 'ing-butter', name: 'Beurre', category: 'dairy', value: 100, unit: 'g' }
    const items = ShoppingListBuilder.build({
      slots: [{ recipe: recipe('r1', 1, [butter]), servings: 1 }],
      inventory: stock([{ id: 'ing-butter', value: 100, unit: 'g' }]),
      summaries: summariesOf(butter),
      idGenerator: idGen,
    })
    expect(items).toEqual([])
  })

  it('falls back to "Unknown ingredient" / "other" when a summary is missing', () => {
    counter = 0
    const orphan = { id: 'ing-orphan', name: 'X', category: 'grocery', value: 50, unit: 'g' }
    const items = ShoppingListBuilder.build({
      slots: [{ recipe: recipe('r1', 1, [orphan]), servings: 1 }],
      inventory: [],
      summaries: new Map(),
      idGenerator: idGen,
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.ingredientName).toBe('Unknown ingredient')
    expect(items[0]?.category).toBe('other')
  })
})
