import type { NewWineCellarRow, WineCellarRow } from '../../../../database/schema/wine-cellar'
import { Cellar } from '../../domain/entities/cellar.entity'

export const CellarMapper = {
  toDomain(row: WineCellarRow): Cellar {
    return Cellar.rehydrate({
      id: row.id,
      householdId: row.householdId,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(cellar: Cellar): NewWineCellarRow {
    return {
      id: cellar.id,
      householdId: cellar.householdId,
      name: cellar.name,
      createdAt: cellar.createdAt,
      updatedAt: cellar.updatedAt,
    }
  },
}
