import { describe, expect, it } from 'vitest'
import { Quantity } from '../../../shared/units/quantity'
import { DayOfWeek } from '../../../server/contexts/meal-planning/domain/value-objects/day-of-week.vo'
import { MealType } from '../../../server/contexts/meal-planning/domain/value-objects/meal-type.vo'
import { MenuSlot } from '../../../server/contexts/meal-planning/domain/entities/menu-slot.entity'
import { RecipeSlotItem, IngredientSlotItem } from '../../../server/contexts/meal-planning/domain/entities/menu-slot-item.entity'
import { MultipleRecipesInSlotError } from '../../../server/contexts/meal-planning/domain/errors/multiple-recipes-in-slot.error'

const monday = DayOfWeek.fromString('monday')
const dinner = MealType.fromString('dinner')

function recipeItem(id: string, recipeId: string, servings = 4) {
  return RecipeSlotItem.create({ id, recipeId, servings })
}

function ingredientItem(id: string, ingredientId: string, value: number, unit = 'g') {
  return IngredientSlotItem.create({ id, ingredientId, quantity: Quantity.fromUserInput(value, unit) })
}

describe('MenuSlot', () => {
  it('starts empty when created with no items', () => {
    const slot = MenuSlot.create({ dayOfWeek: monday, mealType: dinner, items: [] })
    expect(slot.isEmpty()).toBe(true)
    expect(slot.recipeItem()).toBeUndefined()
    expect(slot.ingredientItems()).toHaveLength(0)
  })

  it('rejects more than one recipe item', () => {
    expect(() =>
      MenuSlot.create({
        dayOfWeek: monday,
        mealType: dinner,
        items: [recipeItem('i1', 'recipe-A'), recipeItem('i2', 'recipe-B')],
      }),
    ).toThrow(MultipleRecipesInSlotError)
  })

  it('mixes one recipe and several free ingredients', () => {
    const slot = MenuSlot.create({
      dayOfWeek: monday,
      mealType: dinner,
      items: [recipeItem('i1', 'recipe-A'), ingredientItem('i2', 'ing-bread', 300), ingredientItem('i3', 'ing-salad', 1, 'unit')],
    })
    expect(slot.recipeItem()?.recipeId).toBe('recipe-A')
    expect(slot.ingredientItems()).toHaveLength(2)
  })

  it('withRecipeItem replaces the recipe item and keeps free ingredients', () => {
    const slot = MenuSlot.create({
      dayOfWeek: monday,
      mealType: dinner,
      items: [recipeItem('i1', 'recipe-A'), ingredientItem('i2', 'ing-bread', 300)],
    })
    const updated = slot.withRecipeItem(recipeItem('i3', 'recipe-B'))
    expect(updated.recipeItem()?.recipeId).toBe('recipe-B')
    expect(updated.ingredientItems()).toHaveLength(1)
    expect(updated.ingredientItems()[0]?.ingredientId).toBe('ing-bread')
  })

  it('withIngredientItemAdded sums quantities for the same ingredient + unit', () => {
    const slot = MenuSlot.create({
      dayOfWeek: monday,
      mealType: dinner,
      items: [ingredientItem('i1', 'ing-bread', 300)],
    })
    const updated = slot.withIngredientItemAdded(ingredientItem('i2', 'ing-bread', 200))
    expect(updated.ingredientItems()).toHaveLength(1)
    expect(updated.ingredientItems()[0]?.quantity.value).toBe(500)
    // identity of the existing item is preserved, not the newly-added one
    expect(updated.ingredientItems()[0]?.id).toBe('i1')
  })

  it('withIngredientItemAdded keeps separate entries for different ingredients', () => {
    const slot = MenuSlot.create({
      dayOfWeek: monday,
      mealType: dinner,
      items: [ingredientItem('i1', 'ing-bread', 300)],
    })
    const updated = slot.withIngredientItemAdded(ingredientItem('i2', 'ing-salad', 1, 'unit'))
    expect(updated.ingredientItems()).toHaveLength(2)
  })

  it('withoutItem removes a single item and the slot can become empty', () => {
    const slot = MenuSlot.create({
      dayOfWeek: monday,
      mealType: dinner,
      items: [recipeItem('i1', 'recipe-A'), ingredientItem('i2', 'ing-bread', 300)],
    })
    const withoutIngredient = slot.withoutItem('i2')
    expect(withoutIngredient.ingredientItems()).toHaveLength(0)
    expect(withoutIngredient.recipeItem()).toBeDefined()

    const empty = withoutIngredient.withoutItem('i1')
    expect(empty.isEmpty()).toBe(true)
  })
})
