import { describe, expect, it } from 'vitest'
import {
  RECIPE_DRAFT_INGREDIENTS_MAX,
  RecipeDraft,
} from '../../../server/contexts/catalog/domain/entities/recipe-draft.entity'

const base = { id: 'd-1', householdId: 'hh-1', source: 'manual' as const, now: new Date('2026-06-15T10:00:00Z') }

describe('RecipeDraft entity', () => {
  it('creates an empty draft (all content optional)', () => {
    const draft = RecipeDraft.create(base)
    expect(draft.title).toBeUndefined()
    expect(draft.instructions).toBeUndefined()
    expect(draft.servings).toBeUndefined()
    expect(draft.ingredients).toEqual([])
    expect(draft.createdAt).toEqual(draft.updatedAt)
  })

  it('trims the title and collapses an empty title to undefined', () => {
    expect(RecipeDraft.create({ ...base, content: { title: '  Tarte  ' } }).title).toBe('Tarte')
    expect(RecipeDraft.create({ ...base, content: { title: '   ' } }).title).toBeUndefined()
  })

  it('rejects an out-of-range servings value', () => {
    expect(() => RecipeDraft.create({ ...base, content: { servings: 0 } })).toThrow()
    expect(() => RecipeDraft.create({ ...base, content: { servings: 99 } })).toThrow()
  })

  it('rejects an unknown source', () => {
    // @ts-expect-error invalid source on purpose
    expect(() => RecipeDraft.create({ ...base, source: 'imported' })).toThrow()
  })

  it('caps the number of ingredients', () => {
    const ingredients = Array.from({ length: RECIPE_DRAFT_INGREDIENTS_MAX + 1 }, (_, i) => ({ name: `i-${i}` }))
    expect(() => RecipeDraft.create({ ...base, content: { ingredients } })).toThrow()
  })

  it('withContent applies a partial patch, keeps source, and bumps updatedAt', () => {
    const draft = RecipeDraft.create({ ...base, content: { title: 'A', servings: 2 } })
    const later = new Date('2026-06-15T12:00:00Z')
    const patched = draft.withContent({ title: 'B' }, later)

    expect(patched.title).toBe('B')
    expect(patched.servings).toBe(2) // untouched
    expect(patched.source).toBe('manual')
    expect(patched.updatedAt).toEqual(later)
    expect(patched.createdAt).toEqual(draft.createdAt)
    // original is unchanged (immutability)
    expect(draft.title).toBe('A')
  })

  it('withContent can clear a field by passing an empty value', () => {
    const draft = RecipeDraft.create({ ...base, content: { title: 'A' } })
    expect(draft.withContent({ title: '' }).title).toBeUndefined()
  })
})
