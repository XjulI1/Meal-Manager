/**
 * Closed list of French wine regions + `autre`. Mirrors `WINE_REGIONS` in
 * `shared/dto/wine-cellar.ts` (the domain does not import the DTO layer, so the
 * list is duplicated here — a unit test guards against drift).
 */
export const WINE_REGION_VALUES = [
  'bourgogne',
  'bordeaux',
  'beaujolais',
  'vallee-du-rhone',
  'vallee-de-la-loire',
  'alsace',
  'champagne',
  'languedoc',
  'provence',
  'sud-ouest',
  'jura',
  'savoie',
  'autre',
] as const

export type WineRegionValue = (typeof WINE_REGION_VALUES)[number]

const VALUES: ReadonlySet<string> = new Set(WINE_REGION_VALUES)

export class InvalidWineRegionError extends Error {
  override readonly name = 'InvalidWineRegionError'
  constructor(value: string) {
    super(`Invalid wine region: "${value}".`)
  }
}

export class WineRegion {
  private constructor(readonly value: WineRegionValue) {}

  static fromString(value: string): WineRegion {
    if (!VALUES.has(value)) {
      throw new InvalidWineRegionError(value)
    }
    return new WineRegion(value as WineRegionValue)
  }

  static autre(): WineRegion {
    return new WineRegion('autre')
  }

  equals(other: WineRegion): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
