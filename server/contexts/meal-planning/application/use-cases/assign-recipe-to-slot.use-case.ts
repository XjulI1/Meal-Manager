import { MenuSlot } from '../../domain/entities/menu-slot.entity'
import { MenuNotFoundError } from '../../domain/errors/menu-not-found.error'
import { RecipeNotInHouseholdError } from '../../domain/errors/recipe-not-in-household.error'
import type { IMenuRepository } from '../../domain/ports/menu-repository.port'
import type { IRecipeFinder } from '../../domain/ports/recipe-finder.port'
import { DayOfWeek } from '../../domain/value-objects/day-of-week.vo'
import { MealType } from '../../domain/value-objects/meal-type.vo'

export interface AssignRecipeToSlotInput {
  householdId: string
  menuId: string
  dayOfWeek: string
  mealType: string
  recipeId: string
  servings: number
}

export interface AssignedSlotView {
  dayOfWeek: string
  mealType: string
  recipeId: string
  servings: number
}

export class AssignRecipeToSlotUseCase {
  constructor(
    private readonly menus: IMenuRepository,
    private readonly recipes: IRecipeFinder,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AssignRecipeToSlotInput): Promise<AssignedSlotView> {
    const menu = await this.menus.findById(input.menuId, input.householdId)
    if (!menu) {
      throw new MenuNotFoundError(input.menuId)
    }

    const recipeExists = await this.recipes.existsInHousehold(input.recipeId, input.householdId)
    if (!recipeExists) {
      throw new RecipeNotInHouseholdError(input.recipeId)
    }

    const slot = MenuSlot.create({
      dayOfWeek: DayOfWeek.fromString(input.dayOfWeek),
      mealType: MealType.fromString(input.mealType),
      recipeId: input.recipeId,
      servings: input.servings,
    })

    await this.menus.upsertSlot(menu.id, slot, this.clock())

    return {
      dayOfWeek: slot.dayOfWeek.value,
      mealType: slot.mealType.value,
      recipeId: slot.recipeId,
      servings: slot.servings,
    }
  }
}
