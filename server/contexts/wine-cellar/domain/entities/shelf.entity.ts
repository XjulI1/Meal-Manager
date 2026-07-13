export interface ShelfProps {
  id: string
  householdId: string
  cellarId: string
  label: string | null
  position: number
  createdAt: Date
  updatedAt: Date
}

export class Shelf {
  readonly id: string
  readonly householdId: string
  readonly cellarId: string
  readonly label: string | null
  readonly position: number
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: ShelfProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.cellarId = props.cellarId
    this.label = props.label
    this.position = props.position
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: {
    id: string
    householdId: string
    cellarId: string
    label?: string | null
    position: number
    now?: Date
  }): Shelf {
    const now = props.now ?? new Date()
    const label = props.label?.trim()
    return new Shelf({
      id: props.id,
      householdId: props.householdId,
      cellarId: props.cellarId,
      label: label && label.length > 0 ? label : null,
      position: props.position,
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: ShelfProps): Shelf {
    return new Shelf(props)
  }
}
