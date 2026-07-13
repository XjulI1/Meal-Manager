import type { NewWineShelfRow, WineShelfRow } from '../../../../database/schema/wine-cellar'
import { Shelf } from '../../domain/entities/shelf.entity'

export const ShelfMapper = {
  toDomain(row: WineShelfRow): Shelf {
    return Shelf.rehydrate({
      id: row.id,
      householdId: row.householdId,
      cellarId: row.cellarId,
      label: row.label,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(shelf: Shelf): NewWineShelfRow {
    return {
      id: shelf.id,
      householdId: shelf.householdId,
      cellarId: shelf.cellarId,
      label: shelf.label,
      position: shelf.position,
      createdAt: shelf.createdAt,
      updatedAt: shelf.updatedAt,
    }
  },
}
