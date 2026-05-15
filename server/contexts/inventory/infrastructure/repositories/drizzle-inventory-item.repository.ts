import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { inventoryItems } from '../../../../database/schema/inventory-items'
import type { InventoryItem } from '../../domain/entities/inventory-item.entity'
import type {
  IInventoryItemRepository,
  ListInventoryFilter,
} from '../../domain/ports/inventory-item-repository.port'
import { InventoryItemMapper } from '../mappers/inventory-item.mapper'

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
      .orderBy(asc(inventoryItems.name))

    return rows.map(InventoryItemMapper.toDomain)
  }

  async save(item: InventoryItem): Promise<void> {
    const row = InventoryItemMapper.toPersistence(item)
    await this.db
      .insert(inventoryItems)
      .values(row)
      .onDuplicateKeyUpdate({
        set: {
          name: row.name,
          quantityValue: row.quantityValue,
          quantityUnit: row.quantityUnit,
          location: row.location,
          updatedAt: row.updatedAt,
        },
      })
  }

  async delete(id: string, householdId: string): Promise<void> {
    await this.db
      .delete(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)))
  }
}
