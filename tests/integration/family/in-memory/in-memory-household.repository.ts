import type { HouseholdMember } from '../../../../server/contexts/family/domain/entities/household-member.entity'
import type { Household } from '../../../../server/contexts/family/domain/entities/household.entity'
import { AlreadyInHouseholdError } from '../../../../server/contexts/family/domain/errors/already-in-household.error'
import type { HouseholdWithMembers, IHouseholdRepository } from '../../../../server/contexts/family/domain/ports/household-repository.port'
import type { InviteCode } from '../../../../server/contexts/family/domain/value-objects/invite-code.vo'

export class InMemoryHouseholdRepository implements IHouseholdRepository {
  private readonly households = new Map<string, Household>()
  private readonly members = new Set<string>() // `${householdId}|${userId}`
  private readonly memberJoinedAt = new Map<string, Date>()
  /** Maps userId → email for member listing. Populated by the test harness. */
  readonly userEmails = new Map<string, string>()

  async findById(id: string): Promise<Household | null> {
    return this.households.get(id) ?? null
  }

  async findByInviteCode(code: InviteCode): Promise<Household | null> {
    for (const h of this.households.values()) {
      if (h.inviteCode.equals(code)) return h
    }
    return null
  }

  async findForUser(userId: string): Promise<Household | null> {
    for (const key of this.members) {
      const [householdId, member] = key.split('|') as [string, string]
      if (member === userId) {
        return this.households.get(householdId) ?? null
      }
    }
    return null
  }

  async findWithMembersForUser(userId: string): Promise<HouseholdWithMembers | null> {
    const household = await this.findForUser(userId)
    if (!household) return null

    const members: { userId: string, email: string, joinedAt: Date }[] = []
    for (const key of this.members) {
      const [hid, uid] = key.split('|') as [string, string]
      if (hid === household.id) {
        members.push({
          userId: uid,
          email: this.userEmails.get(uid) ?? `${uid}@unknown`,
          joinedAt: this.memberJoinedAt.get(key) ?? new Date(0),
        })
      }
    }
    return { household, members }
  }

  async countMembers(householdId: string): Promise<number> {
    let count = 0
    for (const key of this.members) {
      const [hid] = key.split('|') as [string]
      if (hid === householdId) count++
    }
    return count
  }

  async createWithFirstMember(household: Household, member: HouseholdMember): Promise<void> {
    if (await this.findForUser(member.userId)) {
      throw new AlreadyInHouseholdError()
    }
    this.households.set(household.id, household)
    this.addMemberSync(member)
  }

  async addMember(member: HouseholdMember): Promise<void> {
    if (await this.findForUser(member.userId)) {
      throw new AlreadyInHouseholdError()
    }
    this.addMemberSync(member)
  }

  async removeMember(householdId: string, userId: string): Promise<{ householdDeleted: boolean }> {
    const key = `${householdId}|${userId}`
    this.members.delete(key)
    this.memberJoinedAt.delete(key)
    const remaining = await this.countMembers(householdId)
    if (remaining === 0) {
      this.households.delete(householdId)
      return { householdDeleted: true }
    }
    return { householdDeleted: false }
  }

  private addMemberSync(member: HouseholdMember): void {
    const key = `${member.householdId}|${member.userId}`
    this.members.add(key)
    this.memberJoinedAt.set(key, member.joinedAt)
  }
}
