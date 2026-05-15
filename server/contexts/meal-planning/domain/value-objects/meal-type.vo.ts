export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const

export type MealTypeValue = typeof MEAL_TYPES[number]

const VALUES: ReadonlySet<MealTypeValue> = new Set(MEAL_TYPES)

export class InvalidMealTypeError extends Error {
  override readonly name = 'InvalidMealTypeError'
  constructor(value: string) {
    super(`Invalid meal type: "${value}". Expected one of ${MEAL_TYPES.join(', ')}.`)
  }
}

export class MealType {
  private constructor(readonly value: MealTypeValue) {}

  static fromString(value: string): MealType {
    if (!VALUES.has(value as MealTypeValue)) {
      throw new InvalidMealTypeError(value)
    }
    return new MealType(value as MealTypeValue)
  }

  equals(other: MealType): boolean {
    return this.value === other.value
  }
}
