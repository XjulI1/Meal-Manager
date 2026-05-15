import { and, eq, sql } from 'drizzle-orm'
import type { Database } from '../../../../database/client'
import { householdMembers, households } from '../../../../database/schema/households'
import { users } from '../../../../database/schema/users'
import type { HouseholdMember } from '../../domain/entities/household-member.entity'
import type { Household } from '../../domain/entities/household.entity'
import { AlreadyInHouseholdError } from '../../domain/errors/already-in-household.error'
import type { HouseholdWithMembers, IHouseholdRepository } from '../../domain/ports/household-repository.port'
import type { InviteCode } from '../../domain/value-objects/invite-code.vo'
import { HouseholdMapper } from '../mappers/household.mapper'

export class DrizzleHouseholdRepository implements IHouseholdRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Household | null> {
    const rows = await this.db.select().from(households).where(eq(households.id, id)).limit(1)
    const row = rows[0]
    return row ? HouseholdMapper.toDomain(row) : null
  }

  async findByInviteCode(code: InviteCode): Promise<Household | null> {
    const rows = await this.db
      .select()
      .from(households)
      .where(eq(households.inviteCode, code.value))
      .limit(1)
    const row = rows[0]
    return row ? HouseholdMapper.toDomain(row) : null
  }

  async findForUser(userId: string): Promise<Household | null> {
    const rows = await this.db
      .select({ household: households })
      .from(householdMembers)
      .innerJoin(households, eq(households.id, householdMembers.householdId))
      .where(eq(householdMembers.userId, userId))
      .limit(1)
    const row = rows[0]
    return row ? HouseholdMapper.toDomain(row.household) : null
  }

  async findWithMembersForUser(userId: string): Promise<HouseholdWithMembers | null> {
    const head = await this.findForUser(userId)
    if (!head) return null

    const memberRows = await this.db
      .select({
        userId: householdMembers.userId,
        email: users.email,
        joinedAt: householdMembers.joinedAt,
      })
      .from(householdMembers)
      .innerJoin(users, eq(users.id, householdMembers.userId))
      .where(eq(householdMembers.householdId, head.id))

    return {
      household: head,
      members: memberRows.map((m) => ({
        userId: m.userId,
        email: m.email,
        joinedAt: m.joinedAt,
      })),
    }
  }

  async countMembers(householdId: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, householdId))
    return Number(rows[0]?.count ?? 0)
  }

  async createWithFirstMember(household: Household, member: HouseholdMember): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ householdId: householdMembers.householdId })
        .from(householdMembers)
        .where(eq(householdMembers.userId, member.userId))
        .limit(1)
      if (existing.length > 0) {
        throw new AlreadyInHouseholdError()
      }

      await tx.insert(households).values(HouseholdMapper.toPersistence(household))
      await tx.insert(householdMembers).values({
        householdId: member.householdId,
        userId: member.userId,
        joinedAt: member.joinedAt,
      })
    })
  }

  async addMember(member: HouseholdMember): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ householdId: householdMembers.householdId })
        .from(householdMembers)
        .where(eq(householdMembers.userId, member.userId))
        .limit(1)
      if (existing.length > 0) {
        throw new AlreadyInHouseholdError()
      }

      await tx.insert(householdMembers).values({
        householdId: member.householdId,
        userId: member.userId,
        joinedAt: member.joinedAt,
      })
    })
  }

  async removeMember(householdId: string, userId: string): Promise<{ householdDeleted: boolean }> {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, householdId),
            eq(householdMembers.userId, userId),
          ),
        )

      const remaining = await tx
        .select({ count: sql<number>`count(*)` })
        .from(householdMembers)
        .where(eq(householdMembers.householdId, householdId))

      const count = Number(remaining[0]?.count ?? 0)
      if (count === 0) {
        // cascading deletes remove inventory, recipes, menus, shopping lists
        await tx.delete(households).where(eq(households.id, householdId))
        return { householdDeleted: true }
      }
      return { householdDeleted: false }
    })
  }
}
