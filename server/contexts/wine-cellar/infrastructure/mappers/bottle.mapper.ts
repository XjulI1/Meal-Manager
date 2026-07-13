import { Quantity } from '../../../../../shared/units/quantity'
import type { NewWineBottleRow, WineBottleRow } from '../../../../database/schema/wine-cellar'
import { Bottle } from '../../domain/entities/bottle.entity'
import { SlotPosition } from '../../domain/value-objects/slot-position.vo'

export const BottleMapper = {
  toDomain(row: WineBottleRow): Bottle {
    const position = row.rowId && row.depth && row.slotIndex !== null
      ? SlotPosition.create({ rowId: row.rowId, depth: row.depth, index: row.slotIndex })
      : null

    const exit = row.exitReason
      ? { reason: row.exitReason, date: row.exitDate ?? '', tastingNote: row.tastingNote }
      : null

    return Bottle.rehydrate({
      id: row.id,
      householdId: row.householdId,
      wineId: row.wineId,
      size: Quantity.fromCanonical(row.sizeMl, 'ml'),
      buyingPriceCents: row.buyingPriceCents,
      addedDate: row.addedDate,
      status: row.status,
      position,
      exit,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(bottle: Bottle): NewWineBottleRow {
    return {
      id: bottle.id,
      householdId: bottle.householdId,
      wineId: bottle.wineId,
      sizeMl: bottle.size.value,
      buyingPriceCents: bottle.buyingPriceCents,
      addedDate: bottle.addedDate,
      status: bottle.status,
      rowId: bottle.position ? bottle.position.rowId : null,
      depth: bottle.position ? bottle.position.depth : null,
      slotIndex: bottle.position ? bottle.position.index : null,
      exitReason: bottle.exit ? bottle.exit.reason : null,
      exitDate: bottle.exit ? bottle.exit.date : null,
      tastingNote: bottle.exit ? bottle.exit.tastingNote : null,
      createdAt: bottle.createdAt,
      updatedAt: bottle.updatedAt,
    }
  },
}
