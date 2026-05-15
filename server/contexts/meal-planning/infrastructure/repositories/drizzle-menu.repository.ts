import { and, eq } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { menuSlots, menus } from '../../../../database/schema/menus'
import type { MenuSlot } from '../../domain/entities/menu-slot.entity'
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

    const slotRows = await this.db.select().from(menuSlots).where(eq(menuSlots.menuId, row.id))
    return MenuMapper.toDomain(row, slotRows)
  }

  async findById(id: string, householdId: string): Promise<Menu | null> {
    const rows = await this.db
      .select()
      .from(menus)
      .where(and(eq(menus.id, id), eq(menus.householdId, householdId)))
      .limit(1)
    const row = rows[0]
    if (!row) return null

    const slotRows = await this.db.select().from(menuSlots).where(eq(menuSlots.menuId, row.id))
    return MenuMapper.toDomain(row, slotRows)
  }

  async create(menu: Menu): Promise<void> {
    await this.db.insert(menus).values(MenuMapper.toPersistence(menu))
  }

  async upsertSlot(menuId: string, slot: MenuSlot, updatedAt: Date): Promise<void> {
    const row = MenuMapper.slotToPersistence(menuId, slot)
    await this.db.transaction(async (tx) => {
      await tx
        .insert(menuSlots)
        .values(row)
        .onDuplicateKeyUpdate({
          set: {
            recipeId: row.recipeId,
            servings: row.servings,
          },
        })
      await tx.update(menus).set({ updatedAt }).where(eq(menus.id, menuId))
    })
  }

  async removeSlot(menuId: string, dayOfWeek: DayOfWeek, mealType: MealType, updatedAt: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(menuSlots)
        .where(and(
          eq(menuSlots.menuId, menuId),
          eq(menuSlots.dayOfWeek, dayOfWeek.value),
          eq(menuSlots.mealType, mealType.value),
        ))
      await tx.update(menus).set({ updatedAt }).where(eq(menus.id, menuId))
    })
  }
}
