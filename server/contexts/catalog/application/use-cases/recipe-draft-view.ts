import type { RecipeDraft, RecipeDraftSource } from '../../domain/entities/recipe-draft.entity'

export interface RecipeDraftIngredientView {
  name: string
  quantity?: { value: number, unit: string }
  raw?: string
}

export interface RecipeDraftView {
  id: string
  source: RecipeDraftSource
  title: string | null
  instructions: string | null
  servings: number | null
  ingredients: RecipeDraftIngredientView[]
  sourceUrl: string | null
  createdAt: string
  updatedAt: string
}

export function toRecipeDraftView(draft: RecipeDraft): RecipeDraftView {
  return {
    id: draft.id,
    source: draft.source,
    title: draft.title ?? null,
    instructions: draft.instructions ?? null,
    servings: draft.servings ?? null,
    ingredients: draft.ingredients.map((ing) => ({
      name: ing.name,
      ...(ing.quantity ? { quantity: ing.quantity } : {}),
      ...(ing.raw !== undefined ? { raw: ing.raw } : {}),
    })),
    sourceUrl: draft.sourceUrl ?? null,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  }
}
