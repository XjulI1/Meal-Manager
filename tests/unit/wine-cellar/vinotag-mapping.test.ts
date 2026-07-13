import { describe, expect, it } from 'vitest'
import { mapVinotagRow } from '../../../server/contexts/wine-cellar/application/vinotag-mapping'

function row(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    wine_name: 'Saint-Amour',
    wine_domain: 'Cave de Chaintré',
    wine_country: 'fr',
    wine_region: 'beaujolais',
    wine_type: 'wine_red',
    millesime_year: '2023',
    bottle_size: '75cl',
    bottle_quantity: '2',
    ...overrides,
  }
}

describe('mapVinotagRow', () => {
  it('maps the core fields', () => {
    const mapped = mapVinotagRow(row())!
    expect(mapped.wine.name).toBe('Saint-Amour')
    expect(mapped.wine.domain).toBe('Cave de Chaintré')
    expect(mapped.wine.country).toBe('France')
    expect(mapped.wine.region).toBe('beaujolais')
    expect(mapped.wine.color).toBe('rouge')
    expect(mapped.wine.vintage).toBe(2023)
    expect(mapped.bottleQuantity).toBe(2)
    expect(mapped.size).toEqual({ value: 75, unit: 'cl' })
  })

  it('maps colours', () => {
    expect(mapVinotagRow(row({ wine_type: 'wine_white' }))!.wine.color).toBe('blanc')
    expect(mapVinotagRow(row({ wine_type: 'wine_rose' }))!.wine.color).toBe('rose')
    expect(mapVinotagRow(row({ wine_type: 'wine_sparkling' }))!.wine.color).toBe('effervescent')
    expect(mapVinotagRow(row({ wine_type: 'unknown' }))!.wine.color).toBe('rouge')
  })

  it('maps region slugs and falls back to autre', () => {
    expect(mapVinotagRow(row({ wine_region: 'vallee_du_rhone' }))!.wine.region).toBe('vallee-du-rhone')
    expect(mapVinotagRow(row({ wine_region: 'vallee_de_la_loire' }))!.wine.region).toBe('vallee-de-la-loire')
    expect(mapVinotagRow(row({ wine_region: '' }))!.wine.region).toBe('autre')
    expect(mapVinotagRow(row({ wine_region: 'toscane' }))!.wine.region).toBe('autre')
  })

  it('imports the purchase price', () => {
    expect(mapVinotagRow(row({ bottle_buying_price: '24.00' }))!.buyingPrice).toBe(24)
    expect(mapVinotagRow(row({ bottle_buying_price: '' }))!.buyingPrice).toBeUndefined()
  })

  it('ignores favorite and bottle_real_price', () => {
    const mapped = mapVinotagRow(row({ favorite: 'true', bottle_real_price: '30.00', bottle_buying_price: '20.00' }))!
    expect(mapped.buyingPrice).toBe(20)
    // No property carries favorite / real price into the domain shape.
    expect(JSON.stringify(mapped)).not.toContain('30')
    expect(JSON.stringify(mapped)).not.toContain('favorite')
  })

  it('parses the added date without timezone drift', () => {
    expect(mapVinotagRow(row({ last_bottle_added: 'Sun Jul 12 2026' }))!.addedDate).toBe('2026-07-12')
  })

  it('extracts the apogee year and leaves an empty start undefined', () => {
    const mapped = mapVinotagRow(row({ wine_apogee_start: '', wine_apogee_end: 'Wed Jul 12 2023' }))!
    expect(mapped.wine.gardeMin).toBeUndefined()
    expect(mapped.wine.gardeMax).toBe(2023)
  })

  it('returns null when the name is empty', () => {
    expect(mapVinotagRow(row({ wine_name: '' }))).toBeNull()
  })

  it('defaults quantity to 1 when missing', () => {
    expect(mapVinotagRow(row({ bottle_quantity: '' }))!.bottleQuantity).toBe(1)
  })
})
