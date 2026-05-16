import { Quantity } from '../../../../../shared/units/quantity'
import { InvalidIngredientReferenceError } from '../../domain/errors/invalid-ingredient-reference.error'
import { RecipeNotFoundError } from '../../domain/errors/recipe-not-found.error'
import type { IIngredientLookup, IngredientSummary } from '../../domain/ports/ingredient-lookup.port'
import type { IRecipeRepository } from '../../domain/ports/recipe-repository.port'
import { RecipeIngredient } from '../../domain/value-objects/recipe-ingredient.vo'
import { toRecipeView, type RecipeIngredientInput, type RecipeView } from './create-recipe.use-case'

export interface UpdateRecipeInput {
  householdId: string
  id: string
  title?: string
  instructions?: string
  servings?: number
  ingredients?: ReadonlyArray<RecipeIngredientInput>
}

export class UpdateRecipeUseCase {
  constructor(
    private readonly recipes: IRecipeRepository,
    private readonly ingredientLookup: IIngredientLookup,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateRecipeInput): Promise<RecipeView> {
    const existing = await this.recipes.findById(input.id, input.householdId)
    if (!existing) {
      throw new RecipeNotFoundError(input.id)
    }

    const now = this.clock()
    let updated = existing
    if (input.title !== undefined) updated = updated.withTitle(input.title, now)
    if (input.instructions !== undefined) updated = updated.withInstructions(input.instructions, now)
    if (input.servings !== undefined) updated = updated.withServings(input.servings, now)

    let summaries: Map<string, IngredientSummary>
    if (input.ingredients !== undefined) {
      const ids = input.ingredients.map((i) => i.ingredientId)
      summaries = await this.ingredientLookup.findByIds(ids, input.householdId)
      const mapped = input.ingredients.map((ing) => {
        const summary = summaries.get(ing.ingredientId)
        if (!summary) {
          throw new InvalidIngredientReferenceError(ing.ingredientId, 'not-found')
        }
        if (summary.archived) {
          throw new InvalidIngredientReferenceError(ing.ingredientId, 'archived')
        }
        const quantity = Quantity.fromUserInput(ing.quantity.value, ing.quantity.unit)
        if (quantity.unit !== summary.canonicalUnit) {
          throw new InvalidIngredientReferenceError(ing.ingredientId, 'unit-incompatible')
        }
        return RecipeIngredient.create({ ingredientId: ing.ingredientId, quantity })
      })
      updated = updated.withIngredients(mapped, now)
    }
    else {
      const ids = existing.ingredients.map((i) => i.ingredientId)
      summaries = await this.ingredientLookup.findByIds(ids, input.householdId)
    }

    await this.recipes.update(updated)
    return toRecipeView(updated, summaries)
  }
}
