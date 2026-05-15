import type { DayOfWeek } from '../value-objects/day-of-week.vo'
import type { MealType } from '../value-objects/meal-type.vo'

export const SLOT_SERVINGS_MIN = 1
export const SLOT_SERVINGS_MAX = 50

export interface MenuSlotProps {
  dayOfWeek: DayOfWeek
  mealType: MealType
  recipeId: string
  servings: number
}

export class MenuSlot {
  readonly dayOfWeek: DayOfWeek
  readonly mealType: MealType
  readonly recipeId: string
  readonly servings: number

  private constructor(props: MenuSlotProps) {
    this.dayOfWeek = props.dayOfWeek
    this.mealType = props.mealType
    this.recipeId = props.recipeId
    this.servings = props.servings
  }

  static create(props: MenuSlotProps): MenuSlot {
    if (!Number.isInteger(props.servings) || props.servings < SLOT_SERVINGS_MIN || props.servings > SLOT_SERVINGS_MAX) {
      throw new Error(`Slot servings must be an integer between ${SLOT_SERVINGS_MIN} and ${SLOT_SERVINGS_MAX} (got ${props.servings}).`)
    }
    return new MenuSlot(props)
  }

  static rehydrate(props: MenuSlotProps): MenuSlot {
    return new MenuSlot(props)
  }

  matches(dayOfWeek: DayOfWeek, mealType: MealType): boolean {
    return this.dayOfWeek.equals(dayOfWeek) && this.mealType.equals(mealType)
  }
}
