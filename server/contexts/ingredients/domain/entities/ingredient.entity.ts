import type { CanonicalUnit } from '../../../../../shared/units/conversions'
import { type AllergenValue, parseAllergenSet } from '../value-objects/allergen.vo'
import { IngredientCategory, type IngredientCategoryValue } from '../value-objects/ingredient-category.vo'

export type IngredientStorage = 'pantry' | 'fridge'

export const INGREDIENT_NAME_MAX_LENGTH = 100
export const INGREDIENT_ALIAS_MAX_LENGTH = 100

export interface IngredientProps {
  id: string
  householdId: string
  name: string
  storage: IngredientStorage
  category: IngredientCategory
  canonicalUnit: CanonicalUnit
  shelfLifeDays: number | null
  imageUrl: string | null
  defaultPackSize: number | null
  allergens: AllergenValue[]
  aliases: string[]
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface IngredientCreateInput {
  id: string
  householdId: string
  name: string
  storage: IngredientStorage
  category: IngredientCategoryValue
  canonicalUnit: CanonicalUnit
  shelfLifeDays?: number | null
  imageUrl?: string | null
  defaultPackSize?: number | null
  allergens?: readonly string[]
  aliases?: readonly string[]
  now?: Date
}

export interface IngredientUpdateInput {
  name?: string
  storage?: IngredientStorage
  category?: IngredientCategoryValue
  shelfLifeDays?: number | null
  imageUrl?: string | null
  defaultPackSize?: number | null
  allergens?: readonly string[]
  aliases?: readonly string[]
}

export class Ingredient {
  readonly id: string
  readonly householdId: string
  readonly name: string
  readonly storage: IngredientStorage
  readonly category: IngredientCategory
  readonly canonicalUnit: CanonicalUnit
  readonly shelfLifeDays: number | null
  readonly imageUrl: string | null
  readonly defaultPackSize: number | null
  readonly allergens: readonly AllergenValue[]
  readonly aliases: readonly string[]
  readonly deletedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: IngredientProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.name = props.name
    this.storage = props.storage
    this.category = props.category
    this.canonicalUnit = props.canonicalUnit
    this.shelfLifeDays = props.shelfLifeDays
    this.imageUrl = props.imageUrl
    this.defaultPackSize = props.defaultPackSize
    this.allergens = props.allergens
    this.aliases = props.aliases
    this.deletedAt = props.deletedAt
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(input: IngredientCreateInput): Ingredient {
    const now = input.now ?? new Date()
    return new Ingredient({
      id: input.id,
      householdId: input.householdId,
      name: Ingredient.assertName(input.name),
      storage: input.storage,
      category: IngredientCategory.fromString(input.category),
      canonicalUnit: input.canonicalUnit,
      shelfLifeDays: Ingredient.assertShelfLife(input.shelfLifeDays ?? null),
      imageUrl: input.imageUrl ?? null,
      defaultPackSize: Ingredient.assertPositiveOrNull(input.defaultPackSize ?? null, 'defaultPackSize'),
      allergens: parseAllergenSet(input.allergens ?? []),
      aliases: Ingredient.assertAliases(input.aliases ?? []),
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: IngredientProps): Ingredient {
    return new Ingredient(props)
  }

  get archived(): boolean {
    return this.deletedAt !== null
  }

  /** Returns a new Ingredient with the given fields applied. `canonicalUnit` is intentionally immutable here — locking is enforced in the use case. */
  update(input: IngredientUpdateInput, now: Date = new Date()): Ingredient {
    return new Ingredient({
      ...this.props(),
      name: input.name !== undefined ? Ingredient.assertName(input.name) : this.name,
      storage: input.storage ?? this.storage,
      category: input.category !== undefined ? IngredientCategory.fromString(input.category) : this.category,
      shelfLifeDays: input.shelfLifeDays !== undefined
        ? Ingredient.assertShelfLife(input.shelfLifeDays)
        : this.shelfLifeDays,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : this.imageUrl,
      defaultPackSize: input.defaultPackSize !== undefined
        ? Ingredient.assertPositiveOrNull(input.defaultPackSize, 'defaultPackSize')
        : this.defaultPackSize,
      allergens: input.allergens !== undefined ? parseAllergenSet(input.allergens) : [...this.allergens],
      aliases: input.aliases !== undefined ? Ingredient.assertAliases(input.aliases) : [...this.aliases],
      updatedAt: now,
    })
  }

  archive(now: Date = new Date()): Ingredient {
    if (this.deletedAt !== null) return this
    return new Ingredient({ ...this.props(), deletedAt: now, updatedAt: now })
  }

  restore(now: Date = new Date()): Ingredient {
    if (this.deletedAt === null) return this
    return new Ingredient({ ...this.props(), deletedAt: null, updatedAt: now })
  }

  /** Used by the use case to apply a canonical unit change after locking check has passed. */
  withCanonicalUnit(unit: CanonicalUnit, now: Date = new Date()): Ingredient {
    if (unit === this.canonicalUnit) return this
    return new Ingredient({ ...this.props(), canonicalUnit: unit, updatedAt: now })
  }

  private props(): IngredientProps {
    return {
      id: this.id,
      householdId: this.householdId,
      name: this.name,
      storage: this.storage,
      category: this.category,
      canonicalUnit: this.canonicalUnit,
      shelfLifeDays: this.shelfLifeDays,
      imageUrl: this.imageUrl,
      defaultPackSize: this.defaultPackSize,
      allergens: [...this.allergens],
      aliases: [...this.aliases],
      deletedAt: this.deletedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  private static assertName(raw: string): string {
    const name = raw.trim()
    if (name.length === 0) {
      throw new Error('Ingredient name must not be empty.')
    }
    if (name.length > INGREDIENT_NAME_MAX_LENGTH) {
      throw new Error(`Ingredient name must not exceed ${INGREDIENT_NAME_MAX_LENGTH} characters.`)
    }
    return name
  }

  private static assertAliases(raw: readonly string[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []
    for (const r of raw) {
      const alias = r.trim()
      if (alias.length === 0) {
        throw new Error('Alias must not be empty.')
      }
      if (alias.length > INGREDIENT_ALIAS_MAX_LENGTH) {
        throw new Error(`Alias must not exceed ${INGREDIENT_ALIAS_MAX_LENGTH} characters.`)
      }
      const key = alias.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push(alias)
    }
    return result
  }

  private static assertShelfLife(value: number | null): number | null {
    if (value === null) return null
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('shelfLifeDays must be a positive integer.')
    }
    return value
  }

  private static assertPositiveOrNull(value: number | null, label: string): number | null {
    if (value === null) return null
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${label} must be a positive integer.`)
    }
    return value
  }
}
