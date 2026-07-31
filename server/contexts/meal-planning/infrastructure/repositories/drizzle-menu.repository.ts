import { and, eq } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { menuSlotItems, menus } from '../../../../database/schema/menus'
import type { MenuSlotItem } from '../../domain/entities/menu-slot-item.entity'
import type { Menu } from '../../domain/entities/menu.entity'
import type { IMenuRepository } from '../../domain/ports/menu-repository.port'
import type { DayOfWeek } from '../../domain/value-objects/day-of-week.vo'
import type { MealType } from '../../domain/value-objects/meal-type.vo'
import type { WeekStart } from '../../domain/value-objects/week-start.vo'
import { MenuMapper } from '../mappers/menu.mapper'

export class DrizzleMenuRepository implements IMenuRepository {
  constructor(private readonly db: Database) {}

  async findByWeek(householdId: string, weekStart: WeekStart): Promise<Menu | null> {
    const rows = await this.db
      .select()
      .from(menus)
      .where(and(eq(menus.householdId, householdId), eq(menus.weekStart, weekStart.date)))
      .limit(1)
    const row = rows[0]
    if (!row) return null

    const itemRows = await this.db.select().from(menuSlotItems).where(eq(menuSlotItems.menuId, row.id))
    return MenuMapper.toDomain(row, itemRows)
  }

  async findById(id: string, householdId: string): Promise<Menu | null> {
    const rows = await this.db
      .select()
      .from(menus)
      .where(and(eq(menus.id, id), eq(menus.householdId, householdId)))
      .limit(1)
    const row = rows[0]
    if (!row) return null

    const itemRows = await this.db.select().from(menuSlotItems).where(eq(menuSlotItems.menuId, row.id))
    return MenuMapper.toDomain(row, itemRows)
  }

  async create(menu: Menu): Promise<void> {
    await this.db.insert(menus).values(MenuMapper.toPersistence(menu))
  }

  async replaceSlotItems(
    menuId: string,
    dayOfWeek: DayOfWeek,
    mealType: MealType,
    items: ReadonlyArray<MenuSlotItem>,
    updatedAt: Date,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(menuSlotItems)
        .where(and(
          eq(menuSlotItems.menuId, menuId),
          eq(menuSlotItems.dayOfWeek, dayOfWeek.value),
          eq(menuSlotItems.mealType, mealType.value),
        ))
      if (items.length > 0) {
        await tx.insert(menuSlotItems).values(
          items.map((item) => MenuMapper.itemToPersistence(menuId, dayOfWeek, mealType, item)),
        )
      }
      await tx.update(menus).set({ updatedAt }).where(eq(menus.id, menuId))
    })
  }

  async removeSlotItem(menuId: string, itemId: string, updatedAt: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(menuSlotItems).where(and(eq(menuSlotItems.menuId, menuId), eq(menuSlotItems.id, itemId)))
      await tx.update(menus).set({ updatedAt }).where(eq(menus.id, menuId))
    })
  }

  async clearSlot(menuId: string, dayOfWeek: DayOfWeek, mealType: MealType, updatedAt: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(menuSlotItems)
        .where(and(
          eq(menuSlotItems.menuId, menuId),
          eq(menuSlotItems.dayOfWeek, dayOfWeek.value),
          eq(menuSlotItems.mealType, mealType.value),
        ))
      await tx.update(menus).set({ updatedAt }).where(eq(menus.id, menuId))
    })
  }
}
