import { randomUUID } from 'node:crypto'
import { Ingredient } from '../../domain/entities/ingredient.entity'
import type { IIngredientRepository } from '../../domain/ports/ingredient-repository.port'
import { DEFAULT_SEED, type SeedIngredient } from '../seed-data'

export interface SeedDefaultIngredientsInput {
  householdId: string
}

/**
 * Idempotent — if the household already has any ingredient, the seed is a no-op.
 * The seed is the prerequisite that makes a newly-created household usable
 * (`ingredient_id` is NOT NULL on inventory_items and recipe_ingredients).
 */
export class SeedDefaultIngredientsUseCase {
  constructor(
    private readonly ingredients: IIngredientRepository,
    private readonly seed: readonly SeedIngredient[] = DEFAULT_SEED,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: SeedDefaultIngredientsInput): Promise<{ inserted: number }> {
    const existing = await this.ingredients.listForHousehold(input.householdId, { includeArchived: true })
    if (existing.length > 0) {
      return { inserted: 0 }
    }

    const now = this.clock()
    let inserted = 0
    for (const def of this.seed) {
      const ingredient = Ingredient.create({
        id: this.idGenerator(),
        householdId: input.householdId,
        name: def.name,
        storage: def.storage,
        category: def.category,
        canonicalUnit: def.canonicalUnit,
        shelfLifeDays: def.shelfLifeDays ?? null,
        defaultPackSize: def.defaultPackSize ?? null,
        aliases: def.aliases ?? [],
        now,
      })
      await this.ingredients.save(ingredient)
      inserted += 1
    }
    return { inserted }
  }
}
