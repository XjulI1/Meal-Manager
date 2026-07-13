export interface CellarProps {
  id: string
  householdId: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export class Cellar {
  readonly id: string
  readonly householdId: string
  readonly name: string
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: CellarProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.name = props.name
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: { id: string, householdId: string, name: string, now?: Date }): Cellar {
    const now = props.now ?? new Date()
    return new Cellar({
      id: props.id,
      householdId: props.householdId,
      name: props.name.trim(),
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: CellarProps): Cellar {
    return new Cellar(props)
  }

  withName(name: string, now: Date = new Date()): Cellar {
    return new Cellar({ ...this.props(), name: name.trim(), updatedAt: now })
  }

  private props(): CellarProps {
    return {
      id: this.id,
      householdId: this.householdId,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
