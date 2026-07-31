import type { BottleView } from '../../../../../shared/dto/wine-cellar'
import { BottleNotFoundError } from '../../domain/errors/bottle-not-found.error'
import { RowNotFoundError } from '../../domain/errors/row-not-found.error'
import { SlotOccupiedError } from '../../domain/errors/slot-occupied.error'
import { SlotOutOfRangeError } from '../../domain/errors/slot-out-of-range.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'
import type { BottleDepth } from '../../domain/value-objects/slot-position.vo'
import { SlotPosition } from '../../domain/value-objects/slot-position.vo'
import { loadStructureIndex } from '../load-structure-index'
import { toBottleView, toPlacementView } from '../wine-cellar-views'

export interface PlaceBottleInput {
  householdId: string
  bottleId: string
  position: { rowId: string, depth: BottleDepth, index: number } | null
}

/** Places, moves, or unassigns a bottle. Enforces slot range and occupancy. */
export class PlaceBottleUseCase {
  constructor(
    private readonly bottles: IBottleRepository,
    private readonly cellars: ICellarRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: PlaceBottleInput): Promise<BottleView> {
    const bottle = await this.bottles.findById(input.bottleId, input.householdId)
    if (!bottle) throw new BottleNotFoundError(input.bottleId)

    const now = this.clock()

    if (input.position === null) {
      const updated = bottle.unassign(now)
      await this.bottles.update(updated)
      return toBottleView(updated, null)
    }

    const { rowId, depth, index } = input.position
    const position = SlotPosition.create({ rowId, depth, index })

    const row = await this.cellars.findRowById(rowId, input.householdId)
    if (!row) throw new RowNotFoundError(rowId)
    if (!row.hasSlot(depth, index)) {
      throw new SlotOutOfRangeError(rowId, depth, index, row.capacityFor(depth))
    }

    const occupant = await this.bottles.findBySlot(rowId, depth, index, input.householdId)
    if (occupant && occupant.id !== bottle.id) {
      throw new SlotOccupiedError(rowId, depth, index)
    }

    const updated = bottle.placeAt(position, now)
    try {
      await this.bottles.update(updated)
    }
    catch (error) {
      // The UNIQUE(row_id, depth, slot_index) index is the concurrency backstop.
      if (isSlotConflict(error)) throw new SlotOccupiedError(rowId, depth, index)
      throw error
    }

    const structure = await loadStructureIndex(this.cellars, input.householdId)
    return toBottleView(updated, toPlacementView(updated, structure))
  }
}

/**
 * drizzle-orm >=0.44 wraps driver errors in `DrizzleQueryError`, with the
 * original mysql2 error attached as `.cause` — check both shapes.
 */
function isSlotConflict(error: unknown): boolean {
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
