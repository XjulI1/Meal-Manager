import { beforeEach, describe, expect, it } from 'vitest'
import { ResolveRecipeDraftUseCase } from '../../../server/contexts/catalog/application/use-cases/resolve-recipe-draft.use-case'
import { InMemoryIngredientLookup } from '../_shared/in-memory-ingredient-lookup'

const HH = 'hh-1'

describe('ResolveRecipeDraftUseCase', () => {
  let lookup: InMemoryIngredientLookup
  let resolve: ResolveRecipeDraftUseCase

  beforeEach(() => {
    lookup = new InMemoryIngredientLookup()
    lookup.add(HH, { id: 'ing-butter', name: 'Beurre', category: 'dairy', canonicalUnit: 'g', storage: 'fridge', archived: false })
    resolve = new ResolveRecipeDraftUseCase(lookup)
  })

  it('matches an existing ingredient case-insensitively (trimmed)', async () => {
    const r = await resolve.execute({
      householdId: HH,
      draft: { title: 'X', instructions: 'Y', ingredients: [{ name: '  beurre ', quantity: { value: 30, unit: 'g' } }] },
    })
    expect(r.ingredients[0]).toMatchObject({
      status: 'matched',
      ingredientId: 'ing-butter',
      ingredientName: 'Beurre',
      canonicalUnit: 'g',
      quantity: { value: 30, unit: 'g' },
    })
  })

  it('proposes a new ingredient, deriving the canonical unit from the quantity', async () => {
    const r = await resolve.execute({
      householdId: HH,
      draft: { title: 'X', instructions: 'Y', ingredients: [{ name: 'Gingembre frais', quantity: { value: 10, unit: 'g' } }] },
    })
    expect(r.ingredients[0]).toMatchObject({ status: 'new', proposedName: 'Gingembre frais', canonicalUnit: 'g' })
  })

  it('derives ml from a volume unit and falls back to unit otherwise', async () => {
    const r = await resolve.execute({
      householdId: HH,
      draft: {
        title: 'X',
        instructions: 'Y',
        ingredients: [
          { name: 'Lait', quantity: { value: 1, unit: 'l' } },
          { name: 'Oeufs' },
          { name: 'Sel', quantity: { value: 1, unit: 'pincée' } },
        ],
      },
    })
    expect(r.ingredients[0]).toMatchObject({ status: 'new', canonicalUnit: 'ml' })
    expect(r.ingredients[1]).toMatchObject({ status: 'new', canonicalUnit: 'unit' })
    // Unknown unit ("pincée") → falls back to 'unit'.
    expect(r.ingredients[2]).toMatchObject({ status: 'new', canonicalUnit: 'unit' })
  })

  it('does not match an archived ingredient — proposes a new one', async () => {
    lookup.add(HH, { id: 'ing-sugar', name: 'Sucre', category: 'grocery', canonicalUnit: 'g', storage: 'pantry', archived: true })
    const r = await resolve.execute({
      householdId: HH,
      draft: { title: 'X', instructions: 'Y', ingredients: [{ name: 'Sucre' }] },
    })
    expect(r.ingredients[0]!.status).toBe('new')
  })

  it('carries title, instructions, servings and sourceUrl through', async () => {
    const r = await resolve.execute({
      householdId: HH,
      draft: { title: 'Gâteau', instructions: 'Mélanger', servings: 6, sourceUrl: 'https://example.com/r', ingredients: [] },
    })
    expect(r).toMatchObject({ title: 'Gâteau', instructions: 'Mélanger', servings: 6, sourceUrl: 'https://example.com/r' })
    expect(r.ingredients).toEqual([])
  })
})
