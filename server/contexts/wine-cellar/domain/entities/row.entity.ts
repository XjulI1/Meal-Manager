import type { BottleDepth } from '../value-objects/slot-position.vo'

export interface RowProps {
  id: string
  householdId: string
  shelfId: string
  position: number
  capacityBack: number
  capacityFront: number
  createdAt: Date
  updatedAt: Date
}

export class InvalidRowCapacityError extends Error {
  override readonly name = 'InvalidRowCapacityError'
}

/** A row (étage) with a mandatory back rack and an optional front rack. */
export class Row {
  readonly id: string
  readonly householdId: string
  readonly shelfId: string
  readonly position: number
  readonly capacityBack: number
  readonly capacityFront: number
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: RowProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.shelfId = props.shelfId
    this.position = props.position
    this.capacityBack = props.capacityBack
    this.capacityFront = props.capacityFront
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: {
    id: string
    householdId: string
    shelfId: string
    position: number
    capacityBack: number
    capacityFront: number
    now?: Date
  }): Row {
    Row.assertCapacities(props.capacityBack, props.capacityFront)
    const now = props.now ?? new Date()
    return new Row({
      id: props.id,
      householdId: props.householdId,
      shelfId: props.shelfId,
      position: props.position,
      capacityBack: props.capacityBack,
      capacityFront: props.capacityFront,
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: RowProps): Row {
    return new Row(props)
  }

  capacityFor(depth: BottleDepth): number {
    return depth === 'back' ? this.capacityBack : this.capacityFront
  }

  hasSlot(depth: BottleDepth, index: number): boolean {
    return index >= 1 && index <= this.capacityFor(depth)
  }

  withCapacities(capacityBack: number, capacityFront: number, now: Date = new Date()): Row {
    Row.assertCapacities(capacityBack, capacityFront)
    return new Row({ ...this.props(), capacityBack, capacityFront, updatedAt: now })
  }

  withPosition(position: number, now: Date = new Date()): Row {
    return new Row({ ...this.props(), position, updatedAt: now })
  }

  private static assertCapacities(back: number, front: number): void {
    if (!Number.isInteger(back) || back < 1) {
      throw new InvalidRowCapacityError(`Back capacity must be an integer ≥ 1 (got ${back}).`)
    }
    if (!Number.isInteger(front) || front < 0) {
      throw new InvalidRowCapacityError(`Front capacity must be an integer ≥ 0 (got ${front}).`)
    }
  }

  private props(): RowProps {
    return {
      id: this.id,
      householdId: this.householdId,
      shelfId: this.shelfId,
      position: this.position,
      capacityBack: this.capacityBack,
      capacityFront: this.capacityFront,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
