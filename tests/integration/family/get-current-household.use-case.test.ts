import { beforeEach, describe, expect, it } from 'vitest'
import { CreateHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/create-household.use-case'
import { GetCurrentHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/get-current-household.use-case'
import { JoinHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/join-household.use-case'
import { NotInHouseholdError } from '../../../server/contexts/family/domain/errors/not-in-household.error'
import { FakeInviteCodeGenerator } from './in-memory/fake-invite-code-generator'
import { InMemoryHouseholdRepository } from './in-memory/in-memory-household.repository'

describe('GetCurrentHouseholdUseCase', () => {
  let households: InMemoryHouseholdRepository
  let create: CreateHouseholdUseCase
  let join: JoinHouseholdUseCase
  let getCurrent: GetCurrentHouseholdUseCase

  beforeEach(async () => {
    households = new InMemoryHouseholdRepository()
    households.userEmails.set('alice', 'alice@example.com')
    households.userEmails.set('bob', 'bob@example.com')

    let counter = 0
    create = new CreateHouseholdUseCase(
      households,
      new FakeInviteCodeGenerator(['ABCD2345']),
      () => `hh-${++counter}`,
    )
    join = new JoinHouseholdUseCase(households)
    getCurrent = new GetCurrentHouseholdUseCase(households)

    await create.execute({ userId: 'alice', name: 'Famille Dupont' })
    await join.execute({ userId: 'bob', inviteCode: 'ABCD2345' })
  })

  it('returns the household with its members', async () => {
    const result = await getCurrent.execute({ userId: 'alice' })
    expect(result.id).toBe('hh-1')
    expect(result.name).toBe('Famille Dupont')
    expect(result.inviteCode).toBe('ABCD2345')
    const emails = result.members.map((m) => m.email).sort()
    expect(emails).toEqual(['alice@example.com', 'bob@example.com'])
  })

  it('throws when the user is not in a household', async () => {
    await expect(getCurrent.execute({ userId: 'charlie' })).rejects.toBeInstanceOf(NotInHouseholdError)
  })
})
