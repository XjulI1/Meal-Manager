import type { MenuSlotItem } from '../entities/menu-slot-item.entity'
import type { Menu } from '../entities/menu.entity'
import type { DayOfWeek } from '../value-objects/day-of-week.vo'
import type { MealType } from '../value-objects/meal-type.vo'
import type { WeekStart } from '../value-objects/week-start.vo'

export interface IMenuRepository {
  /** Look up a menu by its identity (household + Monday). */
  findByWeek(householdId: string, weekStart: WeekStart): Promise<Menu | null>

  /** Look up a menu by its id, scoped by household. */
  findById(id: string, householdId: string): Promise<Menu | null>

  /** Persist a brand-new (empty) menu. */
  create(menu: Menu): Promise<void>

  /**
   * Replace all items of a (day, meal) slot with the given list. An empty
   * list means the slot no longer holds any item (no row persisted).
   */
  replaceSlotItems(
    menuId: string,
    dayOfWeek: DayOfWeek,
    mealType: MealType,
    items: ReadonlyArray<MenuSlotItem>,
    updatedAt: Date,
  ): Promise<void>

  /** Remove a single item by id. No-op if it doesn't exist. */
  removeSlotItem(menuId: string, itemId: string, updatedAt: Date): Promise<void>

  /** Remove every item of a (day, meal) slot; no-op if it already has none. */
  clearSlot(menuId: string, dayOfWeek: DayOfWeek, mealType: MealType, updatedAt: Date): Promise<void>
}
