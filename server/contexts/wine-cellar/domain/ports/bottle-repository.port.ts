import type { Bottle } from '../entities/bottle.entity'
import type { BottleDepth } from '../value-objects/slot-position.vo'

export interface IBottleRepository {
  create(bottle: Bottle): Promise<void>
  /** Bulk insert (used by the Vinotag import). */
  createMany(bottles: Bottle[]): Promise<void>
  findById(id: string, householdId: string): Promise<Bottle | null>

  /**
   * Returns the in-stock bottle occupying a slot, or null. Backs the
   * slot-occupancy check on placement. MUST throw the repository's
   * unique-violation on a concurrent conflicting insert/update so the use case
   * can surface `SlotOccupiedError`.
   */
  findBySlot(
    rowId: string,
    depth: BottleDepth,
    index: number,
    householdId: string,
  ): Promise<Bottle | null>

  /** All in-stock, placed bottles located in any of the given rows. */
  listPlacedByRowIds(rowIds: string[], householdId: string): Promise<Bottle[]>

  /** All in-stock bottles of a household (placed and unplaced). */
  listInStock(householdId: string): Promise<Bottle[]>

  /** In-stock bottles of a given wine. */
  listByWine(wineId: string, householdId: string): Promise<Bottle[]>

  /** Consumed bottles of a household (the exit journal). */
  listConsumed(householdId: string): Promise<Bottle[]>

  update(bottle: Bottle): Promise<void>
}
