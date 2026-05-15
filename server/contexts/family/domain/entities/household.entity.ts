import type { InviteCode } from '../value-objects/invite-code.vo'

export interface HouseholdProps {
  id: string
  name: string
  inviteCode: InviteCode
  createdAt: Date
  updatedAt: Date
}

export class Household {
  readonly id: string
  readonly name: string
  readonly inviteCode: InviteCode
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: HouseholdProps) {
    this.id = props.id
    this.name = props.name
    this.inviteCode = props.inviteCode
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: { id: string, name: string, inviteCode: InviteCode, now?: Date }): Household {
    const now = props.now ?? new Date()
    const name = props.name.trim()
    if (name.length === 0) {
      throw new Error('Household name must not be empty.')
    }
    return new Household({
      id: props.id,
      name,
      inviteCode: props.inviteCode,
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: HouseholdProps): Household {
    return new Household(props)
  }
}
