import type { MenuSlot } from '../../../../server/contexts/meal-planning/domain/entities/menu-slot.entity'
import { Menu } from '../../../../server/contexts/meal-planning/domain/entities/menu.entity'
import type { IMenuRepository } from '../../../../server/contexts/meal-planning/domain/ports/menu-repository.port'
import type { DayOfWeek } from '../../../../server/contexts/meal-planning/domain/value-objects/day-of-week.vo'
import type { MealType } from '../../../../server/contexts/meal-planning/domain/value-objects/meal-type.vo'
import type { WeekStart } from '../../../../server/contexts/meal-planning/domain/value-objects/week-start.vo'

interface StoredMenu {
  id: string
  householdId: string
  weekStart: WeekStart
  slots: Map<string, MenuSlot>
  createdAt: Date
  updatedAt: Date
}

function slotKey(slot: MenuSlot): string {
  return `${slot.dayOfWeek.value}|${slot.mealType.value}`
}

function buildSlotKey(day: DayOfWeek, meal: MealType): string {
  return `${day.value}|${meal.value}`
}

export class InMemoryMenuRepository implements IMenuRepository {
  private readonly menus = new Map<string, StoredMenu>()

  async findByWeek(householdId: string, weekStart: WeekStart): Promise<Menu | null> {
    for (const m of this.menus.values()) {
      if (m.householdId === householdId && m.weekStart.equals(weekStart)) {
        return this.toDomain(m)
      }
    }
    return null
  }

  async findById(id: string, householdId: string): Promise<Menu | null> {
    const m = this.menus.get(id)
    if (!m || m.householdId !== householdId) return null
    return this.toDomain(m)
  }

  async create(menu: Menu): Promise<void> {
    if (this.menus.has(menu.id)) {
      throw new Error(`Menu already exists: ${menu.id}`)
    }
    this.menus.set(menu.id, {
      id: menu.id,
      householdId: menu.householdId,
      weekStart: menu.weekStart,
      slots: new Map(menu.slots.map((s) => [slotKey(s), s])),
      createdAt: menu.createdAt,
      updatedAt: menu.updatedAt,
    })
  }

  async upsertSlot(menuId: string, slot: MenuSlot, updatedAt: Date): Promise<void> {
    const m = this.menus.get(menuId)
    if (!m) throw new Error(`Unknown menu: ${menuId}`)
    m.slots.set(slotKey(slot), slot)
    m.updatedAt = updatedAt
  }

  async removeSlot(menuId: string, dayOfWeek: DayOfWeek, mealType: MealType, updatedAt: Date): Promise<void> {
    const m = this.menus.get(menuId)
    if (!m) throw new Error(`Unknown menu: ${menuId}`)
    m.slots.delete(buildSlotKey(dayOfWeek, mealType))
    m.updatedAt = updatedAt
  }

  private toDomain(m: StoredMenu): Menu {
    return Menu.rehydrate({
      id: m.id,
      householdId: m.householdId,
      weekStart: m.weekStart,
      slots: Array.from(m.slots.values()),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })
  }
}
