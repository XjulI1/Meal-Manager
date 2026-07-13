import type { Quantity } from '../../../../../shared/units/quantity'
import { BottleAlreadyExitedError } from '../errors/bottle-already-exited.error'
import type { SlotPosition } from '../value-objects/slot-position.vo'

export type BottleStatus = 'in_stock' | 'consumed'
export type ExitReason = 'consumed' | 'gifted' | 'broken'

export interface BottleExit {
  reason: ExitReason
  /** Date-only, ISO `YYYY-MM-DD`. */
  date: string
  tastingNote: string | null
}

export interface BottleProps {
  id: string
  householdId: string
  wineId: string
  size: Quantity
  buyingPriceCents: number | null
  /** Date-only, ISO `YYYY-MM-DD`. */
  addedDate: string | null
  status: BottleStatus
  position: SlotPosition | null
  exit: BottleExit | null
  createdAt: Date
  updatedAt: Date
}

export interface BottleAttributes {
  size?: Quantity
  buyingPriceCents?: number | null
  addedDate?: string | null
}

export class Bottle {
  readonly id: string
  readonly householdId: string
  readonly wineId: string
  readonly size: Quantity
  readonly buyingPriceCents: number | null
  readonly addedDate: string | null
  readonly status: BottleStatus
  readonly position: SlotPosition | null
  readonly exit: BottleExit | null
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: BottleProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.wineId = props.wineId
    this.size = props.size
    this.buyingPriceCents = props.buyingPriceCents
    this.addedDate = props.addedDate
    this.status = props.status
    this.position = props.position
    this.exit = props.exit
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: {
    id: string
    householdId: string
    wineId: string
    size: Quantity
    buyingPriceCents?: number | null
    addedDate?: string | null
    position?: SlotPosition | null
    now?: Date
  }): Bottle {
    const now = props.now ?? new Date()
    return new Bottle({
      id: props.id,
      householdId: props.householdId,
      wineId: props.wineId,
      size: props.size,
      buyingPriceCents: props.buyingPriceCents ?? null,
      addedDate: props.addedDate ?? null,
      status: 'in_stock',
      position: props.position ?? null,
      exit: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: BottleProps): Bottle {
    return new Bottle(props)
  }

  get isInStock(): boolean {
    return this.status === 'in_stock'
  }

  /** Place (or move) the bottle into a slot. Requires the bottle to be in stock. */
  placeAt(position: SlotPosition, now: Date = new Date()): Bottle {
    if (!this.isInStock) throw new BottleAlreadyExitedError(this.id)
    return new Bottle({ ...this.props(), position, updatedAt: now })
  }

  /** Return the bottle to the unplaced pool. */
  unassign(now: Date = new Date()): Bottle {
    if (!this.isInStock) throw new BottleAlreadyExitedError(this.id)
    return new Bottle({ ...this.props(), position: null, updatedAt: now })
  }

  /** Take the bottle out of stock. Frees its slot and records a journal entry. */
  takeOut(reason: ExitReason, date: string, tastingNote: string | null, now: Date = new Date()): Bottle {
    if (!this.isInStock) throw new BottleAlreadyExitedError(this.id)
    return new Bottle({
      ...this.props(),
      status: 'consumed',
      position: null,
      exit: { reason, date, tastingNote },
      updatedAt: now,
    })
  }

  withAttributes(attributes: BottleAttributes, now: Date = new Date()): Bottle {
    return new Bottle({
      ...this.props(),
      size: attributes.size ?? this.size,
      buyingPriceCents: attributes.buyingPriceCents === undefined ? this.buyingPriceCents : attributes.buyingPriceCents,
      addedDate: attributes.addedDate === undefined ? this.addedDate : attributes.addedDate,
      updatedAt: now,
    })
  }

  private props(): BottleProps {
    return {
      id: this.id,
      householdId: this.householdId,
      wineId: this.wineId,
      size: this.size,
      buyingPriceCents: this.buyingPriceCents,
      addedDate: this.addedDate,
      status: this.status,
      position: this.position,
      exit: this.exit,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
