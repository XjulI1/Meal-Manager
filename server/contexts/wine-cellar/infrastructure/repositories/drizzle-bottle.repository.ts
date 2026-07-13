import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { wineBottles } from '../../../../database/schema/wine-cellar'
import type { Bottle } from '../../domain/entities/bottle.entity'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { BottleDepth } from '../../domain/value-objects/slot-position.vo'
import { BottleMapper } from '../mappers/bottle.mapper'

export class DrizzleBottleRepository implements IBottleRepository {
  constructor(private readonly db: Database) {}

  async create(bottle: Bottle): Promise<void> {
    await this.db.insert(wineBottles).values(BottleMapper.toPersistence(bottle))
  }

  async createMany(bottles: Bottle[]): Promise<void> {
    if (bottles.length === 0) return
    await this.db.insert(wineBottles).values(bottles.map(BottleMapper.toPersistence))
  }

  async findById(id: string, householdId: string): Promise<Bottle | null> {
    const rows = await this.db
      .select()
      .from(wineBottles)
      .where(and(eq(wineBottles.id, id), eq(wineBottles.householdId, householdId)))
      .limit(1)
    return rows[0] ? BottleMapper.toDomain(rows[0]) : null
  }

  async findBySlot(
    rowId: string,
    depth: BottleDepth,
    index: number,
    householdId: string,
  ): Promise<Bottle | null> {
    const rows = await this.db
      .select()
      .from(wineBottles)
      .where(and(
        eq(wineBottles.householdId, householdId),
        eq(wineBottles.status, 'in_stock'),
        eq(wineBottles.rowId, rowId),
        eq(wineBottles.depth, depth),
        eq(wineBottles.slotIndex, index),
      ))
      .limit(1)
    return rows[0] ? BottleMapper.toDomain(rows[0]) : null
  }

  async listPlacedByRowIds(rowIds: string[], householdId: string): Promise<Bottle[]> {
    if (rowIds.length === 0) return []
    const rows = await this.db
      .select()
      .from(wineBottles)
      .where(and(
        eq(wineBottles.householdId, householdId),
        eq(wineBottles.status, 'in_stock'),
        isNotNull(wineBottles.rowId),
        inArray(wineBottles.rowId, rowIds),
      ))
    return rows.map(BottleMapper.toDomain)
  }

  async listInStock(householdId: string): Promise<Bottle[]> {
    const rows = await this.db
      .select()
      .from(wineBottles)
      .where(and(eq(wineBottles.householdId, householdId), eq(wineBottles.status, 'in_stock')))
    return rows.map(BottleMapper.toDomain)
  }

  async listByWine(wineId: string, householdId: string): Promise<Bottle[]> {
    const rows = await this.db
      .select()
      .from(wineBottles)
      .where(and(
        eq(wineBottles.householdId, householdId),
        eq(wineBottles.wineId, wineId),
        eq(wineBottles.status, 'in_stock'),
      ))
    return rows.map(BottleMapper.toDomain)
  }

  async listConsumed(householdId: string): Promise<Bottle[]> {
    const rows = await this.db
      .select()
      .from(wineBottles)
      .where(and(eq(wineBottles.householdId, householdId), eq(wineBottles.status, 'consumed')))
      .orderBy(desc(wineBottles.exitDate))
    return rows.map(BottleMapper.toDomain)
  }

  async update(bottle: Bottle): Promise<void> {
    const row = BottleMapper.toPersistence(bottle)
    await this.db
      .update(wineBottles)
      .set({
        sizeMl: row.sizeMl,
        buyingPriceCents: row.buyingPriceCents,
        addedDate: row.addedDate,
        status: row.status,
        rowId: row.rowId,
        depth: row.depth,
        slotIndex: row.slotIndex,
        exitReason: row.exitReason,
        exitDate: row.exitDate,
        tastingNote: row.tastingNote,
        updatedAt: row.updatedAt,
      })
      .where(and(eq(wineBottles.id, row.id), eq(wineBottles.householdId, row.householdId)))
  }
}
