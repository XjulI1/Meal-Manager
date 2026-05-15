import { NotInHouseholdError } from '../../domain/errors/not-in-household.error'
import type { IHouseholdRepository } from '../../domain/ports/household-repository.port'

export interface GetCurrentHouseholdInput {
  userId: string
}

export interface GetCurrentHouseholdResult {
  id: string
  name: string
  inviteCode: string
  members: ReadonlyArray<{ userId: string, email: string, joinedAt: Date }>
}

export class GetCurrentHouseholdUseCase {
  constructor(private readonly households: IHouseholdRepository) {}

  async execute(input: GetCurrentHouseholdInput): Promise<GetCurrentHouseholdResult> {
    const view = await this.households.findWithMembersForUser(input.userId)
    if (!view) {
      throw new NotInHouseholdError()
    }
    return {
      id: view.household.id,
      name: view.household.name,
      inviteCode: view.household.inviteCode.value,
      members: view.members,
    }
  }
}
