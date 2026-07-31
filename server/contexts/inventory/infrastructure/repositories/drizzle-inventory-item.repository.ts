import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { inventoryItems } from '../../../../database/schema/inventory-items'
import type { InventoryItem } from '../../domain/entities/inventory-item.entity'
import { DuplicateInventoryLineError } from '../../domain/errors/duplicate-inventory-line.error'
import type {
  IInventoryItemRepository,
  ListInventoryFilter,
} from '../../domain/ports/inventory-item-repository.port'
import type { StorageLocation } from '../../domain/value-objects/storage-location.vo'
import { InventoryItemMapper } from '../mappers/inventory-item.mapper'

/**
 * mysql2 raises `ER_DUP_ENTRY` (code 1062) on any unique-constraint violation.
 * drizzle-orm >=0.44 wraps driver errors in `DrizzleQueryError`, with the
 * original mysql2 error attached as `.cause` — check both shapes.
 */
function isUniqueConstraintViolation(error: unknown): boolean {
  const matchesDupEntry = (candidate: unknown): boolean => {
    if (typeof candidate !== 'object' || candidate === null) return false
    const { code, errno } = candidate as { code?: string, errno?: number }
    return code === 'ER_DUP_ENTRY' || errno === 1062
  }
  return (
    matchesDupEntry(error)
    || matchesDupEntry(typeof error === 'object' && error !== null ? (error as { cause?: unknown }).cause : undefined)
  )
}

export class DrizzleInventoryItemRepository implements IInventoryItemRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string, householdId: string): Promise<InventoryItem | null> {
    const rows = await this.db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)))
      .limit(1)
    const row = rows[0]
    return row ? InventoryItemMapper.toDomain(row) : null
  }

  async findByIngredientAndLocation(
    ingredientId: string,
    location: StorageLocation,
    householdId: string,
  ): Promise<InventoryItem | null> {
    const rows = await this.db
      .select()
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.householdId, householdId),
        eq(inventoryItems.ingredientId, ingredientId),
        eq(inventoryItems.location, location.value),
      ))
      .limit(1)
    const row = rows[0]
    return row ? InventoryItemMapper.toDomain(row) : null
  }

  async listForHousehold(
    householdId: string,
    filter: ListInventoryFilter = {},
  ): Promise<InventoryItem[]> {
    const where = filter.location
      ? and(eq(inventoryItems.householdId, householdId), eq(inventoryItems.location, filter.location.value))
      : eq(inventoryItems.householdId, householdId)

    const rows = await this.db
      .select()
      .from(inventoryItems)
      .where(where)
      .orderBy(asc(inventoryItems.ingredientId))

    return rows.map(InventoryItemMapper.toDomain)
  }

  async listByIngredient(ingredientId: string, householdId: string): Promise<InventoryItem[]> {
    const rows = await this.db
      .select()
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.householdId, householdId),
        eq(inventoryItems.ingredientId, ingredientId),
      ))
      .orderBy(asc(inventoryItems.createdAt))

    return rows.map(InventoryItemMapper.toDomain)
  }

  async insert(item: InventoryItem): Promise<void> {
    const row = InventoryItemMapper.toPersistence(item)
    try {
      await this.db.insert(inventoryItems).values(row)
    }
    catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new DuplicateInventoryLineError(
          item.householdId,
          item.ingredientId,
          item.location.value,
        )
      }
      throw error
    }
  }

  async update(item: InventoryItem): Promise<void> {
    const row = InventoryItemMapper.toPersistence(item)
    await this.db
      .update(inventoryItems)
      .set({
        ingredientId: row.ingredientId,
        quantityValue: row.quantityValue,
        quantityUnit: row.quantityUnit,
        location: row.location,
        updatedAt: row.updatedAt,
      })
      .where(and(eq(inventoryItems.id, row.id), eq(inventoryItems.householdId, row.householdId)))
  }

  async delete(id: string, householdId: string): Promise<void> {
    await this.db
      .delete(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)))
  }
}
