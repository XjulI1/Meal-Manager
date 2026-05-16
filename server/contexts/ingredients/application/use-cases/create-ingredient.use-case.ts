import { randomUUID } from 'node:crypto'
import type { CanonicalUnit } from '../../../../../shared/units/conversions'
import { Ingredient } from '../../domain/entities/ingredient.entity'
import { DuplicateIngredientNameError } from '../../domain/errors/duplicate-ingredient-name.error'
import type { IIngredientRepository } from '../../domain/ports/ingredient-repository.port'
import type { IngredientCategoryValue } from '../../domain/value-objects/ingredient-category.vo'
import { toIngredientView, type IngredientView } from './views'

export interface CreateIngredientInput {
  householdId: string
  name: string
  storage: 'pantry' | 'fridge'
  category: IngredientCategoryValue
  canonicalUnit: CanonicalUnit
  shelfLifeDays?: number | null
  imageUrl?: string | null
  defaultPackSize?: number | null
  allergens?: readonly string[]
  aliases?: readonly string[]
}

export class CreateIngredientUseCase {
  constructor(
    private readonly ingredients: IIngredientRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateIngredientInput): Promise<IngredientView> {
    const duplicate = await this.ingredients.findActiveByNameInHousehold(input.name, input.householdId)
    if (duplicate) {
      throw new DuplicateIngredientNameError(input.name)
    }

    const ingredient = Ingredient.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      name: input.name,
      storage: input.storage,
      category: input.category,
      canonicalUnit: input.canonicalUnit,
      shelfLifeDays: input.shelfLifeDays ?? null,
      imageUrl: input.imageUrl ?? null,
      defaultPackSize: input.defaultPackSize ?? null,
      allergens: input.allergens ?? [],
      aliases: input.aliases ?? [],
      now: this.clock(),
    })

    await this.ingredients.save(ingredient)
    return toIngredientView(ingredient)
  }
}
