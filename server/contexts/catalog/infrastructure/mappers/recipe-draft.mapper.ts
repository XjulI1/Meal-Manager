import type {
  NewRecipeDraftIngredientRow,
  NewRecipeDraftRow,
  RecipeDraftIngredientRow,
  RecipeDraftRow,
} from '../../../../database/schema/recipe-drafts'
import { RecipeDraft } from '../../domain/entities/recipe-draft.entity'
import type { RecipeIngredientDraft } from '../../domain/ports/recipe-importer'

export const RecipeDraftMapper = {
  toDomain(row: RecipeDraftRow, ingredientRows: ReadonlyArray<RecipeDraftIngredientRow>): RecipeDraft {
    const ingredients: RecipeIngredientDraft[] = [...ingredientRows]
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        name: r.name,
        ...(r.quantityValue !== null
          ? { quantity: { value: Number(r.quantityValue), unit: r.quantityUnit ?? '' } }
          : {}),
        ...(r.raw !== null ? { raw: r.raw } : {}),
      }))

    return RecipeDraft.rehydrate({
      id: row.id,
      householdId: row.householdId,
      source: row.source,
      title: row.title ?? undefined,
      instructions: row.instructions ?? undefined,
      servings: row.servings ?? undefined,
      ingredients,
      sourceUrl: row.sourceUrl ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(draft: RecipeDraft): NewRecipeDraftRow {
    return {
      id: draft.id,
      householdId: draft.householdId,
      source: draft.source,
      title: draft.title ?? null,
      instructions: draft.instructions ?? null,
      servings: draft.servings ?? null,
      sourceUrl: draft.sourceUrl ?? null,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    }
  },

  ingredientsToPersistence(draft: RecipeDraft): NewRecipeDraftIngredientRow[] {
    return draft.ingredients.map((ing, position) => ({
      draftId: draft.id,
      position,
      name: ing.name,
      quantityValue: ing.quantity ? ing.quantity.value.toString() : null,
      quantityUnit: ing.quantity ? ing.quantity.unit : null,
      raw: ing.raw ?? null,
    }))
  },
}
