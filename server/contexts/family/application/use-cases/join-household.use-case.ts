import { HouseholdMember } from '../../domain/entities/household-member.entity'
import { AlreadyInHouseholdError } from '../../domain/errors/already-in-household.error'
import { HouseholdNotFoundError } from '../../domain/errors/household-not-found.error'
import type { IHouseholdRepository } from '../../domain/ports/household-repository.port'
import { InviteCode } from '../../domain/value-objects/invite-code.vo'

export interface JoinHouseholdInput {
  userId: string
  inviteCode: string
}

export interface JoinHouseholdResult {
  householdId: string
  name: string
}

export class JoinHouseholdUseCase {
  constructor(private readonly households: IHouseholdRepository) {}

  async execute(input: JoinHouseholdInput): Promise<JoinHouseholdResult> {
    const existing = await this.households.findForUser(input.userId)
    if (existing) {
      throw new AlreadyInHouseholdError()
    }

    const code = InviteCode.fromString(input.inviteCode)
    const household = await this.households.findByInviteCode(code)
    if (!household) {
      throw new HouseholdNotFoundError()
    }

    await this.households.addMember(
      HouseholdMember.create({ householdId: household.id, userId: input.userId }),
    )

    return { householdId: household.id, name: household.name }
  }
}
