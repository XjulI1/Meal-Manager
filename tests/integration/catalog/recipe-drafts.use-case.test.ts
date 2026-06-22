import { beforeEach, describe, expect, it } from 'vitest'
import { DeleteRecipeDraftUseCase } from '../../../server/contexts/catalog/application/use-cases/delete-recipe-draft.use-case'
import { GetRecipeDraftByIdUseCase } from '../../../server/contexts/catalog/application/use-cases/get-recipe-draft-by-id.use-case'
import { ListRecipeDraftsUseCase } from '../../../server/contexts/catalog/application/use-cases/list-recipe-drafts.use-case'
import { SaveRecipeDraftUseCase } from '../../../server/contexts/catalog/application/use-cases/save-recipe-draft.use-case'
import { UpdateRecipeDraftUseCase } from '../../../server/contexts/catalog/application/use-cases/update-recipe-draft.use-case'
import { RECIPE_DRAFTS_MAX_PER_HOUSEHOLD } from '../../../server/contexts/catalog/domain/entities/recipe-draft.entity'
import { RecipeDraftLimitReachedError } from '../../../server/contexts/catalog/domain/errors/recipe-draft-limit-reached.error'
import { RecipeDraftNotFoundError } from '../../../server/contexts/catalog/domain/errors/recipe-draft-not-found.error'
import { InMemoryRecipeDraftRepository } from './in-memory/in-memory-recipe-draft.repository'

const HH = 'hh-1'
const OTHER = 'hh-2'

describe('Recipe draft use cases', () => {
  let repo: InMemoryRecipeDraftRepository
  let counter: number
  let now: Date

  function newSave() {
    return new SaveRecipeDraftUseCase(repo, () => `draft-${++counter}`, () => now)
  }

  beforeEach(() => {
    repo = new InMemoryRecipeDraftRepository()
    counter = 0
    now = new Date('2026-06-15T10:00:00Z')
  })

  it('saves a manual draft with partial content and free-text ingredient units', async () => {
    const view = await newSave().execute({
      householdId: HH,
      source: 'manual',
      content: {
        title: 'Tarte aux pommes',
        ingredients: [{ name: 'ail', quantity: { value: 2, unit: 'gousses' }, raw: "2 gousses d'ail" }],
      },
    })

    expect(view.id).toBe('draft-1')
    expect(view.source).toBe('manual')
    expect(view.title).toBe('Tarte aux pommes')
    expect(view.instructions).toBeNull()
    expect(view.ingredients[0]).toEqual({ name: 'ail', quantity: { value: 2, unit: 'gousses' }, raw: "2 gousses d'ail" })
  })

  it('persists AI-produced content with the matching source', async () => {
    const view = await newSave().execute({
      householdId: HH,
      source: 'ai-url',
      content: { title: 'Soupe', sourceUrl: 'https://example.com/soupe', ingredients: [] },
    })
    expect(view.source).toBe('ai-url')
    expect(view.sourceUrl).toBe('https://example.com/soupe')
  })

  it('rejects creation beyond the per-household cap', async () => {
    const save = newSave()
    for (let i = 0; i < RECIPE_DRAFTS_MAX_PER_HOUSEHOLD; i++) {
      await save.execute({ householdId: HH, source: 'manual', content: { title: `D${i}` } })
    }
    await expect(save.execute({ householdId: HH, source: 'manual', content: {} }))
      .rejects.toBeInstanceOf(RecipeDraftLimitReachedError)
    // A different household is unaffected.
    await expect(save.execute({ householdId: OTHER, source: 'manual', content: {} })).resolves.toBeDefined()
  })

  it('lists only the household drafts, most recently updated first', async () => {
    const save = newSave()
    now = new Date('2026-06-15T10:00:00Z')
    await save.execute({ householdId: HH, source: 'manual', content: { title: 'A' } })
    now = new Date('2026-06-15T11:00:00Z')
    await save.execute({ householdId: HH, source: 'manual', content: { title: 'B' } })
    await save.execute({ householdId: OTHER, source: 'manual', content: { title: 'X' } })

    const list = await new ListRecipeDraftsUseCase(repo).execute({ householdId: HH })
    expect(list.map((d) => d.title)).toEqual(['B', 'A'])
  })

  it('retrieves a draft by id and 404s across households', async () => {
    await newSave().execute({ householdId: HH, source: 'manual', content: { title: 'A' } })
    const get = new GetRecipeDraftByIdUseCase(repo)
    await expect(get.execute({ householdId: HH, id: 'draft-1' })).resolves.toMatchObject({ title: 'A' })
    await expect(get.execute({ householdId: OTHER, id: 'draft-1' })).rejects.toBeInstanceOf(RecipeDraftNotFoundError)
  })

  it('updates content, refreshes updatedAt, and keeps the source immutable', async () => {
    await newSave().execute({ householdId: HH, source: 'ai-photo', content: { title: 'A' } })
    now = new Date('2026-06-15T12:00:00Z')
    const update = new UpdateRecipeDraftUseCase(repo, () => now)
    const view = await update.execute({
      householdId: HH,
      id: 'draft-1',
      content: { title: 'Tarte fine', ingredients: [{ name: 'pâte' }, { name: 'pommes' }] },
    })
    expect(view.title).toBe('Tarte fine')
    expect(view.ingredients).toHaveLength(2)
    expect(view.source).toBe('ai-photo')
    expect(view.updatedAt).toBe('2026-06-15T12:00:00.000Z')
  })

  it('does not update a draft from another household', async () => {
    await newSave().execute({ householdId: HH, source: 'manual', content: { title: 'A' } })
    const update = new UpdateRecipeDraftUseCase(repo, () => now)
    await expect(update.execute({ householdId: OTHER, id: 'draft-1', content: { title: 'X' } }))
      .rejects.toBeInstanceOf(RecipeDraftNotFoundError)
  })

  it('deletes a draft and 404s on deleting across households', async () => {
    await newSave().execute({ householdId: HH, source: 'manual', content: { title: 'A' } })
    const del = new DeleteRecipeDraftUseCase(repo)
    await expect(del.execute({ householdId: OTHER, id: 'draft-1' })).rejects.toBeInstanceOf(RecipeDraftNotFoundError)
    await del.execute({ householdId: HH, id: 'draft-1' })
    await expect(new GetRecipeDraftByIdUseCase(repo).execute({ householdId: HH, id: 'draft-1' }))
      .rejects.toBeInstanceOf(RecipeDraftNotFoundError)
  })
})
