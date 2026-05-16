export interface IUserHouseholdResolver {
  /**
   * Returns the household the user is currently a member of, or null if the
   * user does not belong to any household.
   */
  resolveForUser(userId: string): Promise<{ householdId: string } | null>
}
