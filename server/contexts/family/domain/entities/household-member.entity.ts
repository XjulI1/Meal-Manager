export interface HouseholdMemberProps {
  householdId: string
  userId: string
  joinedAt: Date
}

export class HouseholdMember {
  readonly householdId: string
  readonly userId: string
  readonly joinedAt: Date

  private constructor(props: HouseholdMemberProps) {
    this.householdId = props.householdId
    this.userId = props.userId
    this.joinedAt = props.joinedAt
  }

  static create(props: { householdId: string, userId: string, joinedAt?: Date }): HouseholdMember {
    return new HouseholdMember({
      householdId: props.householdId,
      userId: props.userId,
      joinedAt: props.joinedAt ?? new Date(),
    })
  }

  static rehydrate(props: HouseholdMemberProps): HouseholdMember {
    return new HouseholdMember(props)
  }
}
