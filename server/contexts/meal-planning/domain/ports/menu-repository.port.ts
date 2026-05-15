import type { MenuSlot } from '../entities/menu-slot.entity'
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
   * Insert or replace a slot for the given menu. Slot uniqueness is
   * (menuId, dayOfWeek, mealType).
   */
  upsertSlot(menuId: string, slot: MenuSlot, updatedAt: Date): Promise<void>

  /** Remove a slot if it exists; no-op otherwise. */
  removeSlot(menuId: string, dayOfWeek: DayOfWeek, mealType: MealType, updatedAt: Date): Promise<void>
}
