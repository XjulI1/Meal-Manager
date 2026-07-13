export type BottleDepth = 'front' | 'back'

export class InvalidSlotPositionError extends Error {
  override readonly name = 'InvalidSlotPositionError'
}

/**
 * Identifies a physical slot inside a row: a depth (front/back) and a 1-based
 * index. Validity against the row's capacity is enforced at the use-case level
 * (the VO only guarantees a well-formed position).
 */
export class SlotPosition {
  private constructor(
    readonly rowId: string,
    readonly depth: BottleDepth,
    readonly index: number,
  ) {}

  static create(props: { rowId: string, depth: BottleDepth, index: number }): SlotPosition {
    if (!props.rowId) {
      throw new InvalidSlotPositionError('Slot position requires a rowId.')
    }
    if (props.depth !== 'front' && props.depth !== 'back') {
      throw new InvalidSlotPositionError(`Invalid depth: "${props.depth}".`)
    }
    if (!Number.isInteger(props.index) || props.index < 1) {
      throw new InvalidSlotPositionError(`Slot index must be a positive integer (got ${props.index}).`)
    }
    return new SlotPosition(props.rowId, props.depth, props.index)
  }

  equals(other: SlotPosition): boolean {
    return this.rowId === other.rowId && this.depth === other.depth && this.index === other.index
  }
}
