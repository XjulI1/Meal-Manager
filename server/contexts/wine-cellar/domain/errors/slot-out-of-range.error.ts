import type { BottleDepth } from '../value-objects/slot-position.vo'

export class SlotOutOfRangeError extends Error {
  override readonly name = 'SlotOutOfRangeError'
  constructor(
    readonly rowId: string,
    readonly depth: BottleDepth,
    readonly index: number,
    readonly capacity: number,
  ) {
    super(
      `Slot ${depth}#${index} is out of range for row ${rowId} (capacity ${capacity}).`,
    )
  }
}
