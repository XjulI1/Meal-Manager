import type { HouseholdMember } from '../entities/household-member.entity'
import type { Household } from '../entities/household.entity'
import type { InviteCode } from '../value-objects/invite-code.vo'

export interface HouseholdWithMembers {
  household: Household
  members: ReadonlyArray<{ userId: string, email: string, joinedAt: Date }>
}

export interface IHouseholdRepository {
  findById(id: string): Promise<Household | null>
  findByInviteCode(code: InviteCode): Promise<Household | null>
  findForUser(userId: string): Promise<Household | null>
  findWithMembersForUser(userId: string): Promise<HouseholdWithMembers | null>
  countMembers(householdId: string): Promise<number>

  /** Create a household and register `creator` as its first member, atomically. */
  createWithFirstMember(household: Household, member: HouseholdMember): Promise<void>

  /** Add a member to an existing household. Throws if the user already belongs to a household. */
  addMember(member: HouseholdMember): Promise<void>

  /** Remove a member. Deletes the household when it was the last member. */
  removeMember(householdId: string, userId: string): Promise<{ householdDeleted: boolean }>
}
