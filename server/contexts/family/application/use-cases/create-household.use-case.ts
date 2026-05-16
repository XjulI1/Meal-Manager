import { randomUUID } from 'node:crypto'
import { HouseholdMember } from '../../domain/entities/household-member.entity'
import { Household } from '../../domain/entities/household.entity'
import { AlreadyInHouseholdError } from '../../domain/errors/already-in-household.error'
import type { IHouseholdInitializer } from '../../domain/ports/household-initializer.port'
import type { IHouseholdRepository } from '../../domain/ports/household-repository.port'
import type { IInviteCodeGenerator } from '../../domain/ports/invite-code-generator.port'

export interface CreateHouseholdInput {
  userId: string
  name: string
}

export interface CreateHouseholdResult {
  id: string
  name: string
  inviteCode: string
}

export class CreateHouseholdUseCase {
  constructor(
    private readonly households: IHouseholdRepository,
    private readonly inviteCodes: IInviteCodeGenerator,
    private readonly initializers: readonly IHouseholdInitializer[] = [],
    private readonly idGenerator: () => string = randomUUID,
  ) {}

  async execute(input: CreateHouseholdInput): Promise<CreateHouseholdResult> {
    const existing = await this.households.findForUser(input.userId)
    if (existing) {
      throw new AlreadyInHouseholdError()
    }

    const household = Household.create({
      id: this.idGenerator(),
      name: input.name,
      inviteCode: this.inviteCodes.generate(),
    })

    const member = HouseholdMember.create({
      householdId: household.id,
      userId: input.userId,
    })

    await this.households.createWithFirstMember(household, member)

    // Run per-household initializers (e.g. seed default ingredient catalog).
    // If any fails, undo the household creation so the user can retry from
    // a clean state instead of being stuck with an unusable empty household.
    try {
      for (const init of this.initializers) {
        await init.initialize(household.id)
      }
    } catch (err) {
      await this.households.removeMember(household.id, member.userId).catch(() => {
        // best-effort rollback; we surface the original error regardless
      })
      throw err
    }

    return {
      id: household.id,
      name: household.name,
      inviteCode: household.inviteCode.value,
    }
  }
}
