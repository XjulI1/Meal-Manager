import { beforeEach, describe, expect, it } from 'vitest'
import { CreateHouseholdUseCase } from '../../../server/contexts/family/application/use-cases/create-household.use-case'
import { AlreadyInHouseholdError } from '../../../server/contexts/family/domain/errors/already-in-household.error'
import { FakeInviteCodeGenerator } from './in-memory/fake-invite-code-generator'
import { InMemoryHouseholdRepository } from './in-memory/in-memory-household.repository'

describe('CreateHouseholdUseCase', () => {
  let households: InMemoryHouseholdRepository
  let inviteCodes: FakeInviteCodeGenerator
  let useCase: CreateHouseholdUseCase

  beforeEach(() => {
    households = new InMemoryHouseholdRepository()
    inviteCodes = new FakeInviteCodeGenerator()
    let counter = 0
    useCase = new CreateHouseholdUseCase(households, inviteCodes, () => `hh-${++counter}`)
  })

  it('creates a household and registers the creator as the first member', async () => {
    const result = await useCase.execute({ userId: 'user-1', name: 'Famille Dupont' })

    expect(result).toEqual({ id: 'hh-1', name: 'Famille Dupont', inviteCode: 'ABCD2345' })
    const stored = await households.findForUser('user-1')
    expect(stored?.id).toBe('hh-1')
    expect(await households.countMembers('hh-1')).toBe(1)
  })

  it('rejects when the user already belongs to a household', async () => {
    await useCase.execute({ userId: 'user-1', name: 'Famille A' })

    await expect(
      useCase.execute({ userId: 'user-1', name: 'Famille B' }),
    ).rejects.toBeInstanceOf(AlreadyInHouseholdError)
  })

  it('trims the household name', async () => {
    const result = await useCase.execute({ userId: 'user-2', name: '  Famille Dupond  ' })
    expect(result.name).toBe('Famille Dupond')
  })
})
