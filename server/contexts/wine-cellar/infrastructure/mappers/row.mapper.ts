import type { NewWineRowRow, WineRowRow } from '../../../../database/schema/wine-cellar'
import { Row } from '../../domain/entities/row.entity'

export const RowMapper = {
  toDomain(row: WineRowRow): Row {
    return Row.rehydrate({
      id: row.id,
      householdId: row.householdId,
      shelfId: row.shelfId,
      position: row.position,
      capacityBack: row.capacityBack,
      capacityFront: row.capacityFront,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(entity: Row): NewWineRowRow {
    return {
      id: entity.id,
      householdId: entity.householdId,
      shelfId: entity.shelfId,
      position: entity.position,
      capacityBack: entity.capacityBack,
      capacityFront: entity.capacityFront,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  },
}
