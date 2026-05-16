import { beforeEach, describe, expect, it } from 'vitest'
import { CreateHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/create-household.use-case'
import { JoinHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/join-household.use-case'
import { LeaveHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/leave-household.use-case'
import { NotInHouseholdError } from '../../../server/contexts/family/domain/errors/not-in-household.error'
import { FakeInviteCodeGenerator } from './in-memory/fake-invite-code-generator'
import { InMemoryHouseholdRepository } from './in-memory/in-memory-household.repository'

describe('LeaveHouseholdUseCase', () => {
  let households: InMemoryHouseholdRepository
  let create: CreateHouseholdUseCase
  let join: JoinHouseholdUseCase
  let leave: LeaveHouseholdUseCase

  beforeEach(async () => {
    households = new InMemoryHouseholdRepository()
    let counter = 0
    create = new CreateHouseholdUseCase(
      households,
      new FakeInviteCodeGenerator(['ABCD2345']),
      [],
      () => `hh-${++counter}`,
    )
    join = new JoinHouseholdUseCase(households)
    leave = new LeaveHouseholdUseCase(households)
    await create.execute({ userId: 'alice', name: 'Famille Dupont' })
  })

  it('removes a member while keeping the household for the remaining members', async () => {
    await join.execute({ userId: 'bob', inviteCode: 'ABCD2345' })
    const result = await leave.execute({ userId: 'bob' })
    expect(result.householdDeleted).toBe(false)
    expect(await households.countMembers('hh-1')).toBe(1)
    expect(await households.findForUser('alice')).not.toBeNull()
  })

  it('deletes the household when the last member leaves', async () => {
    const result = await leave.execute({ userId: 'alice' })
    expect(result.householdDeleted).toBe(true)
    expect(await households.findById('hh-1')).toBeNull()
  })

  it('rejects when the user does not belong to any household', async () => {
    await expect(leave.execute({ userId: 'ghost' })).rejects.toBeInstanceOf(NotInHouseholdError)
  })
})
