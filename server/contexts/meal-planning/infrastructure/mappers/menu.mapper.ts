import type {
  MenuRow,
  MenuSlotRow,
  NewMenuRow,
  NewMenuSlotRow,
} from '../../../../database/schema/menus'
import { MenuSlot } from '../../domain/entities/menu-slot.entity'
import { Menu } from '../../domain/entities/menu.entity'
import { DayOfWeek } from '../../domain/value-objects/day-of-week.vo'
import { MealType } from '../../domain/value-objects/meal-type.vo'
import { WeekStart } from '../../domain/value-objects/week-start.vo'

export const MenuMapper = {
  toDomain(row: MenuRow, slotRows: ReadonlyArray<MenuSlotRow>): Menu {
    const slots = slotRows
      .filter((s): s is MenuSlotRow & { recipeId: string, servings: number } => s.recipeId !== null && s.servings !== null)
      .map((s) =>
        MenuSlot.rehydrate({
          dayOfWeek: DayOfWeek.fromString(s.dayOfWeek),
          mealType: MealType.fromString(s.mealType),
          recipeId: s.recipeId,
          servings: s.servings,
        }),
      )
    return Menu.rehydrate({
      id: row.id,
      householdId: row.householdId,
      weekStart: WeekStart.mondayOf(row.weekStart),
      slots,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(menu: Menu): NewMenuRow {
    return {
      id: menu.id,
      householdId: menu.householdId,
      weekStart: menu.weekStart.date,
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
    }
  },

  slotToPersistence(menuId: string, slot: MenuSlot): NewMenuSlotRow {
    return {
      menuId,
      dayOfWeek: slot.dayOfWeek.value,
      mealType: slot.mealType.value,
      recipeId: slot.recipeId,
      servings: slot.servings,
    }
  },
}
