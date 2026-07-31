import type { Quantity } from '../../../../../shared/units/quantity'

export const SLOT_SERVINGS_MIN = 1
export const SLOT_SERVINGS_MAX = 50

export interface RecipeSlotItemProps {
  id: string
  recipeId: string
  servings: number
}

/** The (at most one) recipe of a menu slot. */
export class RecipeSlotItem {
  readonly id: string
  readonly kind = 'recipe' as const
  readonly recipeId: string
  readonly servings: number

  private constructor(props: RecipeSlotItemProps) {
    this.id = props.id
    this.recipeId = props.recipeId
    this.servings = props.servings
  }

  static create(props: RecipeSlotItemProps): RecipeSlotItem {
    if (!Number.isInteger(props.servings) || props.servings < SLOT_SERVINGS_MIN || props.servings > SLOT_SERVINGS_MAX) {
      throw new Error(`Slot servings must be an integer between ${SLOT_SERVINGS_MIN} and ${SLOT_SERVINGS_MAX} (got ${props.servings}).`)
    }
    return new RecipeSlotItem(props)
  }

  static rehydrate(props: RecipeSlotItemProps): RecipeSlotItem {
    return new RecipeSlotItem(props)
  }
}

export interface IngredientSlotItemProps {
  id: string
  ingredientId: string
  quantity: Quantity
}

/** A free ingredient (no recipe) placed directly in a menu slot. */
export class IngredientSlotItem {
  readonly id: string
  readonly kind = 'ingredient' as const
  readonly ingredientId: string
  readonly quantity: Quantity

  private constructor(props: IngredientSlotItemProps) {
    this.id = props.id
    this.ingredientId = props.ingredientId
    this.quantity = props.quantity
  }

  static create(props: IngredientSlotItemProps): IngredientSlotItem {
    return new IngredientSlotItem(props)
  }

  static rehydrate(props: IngredientSlotItemProps): IngredientSlotItem {
    return new IngredientSlotItem(props)
  }

  /** Returns a new item with the same identity, holding the summed quantity. */
  withQuantity(quantity: Quantity): IngredientSlotItem {
    return new IngredientSlotItem({ id: this.id, ingredientId: this.ingredientId, quantity })
  }
}

export type MenuSlotItem = RecipeSlotItem | IngredientSlotItem
