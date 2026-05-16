import { beforeEach, describe, expect, it } from 'vitest'
import { CreateHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/create-household.use-case'
import { AlreadyInHouseholdError } from '../../../server/contexts/family/domain/errors/already-in-household.error'
import type { IHouseholdInitializer } from '../../../server/contexts/family/domain/ports/household-initializer.port'
import { FakeInviteCodeGenerator } from './in-memory/fake-invite-code-generator'
import { InMemoryHouseholdRepository } from './in-memory/in-memory-household.repository'

class RecordingInitializer implements IHouseholdInitializer {
  readonly calls: string[] = []
  constructor(private readonly label: string, private readonly onCall?: (id: string) => Promise<void>) {}
  async initialize(householdId: string): Promise<void> {
    this.calls.push(householdId)
    if (this.onCall) await this.onCall(householdId)
  }
  toString() { return this.label }
}

describe('CreateHouseholdUseCase', () => {
  let households: InMemoryHouseholdRepository
  let inviteCodes: FakeInviteCodeGenerator
  let counter = 0
  const idGen = () => `hh-${++counter}`

  beforeEach(() => {
    households = new InMemoryHouseholdRepository()
    inviteCodes = new FakeInviteCodeGenerator()
    counter = 0
  })

  it('creates a household and registers the creator as the first member', async () => {
    const useCase = new CreateHouseholdUseCase(households, inviteCodes, [], idGen)
    const result = await useCase.execute({ userId: 'user-1', name: 'Famille Dupont' })

    expect(result).toEqual({ id: 'hh-1', name: 'Famille Dupont', inviteCode: 'ABCD2345' })
    const stored = await households.findForUser('user-1')
    expect(stored?.id).toBe('hh-1')
    expect(await households.countMembers('hh-1')).toBe(1)
  })

  it('rejects when the user already belongs to a household', async () => {
    const useCase = new CreateHouseholdUseCase(households, inviteCodes, [], idGen)
    await useCase.execute({ userId: 'user-1', name: 'Famille A' })

    await expect(
      useCase.execute({ userId: 'user-1', name: 'Famille B' }),
    ).rejects.toBeInstanceOf(AlreadyInHouseholdError)
  })

  it('trims the household name', async () => {
    const useCase = new CreateHouseholdUseCase(households, inviteCodes, [], idGen)
    const result = await useCase.execute({ userId: 'user-2', name: '  Famille Dupond  ' })
    expect(result.name).toBe('Famille Dupond')
  })

  it('runs every initializer with the new household id, in order', async () => {
    const a = new RecordingInitializer('a')
    const b = new RecordingInitializer('b')
    const useCase = new CreateHouseholdUseCase(households, inviteCodes, [a, b], idGen)

    await useCase.execute({ userId: 'user-1', name: 'Famille' })

    expect(a.calls).toEqual(['hh-1'])
    expect(b.calls).toEqual(['hh-1'])
  })

  it('rolls back the household creation when an initializer fails', async () => {
    const a = new RecordingInitializer('a')
    const failing: IHouseholdInitializer = {
      initialize: async () => { throw new Error('seed failed') },
    }
    const useCase = new CreateHouseholdUseCase(households, inviteCodes, [a, failing], idGen)

    await expect(useCase.execute({ userId: 'user-1', name: 'Famille' }))
      .rejects.toThrow('seed failed')

    // Rollback: the user no longer belongs to any household, so they can retry from scratch.
    expect(await households.findForUser('user-1')).toBeNull()
  })

  it('does not run later initializers if an earlier one fails', async () => {
    const failing: IHouseholdInitializer = {
      initialize: async () => { throw new Error('boom') },
    }
    const after = new RecordingInitializer('after')
    const useCase = new CreateHouseholdUseCase(households, inviteCodes, [failing, after], idGen)

    await expect(useCase.execute({ userId: 'user-1', name: 'Famille' })).rejects.toThrow('boom')

    expect(after.calls).toEqual([])
  })
})
