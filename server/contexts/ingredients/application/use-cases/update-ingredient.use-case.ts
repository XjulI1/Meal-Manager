import type { CanonicalUnit } from '../../../../../shared/units/conversions'
import { CanonicalUnitLockedError } from '../../domain/errors/canonical-unit-locked.error'
import { DuplicateIngredientNameError } from '../../domain/errors/duplicate-ingredient-name.error'
import { IngredientNotFoundError } from '../../domain/errors/ingredient-not-found.error'
import type { IIngredientRepository } from '../../domain/ports/ingredient-repository.port'
import type { IProductRepository } from '../../domain/ports/product-repository.port'
import type { IngredientCategoryValue } from '../../domain/value-objects/ingredient-category.vo'
import { toIngredientView, type IngredientView } from './views'

export interface UpdateIngredientInput {
  householdId: string
  id: string
  name?: string
  storage?: 'pantry' | 'fridge'
  category?: IngredientCategoryValue
  canonicalUnit?: CanonicalUnit
  shelfLifeDays?: number | null
  imageUrl?: string | null
  defaultPackSize?: number | null
  allergens?: readonly string[]
  aliases?: readonly string[]
}

export class UpdateIngredientUseCase {
  constructor(
    private readonly ingredients: IIngredientRepository,
    private readonly products: IProductRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateIngredientInput): Promise<IngredientView> {
    const existing = await this.ingredients.findById(input.id, input.householdId)
    if (!existing) {
      throw new IngredientNotFoundError(input.id)
    }

    // Uniqueness check on name change
    if (input.name !== undefined && input.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await this.ingredients.findActiveByNameInHousehold(input.name, input.householdId)
      if (dup && dup.id !== existing.id) {
        throw new DuplicateIngredientNameError(input.name)
      }
    }

    const now = this.clock()
    let updated = existing.update(
      {
        name: input.name,
        storage: input.storage,
        category: input.category,
        shelfLifeDays: input.shelfLifeDays,
        imageUrl: input.imageUrl,
        defaultPackSize: input.defaultPackSize,
        allergens: input.allergens,
        aliases: input.aliases,
      },
      now,
    )

    // Canonical unit is immutable as soon as the ingredient is in use (any
    // product OR any reference from inventory/recipes/shopping).
    if (input.canonicalUnit !== undefined && input.canonicalUnit !== existing.canonicalUnit) {
      const productCount = (await this.products.findByIngredient(existing.id, existing.householdId)).length
      const referenced = productCount > 0 || (await this.ingredients.isReferenced(existing.id, existing.householdId))
      if (referenced) {
        throw new CanonicalUnitLockedError(existing.id)
      }
      updated = updated.withCanonicalUnit(input.canonicalUnit, now)
    }

    await this.ingredients.save(updated)
    return toIngredientView(updated)
  }
}
