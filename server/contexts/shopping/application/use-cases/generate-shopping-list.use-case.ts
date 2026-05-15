import { randomUUID } from 'node:crypto'
import { ShoppingListSnapshot } from '../../domain/entities/shopping-list-snapshot.entity'
import { MenuNotAvailableError } from '../../domain/errors/menu-not-available.error'
import type { IInventorySnapshotFinder } from '../../domain/ports/inventory-snapshot-finder.port'
import type { IMenuSnapshotFinder } from '../../domain/ports/menu-snapshot-finder.port'
import type { IRecipeSnapshotFinder } from '../../domain/ports/recipe-snapshot-finder.port'
import type { IShoppingListRepository } from '../../domain/ports/shopping-list-repository.port'
import { ShoppingListBuilder } from '../../domain/services/shopping-list-builder'

export interface GenerateShoppingListInput {
  householdId: string
  menuId: string
  /** When true and a snapshot already exists for the menu, returns it as-is. */
  reuse?: boolean
}

export interface ShoppingListItemView {
  id: string
  ingredientName: string
  quantity: { value: number, unit: string }
  isChecked: boolean
}

export interface ShoppingListView {
  id: string
  menuId: string
  generatedAt: string
  items: ShoppingListItemView[]
}

export class GenerateShoppingListUseCase {
  constructor(
    private readonly snapshots: IShoppingListRepository,
    private readonly menus: IMenuSnapshotFinder,
    private readonly recipes: IRecipeSnapshotFinder,
    private readonly inventory: IInventorySnapshotFinder,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: GenerateShoppingListInput): Promise<ShoppingListView> {
    const menu = await this.menus.findForGeneration(input.menuId, input.householdId)
    if (!menu) {
      throw new MenuNotAvailableError(input.menuId)
    }

    if (input.reuse) {
      const existing = await this.snapshots.findByMenu(input.menuId, input.householdId)
      if (existing) {
        return toShoppingListView(existing)
      }
    }

    const recipeIds = Array.from(new Set(menu.slots.map((s) => s.recipeId)))
    const recipes = await this.recipes.findManyByIds(recipeIds, input.householdId)
    const stock = await this.inventory.listForHousehold(input.householdId)

    const slotsWithRecipes = menu.slots
      .map((slot) => {
        const recipe = recipes.get(slot.recipeId)
        return recipe ? { recipe, servings: slot.servings } : null
      })
      .filter((s): s is { recipe: NonNullable<ReturnType<typeof recipes.get>>, servings: number } => s !== null)

    const items = ShoppingListBuilder.build({
      slots: slotsWithRecipes,
      inventory: stock,
      idGenerator: this.idGenerator,
    })

    const snapshot = ShoppingListSnapshot.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      menuId: input.menuId,
      items,
      now: this.clock(),
    })

    await this.snapshots.replaceForMenu(snapshot)
    return toShoppingListView(snapshot)
  }
}

export function toShoppingListView(snapshot: ShoppingListSnapshot): ShoppingListView {
  return {
    id: snapshot.id,
    menuId: snapshot.menuId,
    generatedAt: snapshot.generatedAt.toISOString(),
    items: snapshot.items.map((item) => ({
      id: item.id,
      ingredientName: item.ingredientName,
      quantity: { value: item.quantity.value, unit: item.quantity.unit },
      isChecked: item.isChecked,
    })),
  }
}
