import { beforeEach, describe, expect, it } from 'vitest'
import { CreatePersonalAccessTokenUseCase } from '../../../server/contexts/platform/application/use-cases/create-personal-access-token.use-case'
import { ListPersonalAccessTokensUseCase } from '../../../server/contexts/platform/application/use-cases/list-personal-access-tokens.use-case'
import { RevokePersonalAccessTokenUseCase } from '../../../server/contexts/platform/application/use-cases/revoke-personal-access-token.use-case'
import { TokenNotFoundError } from '../../../server/contexts/platform/domain/errors/token-not-found.error'
import { FakeTokenGenerator } from './in-memory/fake-token-generator'
import { FakeUserHouseholdResolver } from './in-memory/fake-user-household-resolver'
import { InMemoryPersonalAccessTokenRepository } from './in-memory/in-memory-personal-access-token.repository'

describe('Revoke/List PersonalAccessTokenUseCase', () => {
  let repo: InMemoryPersonalAccessTokenRepository
  let resolver: FakeUserHouseholdResolver
  let generator: FakeTokenGenerator
  let create: CreatePersonalAccessTokenUseCase
  let revoke: RevokePersonalAccessTokenUseCase
  let list: ListPersonalAccessTokensUseCase
  let idCount = 0

  beforeEach(() => {
    repo = new InMemoryPersonalAccessTokenRepository()
    resolver = new FakeUserHouseholdResolver()
    generator = new FakeTokenGenerator()
    resolver.bind('user-1', 'hh-1')
    resolver.bind('user-2', 'hh-2')
    idCount = 0
    const idGen = () => {
      idCount += 1
      return `tok-${idCount}`
    }
    create = new CreatePersonalAccessTokenUseCase(repo, resolver, generator, idGen)
    revoke = new RevokePersonalAccessTokenUseCase(repo)
    list = new ListPersonalAccessTokensUseCase(repo)
  })

  it('owner can revoke their own token', async () => {
    const { token } = await create.execute({ userId: 'user-1', name: 'Claude' })

    await revoke.execute({ userId: 'user-1', tokenId: token.id })

    expect((await repo.findById(token.id))?.isActive).toBe(false)
  })

  it('treats revoke of another user token as not-found (no leak)', async () => {
    const { token } = await create.execute({ userId: 'user-1', name: 'Claude' })

    await expect(
      revoke.execute({ userId: 'user-2', tokenId: token.id }),
    ).rejects.toBeInstanceOf(TokenNotFoundError)
    expect((await repo.findById(token.id))?.isActive).toBe(true)
  })

  it('revoke is idempotent', async () => {
    const { token } = await create.execute({ userId: 'user-1', name: 'Claude' })

    await revoke.execute({ userId: 'user-1', tokenId: token.id })
    await expect(revoke.execute({ userId: 'user-1', tokenId: token.id })).resolves.toBeUndefined()
  })

  it('list returns own tokens only, sorted by createdAt desc, without hash', async () => {
    const a = await create.execute({ userId: 'user-1', name: 'first' })
    // delay so the second token has a strictly later createdAt
    await new Promise((r) => setTimeout(r, 5))
    const b = await create.execute({ userId: 'user-1', name: 'second' })
    await create.execute({ userId: 'user-2', name: 'other-user' })

    const views = await list.execute({ userId: 'user-1' })

    expect(views.map((v) => v.id)).toEqual([b.token.id, a.token.id])
    for (const v of views) {
      expect(v).not.toHaveProperty('tokenHash')
      expect(v).not.toHaveProperty('plaintext')
    }
  })

  it('list includes revoked tokens with their revokedAt timestamp', async () => {
    const { token } = await create.execute({ userId: 'user-1', name: 'Claude' })
    await revoke.execute({ userId: 'user-1', tokenId: token.id })

    const views = await list.execute({ userId: 'user-1' })

    expect(views).toHaveLength(1)
    expect(views[0]!.revokedAt).not.toBeNull()
  })
})
