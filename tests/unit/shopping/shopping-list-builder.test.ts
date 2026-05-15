import { describe, expect, it } from 'vitest'
import { Quantity } from '../../../shared/units/quantity'
import { ShoppingListBuilder } from '../../../server/contexts/shopping/domain/services/shopping-list-builder'

function recipe(id: string, servings: number, ingredients: Array<{ name: string, value: number, unit: string }>) {
  return {
    id,
    servings,
    ingredients: ingredients.map((ing) => ({ name: ing.name, quantity: Quantity.fromUserInput(ing.value, ing.unit) })),
  }
}

function stock(items: Array<{ name: string, value: number, unit: string }>) {
  return items.map((ing) => ({ name: ing.name, quantity: Quantity.fromUserInput(ing.value, ing.unit) }))
}

let counter = 0
const idGen = () => `i-${++counter}`

describe('ShoppingListBuilder', () => {
  it('scales ingredients by slot.servings / recipe.servings', () => {
    counter = 0
    const items = ShoppingListBuilder.build({
      slots: [
        { recipe: recipe('r1', 2, [
          { name: 'Pâtes', value: 200, unit: 'g' },
          { name: 'Beurre', value: 30, unit: 'g' },
        ]), servings: 4 },
      ],
      inventory: [],
      idGenerator: idGen,
    })

    expect(items.map((i) => ({ name: i.ingredientName, qty: i.quantity.value, unit: i.quantity.unit }))).toEqual([
      { name: 'Pâtes', qty: 400, unit: 'g' },
      { name: 'Beurre', qty: 60, unit: 'g' },
    ])
  })

  it('subtracts inventory and omits negative results entirely', () => {
    counter = 0
    const items = ShoppingListBuilder.build({
      slots: [
        { recipe: recipe('r1', 2, [
          { name: 'Pâtes', value: 200, unit: 'g' },
          { name: 'Beurre', value: 30, unit: 'g' },
        ]), servings: 4 },
      ],
      inventory: stock([{ name: 'Beurre', value: 100, unit: 'g' }]),
      idGenerator: idGen,
    })

    // Beurre: needed 60 g, in stock 100 g → drop
    // Pâtes: needed 400 g → unchanged
    expect(items).toHaveLength(1)
    expect(items[0]?.ingredientName).toBe('Pâtes')
    expect(items[0]?.quantity.value).toBe(400)
  })

  it('aggregates the same ingredient across recipes (case-insensitive, trimmed)', () => {
    counter = 0
    const items = ShoppingListBuilder.build({
      slots: [
        { recipe: recipe('r1', 1, [{ name: 'Beurre', value: 30, unit: 'g' }]), servings: 1 },
        { recipe: recipe('r2', 1, [{ name: '  beurre ', value: 50, unit: 'g' }]), servings: 1 },
      ],
      inventory: [],
      idGenerator: idGen,
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.quantity.value).toBe(80)
    expect(items[0]?.ingredientName).toBe('Beurre')
  })

  it('keeps ingredients with the same name but different canonical units separate', () => {
    counter = 0
    const items = ShoppingListBuilder.build({
      slots: [
        { recipe: recipe('r1', 1, [
          { name: 'Lait', value: 250, unit: 'ml' },
          { name: 'Lait', value: 50, unit: 'g' },
        ]), servings: 1 },
      ],
      inventory: [],
      idGenerator: idGen,
    })

    expect(items).toHaveLength(2)
    const units = items.map((i) => i.quantity.unit).sort()
    expect(units).toEqual(['g', 'ml'])
  })

  it('returns an empty list for an empty menu', () => {
    counter = 0
    const items = ShoppingListBuilder.build({ slots: [], inventory: [], idGenerator: idGen })
    expect(items).toEqual([])
  })

  it('marks every item as unchecked', () => {
    counter = 0
    const items = ShoppingListBuilder.build({
      slots: [
        { recipe: recipe('r1', 1, [{ name: 'Pâtes', value: 100, unit: 'g' }]), servings: 1 },
      ],
      inventory: [],
      idGenerator: idGen,
    })
    expect(items.every((i) => i.isChecked === false)).toBe(true)
  })

  it('drops entries when inventory exactly matches the need', () => {
    counter = 0
    const items = ShoppingListBuilder.build({
      slots: [{ recipe: recipe('r1', 1, [{ name: 'Beurre', value: 100, unit: 'g' }]), servings: 1 }],
      inventory: stock([{ name: 'Beurre', value: 100, unit: 'g' }]),
      idGenerator: idGen,
    })
    expect(items).toEqual([])
  })
})
