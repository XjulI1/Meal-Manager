import { describe, expect, it } from 'vitest'
import { Wine, type WineAttributes } from '../../../server/contexts/wine-cellar/domain/entities/wine.entity'
import { IncoherentGardeWindowError } from '../../../server/contexts/wine-cellar/domain/errors/incoherent-garde-window.error'
import { WineColor } from '../../../server/contexts/wine-cellar/domain/value-objects/wine-color.vo'

const NOW = new Date('2026-07-15T10:00:00Z')

function attributes(overrides: Partial<WineAttributes> = {}): WineAttributes {
  return {
    name: 'Saint-Amour',
    domain: null,
    country: 'France',
    region: null,
    appellation: null,
    vintage: 2022,
    color: WineColor.fromString('rouge'),
    gardeMin: null,
    gardeMax: null,
    comment: null,
    aromas: null,
    foodPairings: null,
    aiEnrichedAt: null,
    photoUrl: null,
    rating: null,
    ...overrides,
  }
}

describe('Wine entity — enrichment fields', () => {
  it('carries aromas, foodPairings and aiEnrichedAt through create', () => {
    const wine = Wine.create({
      id: 'w-1',
      householdId: 'hh-1',
      attributes: attributes({
        aromas: 'fruits rouges',
        foodPairings: 'viandes grillées',
        aiEnrichedAt: NOW,
      }),
      now: NOW,
    })

    expect(wine.aromas).toBe('fruits rouges')
    expect(wine.foodPairings).toBe('viandes grillées')
    expect(wine.aiEnrichedAt).toEqual(NOW)
  })

  it('defaults the enrichment fields to null', () => {
    const wine = Wine.create({ id: 'w-1', householdId: 'hh-1', attributes: attributes(), now: NOW })
    expect(wine.aromas).toBeNull()
    expect(wine.foodPairings).toBeNull()
    expect(wine.aiEnrichedAt).toBeNull()
  })

  it('updates enrichment fields via withAttributes', () => {
    const wine = Wine.create({ id: 'w-1', householdId: 'hh-1', attributes: attributes(), now: NOW })
    const updated = wine.withAttributes(attributes({ aromas: 'cuir', aiEnrichedAt: NOW }), NOW)
    expect(updated.aromas).toBe('cuir')
    expect(updated.aiEnrichedAt).toEqual(NOW)
  })

  it('still enforces the garde-window invariant', () => {
    expect(() =>
      Wine.create({
        id: 'w-1',
        householdId: 'hh-1',
        attributes: attributes({ gardeMin: 2030, gardeMax: 2020 }),
        now: NOW,
      }),
    ).toThrow(IncoherentGardeWindowError)
  })
})
