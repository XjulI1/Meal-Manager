import type { IUserHouseholdResolver } from '../../../../server/contexts/platform/domain/ports/user-household-resolver.port'

export class FakeUserHouseholdResolver implements IUserHouseholdResolver {
  private readonly byUser = new Map<string, string>()

  bind(userId: string, householdId: string): void {
    this.byUser.set(userId, householdId)
  }

  unbind(userId: string): void {
    this.byUser.delete(userId)
  }

  async resolveForUser(userId: string): Promise<{ householdId: string } | null> {
    const householdId = this.byUser.get(userId)
    return householdId ? { householdId } : null
  }
}
