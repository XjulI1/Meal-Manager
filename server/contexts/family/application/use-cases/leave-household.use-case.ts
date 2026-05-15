import { NotInHouseholdError } from '../../domain/errors/not-in-household.error'
import type { IHouseholdRepository } from '../../domain/ports/household-repository.port'

export interface LeaveHouseholdInput {
  userId: string
}

export interface LeaveHouseholdResult {
  householdDeleted: boolean
}

export class LeaveHouseholdUseCase {
  constructor(private readonly households: IHouseholdRepository) {}

  async execute(input: LeaveHouseholdInput): Promise<LeaveHouseholdResult> {
    const household = await this.households.findForUser(input.userId)
    if (!household) {
      throw new NotInHouseholdError()
    }

    return this.households.removeMember(household.id, input.userId)
  }
}
