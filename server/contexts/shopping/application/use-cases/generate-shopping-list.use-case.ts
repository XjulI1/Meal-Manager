import { randomUUID } from 'node:crypto'
import { ShoppingListSnapshot } from '../../domain/entities/shopping-list-snapshot.entity'
import { MenuNotAvailableError } from '../../domain/errors/menu-not-available.error'
import type { IIngredientSummaryFinder } from '../../domain/ports/ingredient-summary-finder.port'
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
  ingredientId: string
  ingredientName: string
  category: string
  quantity: { value: number, unit: string }
  isChecked: boolean
}

export interface ShoppingListView {
  id: string
  menuId: string
  generatedAt: string
  items: ShoppingListItemView[]
}

const CATEGORY_ORDER = [
  'produce',
  'bakery',
  'meat-fish',
  'dairy',
  'frozen',
  'grocery',
  'beverages',
  'household',
  'other',
] as const

function categoryRank(category: string): number {
  const idx = (CATEGORY_ORDER as readonly string[]).indexOf(category)
  return idx === -1 ? CATEGORY_ORDER.length : idx
}

export class GenerateShoppingListUseCase {
  constructor(
    private readonly snapshots: IShoppingListRepository,
    private readonly menus: IMenuSnapshotFinder,
    private readonly recipes: IRecipeSnapshotFinder,
    private readonly inventory: IInventorySnapshotFinder,
    private readonly summaries: IIngredientSummaryFinder,
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

    // Collect every ingredient id we may need to denormalize (recipes + stock)
    const ingredientIds = new Set<string>()
    for (const { recipe } of slotsWithRecipes) {
      for (const ing of recipe.ingredients) ingredientIds.add(ing.ingredientId)
    }
    for (const s of stock) ingredientIds.add(s.ingredientId)
    const summaries = await this.summaries.findByIds(Array.from(ingredientIds), input.householdId)

    const items = ShoppingListBuilder.build({
      slots: slotsWithRecipes,
      inventory: stock,
      summaries,
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
  const items = snapshot.items
    .map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      category: item.category,
      quantity: { value: item.quantity.value, unit: item.quantity.unit },
      isChecked: item.isChecked,
    }))
    .sort((a, b) => {
      const rankDiff = categoryRank(a.category) - categoryRank(b.category)
      if (rankDiff !== 0) return rankDiff
      return a.ingredientName.localeCompare(b.ingredientName)
    })
  return {
    id: snapshot.id,
    menuId: snapshot.menuId,
    generatedAt: snapshot.generatedAt.toISOString(),
    items,
  }
}
