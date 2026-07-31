import type { DayOfWeek } from '../value-objects/day-of-week.vo'
import type { MealType } from '../value-objects/meal-type.vo'
import { MultipleRecipesInSlotError } from '../errors/multiple-recipes-in-slot.error'
import type { IngredientSlotItem, MenuSlotItem, RecipeSlotItem } from './menu-slot-item.entity'

export interface MenuSlotProps {
  dayOfWeek: DayOfWeek
  mealType: MealType
  items: ReadonlyArray<MenuSlotItem>
}

/** A (day, meal) slot of a menu: at most one recipe item + 0..n free-ingredient items. */
export class MenuSlot {
  readonly dayOfWeek: DayOfWeek
  readonly mealType: MealType
  readonly items: ReadonlyArray<MenuSlotItem>

  private constructor(props: MenuSlotProps) {
    const recipeItems = props.items.filter((i) => i.kind === 'recipe')
    if (recipeItems.length > 1) {
      throw new MultipleRecipesInSlotError(props.dayOfWeek.value, props.mealType.value)
    }
    this.dayOfWeek = props.dayOfWeek
    this.mealType = props.mealType
    this.items = props.items
  }

  static create(props: MenuSlotProps): MenuSlot {
    return new MenuSlot(props)
  }

  static rehydrate(props: MenuSlotProps): MenuSlot {
    return new MenuSlot(props)
  }

  matches(dayOfWeek: DayOfWeek, mealType: MealType): boolean {
    return this.dayOfWeek.equals(dayOfWeek) && this.mealType.equals(mealType)
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }

  recipeItem(): RecipeSlotItem | undefined {
    return this.items.find((i): i is RecipeSlotItem => i.kind === 'recipe')
  }

  ingredientItems(): ReadonlyArray<IngredientSlotItem> {
    return this.items.filter((i): i is IngredientSlotItem => i.kind === 'ingredient')
  }

  /** Replaces the recipe item (if any), leaving free-ingredient items untouched. */
  withRecipeItem(item: RecipeSlotItem): MenuSlot {
    const others = this.items.filter((i) => i.kind !== 'recipe')
    return new MenuSlot({ dayOfWeek: this.dayOfWeek, mealType: this.mealType, items: [...others, item] })
  }

  /**
   * Adds a free-ingredient item. If an item with the same ingredientId and
   * canonical unit already exists, their quantities are summed instead of
   * creating a duplicate.
   */
  withIngredientItemAdded(item: IngredientSlotItem): MenuSlot {
    const index = this.items.findIndex(
      (i): i is IngredientSlotItem =>
        i.kind === 'ingredient' && i.ingredientId === item.ingredientId && i.quantity.unit === item.quantity.unit,
    )
    if (index === -1) {
      return new MenuSlot({ dayOfWeek: this.dayOfWeek, mealType: this.mealType, items: [...this.items, item] })
    }
    const existing = this.items[index] as IngredientSlotItem
    const items = [...this.items]
    items[index] = existing.withQuantity(existing.quantity.add(item.quantity))
    return new MenuSlot({ dayOfWeek: this.dayOfWeek, mealType: this.mealType, items })
  }

  /** Removes a single item by id; may result in an empty slot. */
  withoutItem(itemId: string): MenuSlot {
    return new MenuSlot({
      dayOfWeek: this.dayOfWeek,
      mealType: this.mealType,
      items: this.items.filter((i) => i.id !== itemId),
    })
  }
}
