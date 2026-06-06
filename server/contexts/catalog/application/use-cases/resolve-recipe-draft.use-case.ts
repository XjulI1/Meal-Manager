import { CANONICAL_UNIT, lookupUnit, type CanonicalUnit } from '../../../../../shared/units/conversions'
import type { IIngredientLookup } from '../../domain/ports/ingredient-lookup.port'
import type { RecipeDraft } from '../../domain/ports/recipe-importer'

export interface ResolveRecipeDraftInput {
  householdId: string
  draft: RecipeDraft
}

export interface ResolvedQuantity {
  value: number
  unit: string
}

export type ResolvedIngredient =
  | {
      status: 'matched'
      name: string
      quantity?: ResolvedQuantity
      ingredientId: string
      ingredientName: string
      canonicalUnit: CanonicalUnit
    }
  | {
      status: 'new'
      name: string
      quantity?: ResolvedQuantity
      proposedName: string
      canonicalUnit: CanonicalUnit
    }

export interface DraftResolution {
  title: string
  instructions: string
  servings?: number
  sourceUrl?: string
  ingredients: ResolvedIngredient[]
}

/**
 * Resolves a recipe draft's free-text ingredient names against the household
 * catalog. Pure orchestration over the lookup port: each line is either matched
 * to an existing ingredient (carrying its `ingredientId` + canonical unit) or
 * returned as a proposed new ingredient (normalized name + suggested canonical
 * unit derived from the draft quantity's dimension). It NEVER creates anything;
 * new ingredients are created later through the existing flow on user confirm.
 */
export class ResolveRecipeDraftUseCase {
  constructor(private readonly ingredientLookup: IIngredientLookup) {}

  async execute(input: ResolveRecipeDraftInput): Promise<DraftResolution> {
    const { draft, householdId } = input
    const ingredients: ResolvedIngredient[] = []

    for (const ing of draft.ingredients) {
      const name = ing.name.trim()
      const quantity = ing.quantity ? { value: ing.quantity.value, unit: ing.quantity.unit } : undefined
      const match = name.length > 0
        ? await this.ingredientLookup.findActiveByNameInHousehold(name, householdId)
        : null

      if (match) {
        ingredients.push({
          status: 'matched',
          name,
          ...(quantity ? { quantity } : {}),
          ingredientId: match.id,
          ingredientName: match.name,
          canonicalUnit: match.canonicalUnit,
        })
      }
      else {
        ingredients.push({
          status: 'new',
          name,
          ...(quantity ? { quantity } : {}),
          proposedName: name,
          canonicalUnit: canonicalUnitFor(ing.quantity?.unit),
        })
      }
    }

    return {
      title: draft.title,
      instructions: draft.instructions,
      ...(draft.servings !== undefined ? { servings: draft.servings } : {}),
      ...(draft.sourceUrl !== undefined ? { sourceUrl: draft.sourceUrl } : {}),
      ingredients,
    }
  }
}

/** Derive a canonical unit from a free-text unit; unknown/absent → 'unit'. */
function canonicalUnitFor(unit: string | undefined): CanonicalUnit {
  if (!unit) return 'unit'
  try {
    return CANONICAL_UNIT[lookupUnit(unit).dimension]
  }
  catch {
    return 'unit'
  }
}
