import type { BottleDepth } from '../value-objects/slot-position.vo'

export class SlotOccupiedError extends Error {
  override readonly name = 'SlotOccupiedError'
  constructor(
    readonly rowId: string,
    readonly depth: BottleDepth,
    readonly index: number,
  ) {
    super(`Slot ${depth}#${index} of row ${rowId} is already occupied.`)
  }
}
