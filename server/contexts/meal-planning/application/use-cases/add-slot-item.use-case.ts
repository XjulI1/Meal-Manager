import { randomUUID } from 'node:crypto'
import { Quantity } from '../../../../../shared/units/quantity'
import { IngredientSlotItem, RecipeSlotItem } from '../../domain/entities/menu-slot-item.entity'
import { MenuSlot } from '../../domain/entities/menu-slot.entity'
import { InvalidIngredientReferenceError } from '../../domain/errors/invalid-ingredient-reference.error'
import { MenuNotFoundError } from '../../domain/errors/menu-not-found.error'
import { RecipeNotInHouseholdError } from '../../domain/errors/recipe-not-in-household.error'
import type { IIngredientLookup } from '../../domain/ports/ingredient-lookup.port'
import type { IMenuRepository } from '../../domain/ports/menu-repository.port'
import type { IRecipeFinder } from '../../domain/ports/recipe-finder.port'
import { DayOfWeek } from '../../domain/value-objects/day-of-week.vo'
import { MealType } from '../../domain/value-objects/meal-type.vo'
import type { MenuSlotItemView, MenuSlotView } from './create-menu.use-case'

export interface AddRecipeSlotItemInput {
  householdId: string
  menuId: string
  dayOfWeek: string
  mealType: string
  kind: 'recipe'
  recipeId: string
  servings: number
}

export interface AddIngredientSlotItemInput {
  householdId: string
  menuId: string
  dayOfWeek: string
  mealType: string
  kind: 'ingredient'
  ingredientId: string
  quantity: { value: number, unit: string }
}

export type AddSlotItemInput = AddRecipeSlotItemInput | AddIngredientSlotItemInput

function slotToView(slot: MenuSlot): MenuSlotView {
  const items: MenuSlotItemView[] = slot.items.map((item) =>
    item.kind === 'recipe'
      ? { id: item.id, kind: 'recipe', recipeId: item.recipeId, servings: item.servings }
      : { id: item.id, kind: 'ingredient', ingredientId: item.ingredientId, quantity: { value: item.quantity.value, unit: item.quantity.unit } },
  )
  return { dayOfWeek: slot.dayOfWeek.value, mealType: slot.mealType.value, items }
}

export class AddSlotItemUseCase {
  constructor(
    private readonly menus: IMenuRepository,
    private readonly recipes: IRecipeFinder,
    private readonly ingredients: IIngredientLookup,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AddSlotItemInput): Promise<MenuSlotView> {
    const menu = await this.menus.findById(input.menuId, input.householdId)
    if (!menu) {
      throw new MenuNotFoundError(input.menuId)
    }

    const dayOfWeek = DayOfWeek.fromString(input.dayOfWeek)
    const mealType = MealType.fromString(input.mealType)
    const existingSlot = menu.slots.find((s) => s.matches(dayOfWeek, mealType))

    const updatedSlot = input.kind === 'recipe'
      ? await this.addRecipe(input, dayOfWeek, mealType, existingSlot)
      : await this.addIngredient(input, dayOfWeek, mealType, existingSlot)

    await this.menus.replaceSlotItems(menu.id, dayOfWeek, mealType, updatedSlot.items, this.clock())

    return slotToView(updatedSlot)
  }

  private async addRecipe(
    input: AddRecipeSlotItemInput,
    dayOfWeek: DayOfWeek,
    mealType: MealType,
    existingSlot: MenuSlot | undefined,
  ): Promise<MenuSlot> {
    const recipeExists = await this.recipes.existsInHousehold(input.recipeId, input.householdId)
    if (!recipeExists) {
      throw new RecipeNotInHouseholdError(input.recipeId)
    }
    const item = RecipeSlotItem.create({ id: this.idGenerator(), recipeId: input.recipeId, servings: input.servings })
    return existingSlot ? existingSlot.withRecipeItem(item) : MenuSlot.create({ dayOfWeek, mealType, items: [item] })
  }

  private async addIngredient(
    input: AddIngredientSlotItemInput,
    dayOfWeek: DayOfWeek,
    mealType: MealType,
    existingSlot: MenuSlot | undefined,
  ): Promise<MenuSlot> {
    const summary = await this.ingredients.findById(input.ingredientId, input.householdId)
    if (!summary) {
      throw new InvalidIngredientReferenceError(input.ingredientId, 'not-found')
    }
    if (summary.archived) {
      throw new InvalidIngredientReferenceError(input.ingredientId, 'archived')
    }
    const quantity = Quantity.fromUserInput(input.quantity.value, input.quantity.unit)
    if (quantity.unit !== summary.canonicalUnit) {
      throw new InvalidIngredientReferenceError(input.ingredientId, 'unit-incompatible')
    }
    const item = IngredientSlotItem.create({ id: this.idGenerator(), ingredientId: input.ingredientId, quantity })
    return existingSlot ? existingSlot.withIngredientItemAdded(item) : MenuSlot.create({ dayOfWeek, mealType, items: [item] })
  }
}
