import { and, asc, eq, like } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { recipeIngredients, recipes } from '../../../../database/schema/recipes'
import type { Recipe } from '../../domain/entities/recipe.entity'
import type {
  IRecipeRepository,
  ListRecipesFilter,
  RecipeSummary,
} from '../../domain/ports/recipe-repository.port'
import { RecipeMapper } from '../mappers/recipe.mapper'

export class DrizzleRecipeRepository implements IRecipeRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string, householdId: string): Promise<Recipe | null> {
    const recipeRows = await this.db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.householdId, householdId)))
      .limit(1)
    const row = recipeRows[0]
    if (!row) return null

    const ingredientRows = await this.db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, row.id))

    return RecipeMapper.toDomain(row, ingredientRows)
  }

  async listForHousehold(
    householdId: string,
    filter: ListRecipesFilter = {},
  ): Promise<RecipeSummary[]> {
    const trimmed = filter.query?.trim()
    const where = trimmed
      ? and(eq(recipes.householdId, householdId), like(recipes.title, `%${escapeLike(trimmed)}%`))
      : eq(recipes.householdId, householdId)

    const rows = await this.db
      .select({
        id: recipes.id,
        title: recipes.title,
        servings: recipes.servings,
        updatedAt: recipes.updatedAt,
      })
      .from(recipes)
      .where(where)
      .orderBy(asc(recipes.title))

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      servings: r.servings,
      updatedAt: r.updatedAt,
    }))
  }

  async create(recipe: Recipe): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(recipes).values(RecipeMapper.toPersistence(recipe))
      const ingredientRows = RecipeMapper.ingredientsToPersistence(recipe)
      if (ingredientRows.length > 0) {
        await tx.insert(recipeIngredients).values(ingredientRows)
      }
    })
  }

  async update(recipe: Recipe): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(recipes)
        .set({
          title: recipe.title,
          instructions: recipe.instructions,
          servings: recipe.servings,
          updatedAt: recipe.updatedAt,
        })
        .where(and(eq(recipes.id, recipe.id), eq(recipes.householdId, recipe.householdId)))

      await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id))
      const ingredientRows = RecipeMapper.ingredientsToPersistence(recipe)
      if (ingredientRows.length > 0) {
        await tx.insert(recipeIngredients).values(ingredientRows)
      }
    })
  }

  async delete(id: string, householdId: string): Promise<void> {
    // menu_slot_items.recipe_id is ON DELETE CASCADE: deleting the recipe
    // removes only the recipe item of any slot referencing it (each item is
    // its own row), leaving that slot's free-ingredient items untouched.
    await this.db
      .delete(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.householdId, householdId)))
  }
}

function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`)
}
