export const INGREDIENT_CATEGORIES = [
  'produce',
  'bakery',
  'meat-fish',
  'dairy',
  'frozen',
  'grocery',
  'beverages',
  'household',
  'other',
] as const

export type IngredientCategoryValue = (typeof INGREDIENT_CATEGORIES)[number]

const VALUES: ReadonlySet<IngredientCategoryValue> = new Set(INGREDIENT_CATEGORIES)

/**
 * In-store traversal order, used to sort shopping list items by aisle.
 * The order matches the typical layout of a French supermarket.
 */
const ORDER: Record<IngredientCategoryValue, number> = INGREDIENT_CATEGORIES.reduce(
  (acc, value, index) => {
    acc[value] = index
    return acc
  },
  {} as Record<IngredientCategoryValue, number>,
)

export class InvalidIngredientCategoryError extends Error {
  override readonly name = 'InvalidIngredientCategoryError'
  constructor(value: string) {
    super(`Invalid ingredient category: "${value}". Expected one of ${INGREDIENT_CATEGORIES.join(', ')}.`)
  }
}

export class IngredientCategory {
  private constructor(readonly value: IngredientCategoryValue) {}

  static fromString(value: string): IngredientCategory {
    if (!VALUES.has(value as IngredientCategoryValue)) {
      throw new InvalidIngredientCategoryError(value)
    }
    return new IngredientCategory(value as IngredientCategoryValue)
  }

  /** Sort key (lower = appears earlier in store). */
  get sortOrder(): number {
    return ORDER[this.value]
  }

  equals(other: IngredientCategory): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}

export function compareCategories(a: IngredientCategoryValue, b: IngredientCategoryValue): number {
  return ORDER[a] - ORDER[b]
}
