import { beforeEach, describe, expect, it } from 'vitest'
import { GetMenuByWeekUseCase } from '../../../server/contexts/meal-planning/application/use-cases/get-menu-by-week.use-case'
import { InvalidWeekStartError } from '../../../server/contexts/meal-planning/domain/value-objects/week-start.vo'
import { InMemoryMenuRepository } from './in-memory/in-memory-menu.repository'

describe('GetMenuByWeekUseCase', () => {
  let repo: InMemoryMenuRepository
  let useCase: GetMenuByWeekUseCase

  beforeEach(() => {
    repo = new InMemoryMenuRepository()
    let counter = 0
    useCase = new GetMenuByWeekUseCase(
      repo,
      () => `menu-${++counter}`,
      () => new Date('2026-05-15T10:00:00Z'),
    )
  })

  it('lazily creates a menu when none exists for the week', async () => {
    const menu = await useCase.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    expect(menu).toEqual({ id: 'menu-1', weekStart: '2026-05-18', slots: [] })

    const stored = await repo.findByWeek('hh-1', (await repo.findById('menu-1', 'hh-1'))!.weekStart)
    expect(stored).not.toBeNull()
  })

  it('returns the existing menu when one exists', async () => {
    await useCase.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    const second = await useCase.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    expect(second.id).toBe('menu-1')
  })

  it('creates separate menus for different weeks', async () => {
    const m1 = await useCase.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    const m2 = await useCase.execute({ householdId: 'hh-1', weekStart: '2026-05-25' })
    expect(m1.id).not.toBe(m2.id)
  })

  it('creates separate menus for different households on the same week', async () => {
    const m1 = await useCase.execute({ householdId: 'hh-1', weekStart: '2026-05-18' })
    const m2 = await useCase.execute({ householdId: 'hh-2', weekStart: '2026-05-18' })
    expect(m1.id).not.toBe(m2.id)
  })

  it('rejects non-Monday weekStart', async () => {
    await expect(useCase.execute({ householdId: 'hh-1', weekStart: '2026-05-19' }))
      .rejects.toBeInstanceOf(InvalidWeekStartError)
  })
})
