import { Quantity } from '../../../../../shared/units/quantity'
import type {
  MenuRow,
  MenuSlotItemRow,
  NewMenuRow,
  NewMenuSlotItemRow,
} from '../../../../database/schema/menus'
import { IngredientSlotItem, RecipeSlotItem, type MenuSlotItem } from '../../domain/entities/menu-slot-item.entity'
import { MenuSlot } from '../../domain/entities/menu-slot.entity'
import { Menu } from '../../domain/entities/menu.entity'
import { DayOfWeek } from '../../domain/value-objects/day-of-week.vo'
import { MealType } from '../../domain/value-objects/meal-type.vo'
import { WeekStart } from '../../domain/value-objects/week-start.vo'

function itemToDomain(row: MenuSlotItemRow): MenuSlotItem {
  if (row.kind === 'recipe') {
    return RecipeSlotItem.rehydrate({ id: row.id, recipeId: row.recipeId!, servings: row.servings! })
  }
  return IngredientSlotItem.rehydrate({
    id: row.id,
    ingredientId: row.ingredientId!,
    quantity: Quantity.fromCanonical(row.quantityValue!, row.quantityUnit!),
  })
}

export const MenuMapper = {
  toDomain(row: MenuRow, itemRows: ReadonlyArray<MenuSlotItemRow>): Menu {
    const byKey = new Map<string, { dayOfWeek: DayOfWeek, mealType: MealType, items: MenuSlotItem[] }>()
    for (const itemRow of itemRows) {
      const key = `${itemRow.dayOfWeek}|${itemRow.mealType}`
      let group = byKey.get(key)
      if (!group) {
        group = { dayOfWeek: DayOfWeek.fromString(itemRow.dayOfWeek), mealType: MealType.fromString(itemRow.mealType), items: [] }
        byKey.set(key, group)
      }
      group.items.push(itemToDomain(itemRow))
    }

    const slots = Array.from(byKey.values()).map((group) =>
      MenuSlot.rehydrate({ dayOfWeek: group.dayOfWeek, mealType: group.mealType, items: group.items }),
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

  itemToPersistence(menuId: string, dayOfWeek: DayOfWeek, mealType: MealType, item: MenuSlotItem): NewMenuSlotItemRow {
    if (item.kind === 'recipe') {
      return {
        id: item.id,
        menuId,
        dayOfWeek: dayOfWeek.value,
        mealType: mealType.value,
        kind: 'recipe',
        recipeId: item.recipeId,
        servings: item.servings,
        ingredientId: null,
        quantityValue: null,
        quantityUnit: null,
      }
    }
    return {
      id: item.id,
      menuId,
      dayOfWeek: dayOfWeek.value,
      mealType: mealType.value,
      kind: 'ingredient',
      recipeId: null,
      servings: null,
      ingredientId: item.ingredientId,
      quantityValue: item.quantity.value,
      quantityUnit: item.quantity.unit,
    }
  },
}
