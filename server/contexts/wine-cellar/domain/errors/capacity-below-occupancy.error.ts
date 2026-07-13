import type { BottleDepth } from '../value-objects/slot-position.vo'

export class CapacityBelowOccupancyError extends Error {
  override readonly name = 'CapacityBelowOccupancyError'
  constructor(
    readonly rowId: string,
    readonly depth: BottleDepth,
    readonly requestedCapacity: number,
    readonly occupancy: number,
  ) {
    super(
      `Cannot set ${depth} capacity of row ${rowId} to ${requestedCapacity}: `
      + `${occupancy} slot(s) are already occupied.`,
    )
  }
}
