import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import {
  wineBottles,
  wineCellars,
  wineRows,
  wineShelves,
} from '../../../../database/schema/wine-cellar'
import type { Cellar } from '../../domain/entities/cellar.entity'
import type { Row } from '../../domain/entities/row.entity'
import type { Shelf } from '../../domain/entities/shelf.entity'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'
import { CellarMapper } from '../mappers/cellar.mapper'
import { RowMapper } from '../mappers/row.mapper'
import { ShelfMapper } from '../mappers/shelf.mapper'

export class DrizzleCellarRepository implements ICellarRepository {
  constructor(private readonly db: Database) {}

  // ── Cellars ────────────────────────────────────────────────────────────

  async createCellar(cellar: Cellar): Promise<void> {
    await this.db.insert(wineCellars).values(CellarMapper.toPersistence(cellar))
  }

  async findCellarById(id: string, householdId: string): Promise<Cellar | null> {
    const rows = await this.db
      .select()
      .from(wineCellars)
      .where(and(eq(wineCellars.id, id), eq(wineCellars.householdId, householdId)))
      .limit(1)
    return rows[0] ? CellarMapper.toDomain(rows[0]) : null
  }

  async listCellars(householdId: string): Promise<Cellar[]> {
    const rows = await this.db
      .select()
      .from(wineCellars)
      .where(eq(wineCellars.householdId, householdId))
      .orderBy(asc(wineCellars.name))
    return rows.map(CellarMapper.toDomain)
  }

  async updateCellar(cellar: Cellar): Promise<void> {
    const row = CellarMapper.toPersistence(cellar)
    await this.db
      .update(wineCellars)
      .set({ name: row.name, updatedAt: row.updatedAt })
      .where(and(eq(wineCellars.id, row.id), eq(wineCellars.householdId, row.householdId)))
  }

  async deleteCellar(id: string, householdId: string): Promise<void> {
    const shelves = await this.db
      .select({ id: wineShelves.id })
      .from(wineShelves)
      .where(and(eq(wineShelves.cellarId, id), eq(wineShelves.householdId, householdId)))
    await this.clearPositionsForShelves(shelves.map((s) => s.id), householdId)
    await this.db
      .delete(wineCellars)
      .where(and(eq(wineCellars.id, id), eq(wineCellars.householdId, householdId)))
  }

  // ── Shelves ────────────────────────────────────────────────────────────

  async createShelf(shelf: Shelf): Promise<void> {
    await this.db.insert(wineShelves).values(ShelfMapper.toPersistence(shelf))
  }

  async findShelfById(id: string, householdId: string): Promise<Shelf | null> {
    const rows = await this.db
      .select()
      .from(wineShelves)
      .where(and(eq(wineShelves.id, id), eq(wineShelves.householdId, householdId)))
      .limit(1)
    return rows[0] ? ShelfMapper.toDomain(rows[0]) : null
  }

  async listShelvesByCellar(cellarId: string, householdId: string): Promise<Shelf[]> {
    const rows = await this.db
      .select()
      .from(wineShelves)
      .where(and(eq(wineShelves.cellarId, cellarId), eq(wineShelves.householdId, householdId)))
      .orderBy(asc(wineShelves.position))
    return rows.map(ShelfMapper.toDomain)
  }

  async deleteShelf(id: string, householdId: string): Promise<void> {
    await this.clearPositionsForShelves([id], householdId)
    await this.db
      .delete(wineShelves)
      .where(and(eq(wineShelves.id, id), eq(wineShelves.householdId, householdId)))
  }

  // ── Rows ───────────────────────────────────────────────────────────────

  async createRow(row: Row): Promise<void> {
    await this.db.insert(wineRows).values(RowMapper.toPersistence(row))
  }

  async findRowById(id: string, householdId: string): Promise<Row | null> {
    const rows = await this.db
      .select()
      .from(wineRows)
      .where(and(eq(wineRows.id, id), eq(wineRows.householdId, householdId)))
      .limit(1)
    return rows[0] ? RowMapper.toDomain(rows[0]) : null
  }

  async listRowsByShelf(shelfId: string, householdId: string): Promise<Row[]> {
    const rows = await this.db
      .select()
      .from(wineRows)
      .where(and(eq(wineRows.shelfId, shelfId), eq(wineRows.householdId, householdId)))
      .orderBy(asc(wineRows.position))
    return rows.map(RowMapper.toDomain)
  }

  async updateRow(row: Row): Promise<void> {
    const persisted = RowMapper.toPersistence(row)
    await this.db
      .update(wineRows)
      .set({
        position: persisted.position,
        capacityBack: persisted.capacityBack,
        capacityFront: persisted.capacityFront,
        updatedAt: persisted.updatedAt,
      })
      .where(and(eq(wineRows.id, persisted.id), eq(wineRows.householdId, persisted.householdId)))
  }

  async deleteRow(id: string, householdId: string): Promise<void> {
    await this.clearPositionsForRows([id], householdId)
    await this.db
      .delete(wineRows)
      .where(and(eq(wineRows.id, id), eq(wineRows.householdId, householdId)))
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /** Returns bottles placed in the given shelves to the pool before deletion. */
  private async clearPositionsForShelves(shelfIds: string[], householdId: string): Promise<void> {
    if (shelfIds.length === 0) return
    const rows = await this.db
      .select({ id: wineRows.id })
      .from(wineRows)
      .where(and(inArray(wineRows.shelfId, shelfIds), eq(wineRows.householdId, householdId)))
    await this.clearPositionsForRows(rows.map((r) => r.id), householdId)
  }

  private async clearPositionsForRows(rowIds: string[], householdId: string): Promise<void> {
    if (rowIds.length === 0) return
    await this.db
      .update(wineBottles)
      .set({ rowId: null, depth: null, slotIndex: null })
      .where(and(inArray(wineBottles.rowId, rowIds), eq(wineBottles.householdId, householdId)))
  }
}
