/** The 14 EU regulatory food allergens. */
export const ALLERGENS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const

export type AllergenValue = (typeof ALLERGENS)[number]

const VALUES: ReadonlySet<AllergenValue> = new Set(ALLERGENS)

export class InvalidAllergenError extends Error {
  override readonly name = 'InvalidAllergenError'
  constructor(value: string) {
    super(`Invalid allergen: "${value}". Expected one of ${ALLERGENS.join(', ')}.`)
  }
}

export class Allergen {
  private constructor(readonly value: AllergenValue) {}

  static fromString(value: string): Allergen {
    if (!VALUES.has(value as AllergenValue)) {
      throw new InvalidAllergenError(value)
    }
    return new Allergen(value as AllergenValue)
  }

  equals(other: Allergen): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}

/** Build a de-duplicated, validated set from raw strings. */
export function parseAllergenSet(values: readonly string[]): AllergenValue[] {
  const set = new Set<AllergenValue>()
  for (const v of values) {
    set.add(Allergen.fromString(v).value)
  }
  return Array.from(set)
}
