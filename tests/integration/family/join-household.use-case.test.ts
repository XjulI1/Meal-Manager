import { beforeEach, describe, expect, it } from 'vitest'
import { CreateHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/create-household.use-case'
import { JoinHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/join-household.use-case'
import { AlreadyInHouseholdError } from '../../../server/contexts/family/domain/errors/already-in-household.error'
import { HouseholdNotFoundError } from '../../../server/contexts/family/domain/errors/household-not-found.error'
import { InvalidInviteCodeError } from '../../../server/contexts/family/domain/value-objects/invite-code.vo'
import { FakeInviteCodeGenerator } from './in-memory/fake-invite-code-generator'
import { InMemoryHouseholdRepository } from './in-memory/in-memory-household.repository'

describe('JoinHouseholdUseCase', () => {
  let households: InMemoryHouseholdRepository
  let create: CreateHouseholdUseCase
  let join: JoinHouseholdUseCase

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
    await create.execute({ userId: 'alice', name: 'Famille Dupont' })
  })

  it('adds the user as a member when the invite code is valid', async () => {
    const result = await join.execute({ userId: 'bob', inviteCode: 'ABCD2345' })
    expect(result.householdId).toBe('hh-1')
    expect(await households.countMembers('hh-1')).toBe(2)
  })

  it('accepts the invite code in lowercase (normalized to upper)', async () => {
    const result = await join.execute({ userId: 'bob', inviteCode: 'abcd2345' })
    expect(result.householdId).toBe('hh-1')
  })

  it('rejects an unknown invite code', async () => {
    await expect(
      join.execute({ userId: 'bob', inviteCode: 'ZZZZ9999' }),
    ).rejects.toBeInstanceOf(HouseholdNotFoundError)
  })

  it('rejects an invite code with the wrong format', async () => {
    await expect(
      join.execute({ userId: 'bob', inviteCode: 'invalid!' }),
    ).rejects.toBeInstanceOf(InvalidInviteCodeError)
  })

  it('rejects when the user is already in a household', async () => {
    await join.execute({ userId: 'bob', inviteCode: 'ABCD2345' })
    await expect(
      join.execute({ userId: 'bob', inviteCode: 'ABCD2345' }),
    ).rejects.toBeInstanceOf(AlreadyInHouseholdError)
  })
})
