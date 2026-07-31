import type { IMenuRepository } from '../../../meal-planning/domain/ports/menu-repository.port'
import type {
  IMenuSnapshotFinder,
  MenuSnapshotInfo,
  MenuSnapshotItem,
} from '../../domain/ports/menu-snapshot-finder.port'

export class MealPlanningMenuSnapshotFinder implements IMenuSnapshotFinder {
  constructor(private readonly menus: IMenuRepository) {}

  async findForGeneration(menuId: string, householdId: string): Promise<MenuSnapshotInfo | null> {
    const menu = await this.menus.findById(menuId, householdId)
    if (!menu) return null
    return {
      id: menu.id,
      householdId: menu.householdId,
      slots: menu.slots.map((s) => ({
        items: s.items.map((item): MenuSnapshotItem =>
          item.kind === 'recipe'
            ? { kind: 'recipe', recipeId: item.recipeId, servings: item.servings }
            : { kind: 'ingredient', ingredientId: item.ingredientId, quantity: { value: item.quantity.value, unit: item.quantity.unit } },
        ),
      })),
    }
  }
}
