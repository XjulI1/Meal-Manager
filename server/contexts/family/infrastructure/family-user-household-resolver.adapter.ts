import type { IUserHouseholdResolver } from '../../platform/domain/ports/user-household-resolver.port'
import type { IHouseholdRepository } from '../domain/ports/household-repository.port'

/**
 * Cross-context adapter: implements the platform's `IUserHouseholdResolver`
 * port by delegating to the family `IHouseholdRepository`. The platform
 * context only depends on its own port; this file does the bridging.
 */
export class FamilyUserHouseholdResolverAdapter implements IUserHouseholdResolver {
  constructor(private readonly households: IHouseholdRepository) {}

  async resolveForUser(userId: string): Promise<{ householdId: string } | null> {
    const household = await this.households.findForUser(userId)
    return household ? { householdId: household.id } : null
  }
}
