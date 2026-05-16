import type {
  IngredientRow,
  NewIngredientRow,
} from '../../../../database/schema/ingredients'
import type { CanonicalUnit } from '../../../../../shared/units/conversions'
import { Ingredient } from '../../domain/entities/ingredient.entity'
import type { AllergenValue } from '../../domain/value-objects/allergen.vo'
import { IngredientCategory } from '../../domain/value-objects/ingredient-category.vo'

export const IngredientMapper = {
  toDomain(row: IngredientRow, aliases: string[] = []): Ingredient {
    const rawAllergens = Array.isArray(row.allergens) ? (row.allergens as unknown[]) : []
    const allergens = rawAllergens.filter((v): v is AllergenValue => typeof v === 'string') as AllergenValue[]
    return Ingredient.rehydrate({
      id: row.id,
      householdId: row.householdId,
      name: row.name,
      storage: row.storage,
      category: IngredientCategory.fromString(row.category),
      canonicalUnit: row.canonicalUnit as CanonicalUnit,
      shelfLifeDays: row.shelfLifeDays ?? null,
      imageUrl: row.imageUrl ?? null,
      defaultPackSize: row.defaultPackSize ?? null,
      allergens,
      aliases: [...aliases],
      deletedAt: row.deletedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(ingredient: Ingredient): NewIngredientRow {
    return {
      id: ingredient.id,
      householdId: ingredient.householdId,
      name: ingredient.name,
      storage: ingredient.storage,
      category: ingredient.category.value,
      canonicalUnit: ingredient.canonicalUnit,
      shelfLifeDays: ingredient.shelfLifeDays ?? null,
      imageUrl: ingredient.imageUrl ?? null,
      defaultPackSize: ingredient.defaultPackSize ?? null,
      allergens: [...ingredient.allergens],
      deletedAt: ingredient.deletedAt ?? null,
      createdAt: ingredient.createdAt,
      updatedAt: ingredient.updatedAt,
    }
  },
}
