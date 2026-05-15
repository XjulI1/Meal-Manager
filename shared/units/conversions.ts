export type Dimension = 'mass' | 'volume' | 'discrete'

export type CanonicalUnit = 'g' | 'ml' | 'unit'

export interface UnitDefinition {
  symbol: string
  dimension: Dimension
  /** Multiplier to convert FROM this unit TO the canonical unit of its dimension. */
  toCanonical: number
}

export const CANONICAL_UNIT: Record<Dimension, CanonicalUnit> = {
  mass: 'g',
  volume: 'ml',
  discrete: 'unit',
}

export const UNITS: Record<string, UnitDefinition> = {
  // Mass
  mg: { symbol: 'mg', dimension: 'mass', toCanonical: 0.001 },
  g: { symbol: 'g', dimension: 'mass', toCanonical: 1 },
  kg: { symbol: 'kg', dimension: 'mass', toCanonical: 1000 },

  // Volume
  ml: { symbol: 'ml', dimension: 'volume', toCanonical: 1 },
  cl: { symbol: 'cl', dimension: 'volume', toCanonical: 10 },
  dl: { symbol: 'dl', dimension: 'volume', toCanonical: 100 },
  l: { symbol: 'l', dimension: 'volume', toCanonical: 1000 },

  // Discrete
  unit: { symbol: 'unit', dimension: 'discrete', toCanonical: 1 },
  pc: { symbol: 'unit', dimension: 'discrete', toCanonical: 1 },
  piece: { symbol: 'unit', dimension: 'discrete', toCanonical: 1 },
}

export function lookupUnit(symbol: string): UnitDefinition {
  const key = symbol.trim().toLowerCase()
  const def = UNITS[key]
  if (!def) throw new UnknownUnitError(symbol)
  return def
}

export class UnknownUnitError extends Error {
  override readonly name = 'UnknownUnitError'
  constructor(symbol: string) {
    super(`Unknown unit: "${symbol}"`)
  }
}
