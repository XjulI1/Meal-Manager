import type { IMenuRepository } from '../../../meal-planning/domain/ports/menu-repository.port'
import type {
  IMenuSnapshotFinder,
  MenuSnapshotInfo,
} from '../../domain/ports/menu-snapshot-finder.port'

export class MealPlanningMenuSnapshotFinder implements IMenuSnapshotFinder {
  constructor(private readonly menus: IMenuRepository) {}

  async findForGeneration(menuId: string, householdId: string): Promise<MenuSnapshotInfo | null> {
    const menu = await this.menus.findById(menuId, householdId)
    if (!menu) return null
    return {
      id: menu.id,
      householdId: menu.householdId,
      slots: menu.slots.map((s) => ({ recipeId: s.recipeId, servings: s.servings })),
    }
  }
}
