import { describe, expect, it } from 'vitest'
import { WINE_REGIONS } from '../../../shared/dto/wine-cellar'
import { WINE_REGION_VALUES } from '../../../server/contexts/wine-cellar/domain/value-objects/wine-region.vo'

// The domain VO duplicates the DTO's closed list (the domain must not import the
// DTO layer). This test guards against the two drifting apart.
describe('wine region list', () => {
  it('domain VO list matches the DTO list', () => {
    expect([...WINE_REGION_VALUES]).toEqual([...WINE_REGIONS])
  })
})
