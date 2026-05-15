import { Quantity } from '../../../../shared/units/quantity'
import type {
  IInventorySnapshotFinder,
  InventorySnapshotItem,
} from '../../../../server/contexts/shopping/domain/ports/inventory-snapshot-finder.port'
import type {
  IMenuSnapshotFinder,
  MenuSnapshotInfo,
} from '../../../../server/contexts/shopping/domain/ports/menu-snapshot-finder.port'
import type {
  IRecipeSnapshotFinder,
  RecipeSnapshotInfo,
} from '../../../../server/contexts/shopping/domain/ports/recipe-snapshot-finder.port'

interface IngredientSpec {
  name: string
  value: number
  unit: string
}

export class FakeMenuFinder implements IMenuSnapshotFinder {
  private readonly menus = new Map<string, MenuSnapshotInfo>()

  register(menu: MenuSnapshotInfo): this {
    this.menus.set(menu.id, menu)
    return this
  }

  async findForGeneration(menuId: string, householdId: string): Promise<MenuSnapshotInfo | null> {
    const m = this.menus.get(menuId)
    if (!m || m.householdId !== householdId) return null
    return m
  }
}

export class FakeRecipeFinder implements IRecipeSnapshotFinder {
  private readonly recipes = new Map<string, { householdId: string, info: RecipeSnapshotInfo }>()

  register(id: string, householdId: string, servings: number, ingredients: IngredientSpec[]): this {
    this.recipes.set(id, {
      householdId,
      info: {
        id,
        servings,
        ingredients: ingredients.map((ing) => ({
          name: ing.name,
          quantity: Quantity.fromUserInput(ing.value, ing.unit),
        })),
      },
    })
    return this
  }

  async findManyByIds(
    ids: ReadonlyArray<string>,
    householdId: string,
  ): Promise<Map<string, RecipeSnapshotInfo>> {
    const out = new Map<string, RecipeSnapshotInfo>()
    for (const id of ids) {
      const entry = this.recipes.get(id)
      if (entry && entry.householdId === householdId) {
        out.set(id, entry.info)
      }
    }
    return out
  }
}

export class FakeInventoryFinder implements IInventorySnapshotFinder {
  private readonly stocks = new Map<string, InventorySnapshotItem[]>()

  setStock(householdId: string, items: IngredientSpec[]): this {
    this.stocks.set(householdId, items.map((ing) => ({
      name: ing.name,
      quantity: Quantity.fromUserInput(ing.value, ing.unit),
    })))
    return this
  }

  async listForHousehold(householdId: string): Promise<InventorySnapshotItem[]> {
    return this.stocks.get(householdId) ?? []
  }
}
