import {
  CANONICAL_UNIT,
  lookupUnit,
  type CanonicalUnit,
  type Dimension,
} from './conversions'

export class IncompatibleUnitsError extends Error {
  override readonly name = 'IncompatibleUnitsError'
  constructor(left: Dimension, right: Dimension) {
    super(`Cannot combine quantities of different dimensions: ${left} vs ${right}`)
  }
}

export class InvalidQuantityError extends Error {
  override readonly name = 'InvalidQuantityError'
}

/**
 * Value Object representing a quantity in its canonical unit.
 *
 * Invariants:
 *   - `value` is always stored in the canonical unit of its dimension (g, ml, unit).
 *   - `value` is a non-negative integer.
 *   - Conversions happen at the boundary via `fromUserInput` / `toDisplay`.
 */
export class Quantity {
  private constructor(
    readonly value: number,
    readonly unit: CanonicalUnit,
    readonly dimension: Dimension,
  ) {}

  static fromCanonical(value: number, unit: CanonicalUnit): Quantity {
    Quantity.assertValid(value)
    const dimension = Quantity.dimensionOf(unit)
    return new Quantity(Math.round(value), unit, dimension)
  }

  static fromUserInput(value: number, unitSymbol: string): Quantity {
    Quantity.assertValid(value)
    const def = lookupUnit(unitSymbol)
    const canonical = CANONICAL_UNIT[def.dimension]
    const converted = value * def.toCanonical
    if (!Number.isFinite(converted) || converted < 0) {
      throw new InvalidQuantityError(`Conversion produced an invalid value: ${converted}`)
    }
    return new Quantity(Math.round(converted), canonical, def.dimension)
  }

  toDisplay(targetUnit?: string): { value: number; unit: string } {
    if (!targetUnit) {
      return { value: this.value, unit: this.unit }
    }
    const def = lookupUnit(targetUnit)
    if (def.dimension !== this.dimension) {
      throw new IncompatibleUnitsError(this.dimension, def.dimension)
    }
    return { value: this.value / def.toCanonical, unit: def.symbol }
  }

  add(other: Quantity): Quantity {
    this.assertSameDimension(other)
    return new Quantity(this.value + other.value, this.unit, this.dimension)
  }

  subtract(other: Quantity): Quantity {
    this.assertSameDimension(other)
    const result = this.value - other.value
    if (result < 0) {
      throw new InvalidQuantityError(
        `Subtraction would produce a negative quantity (${this.value} - ${other.value}).`,
      )
    }
    return new Quantity(result, this.unit, this.dimension)
  }

  /** Saturating subtraction: returns 0 instead of throwing when other > this. */
  subtractClamped(other: Quantity): Quantity {
    this.assertSameDimension(other)
    return new Quantity(Math.max(0, this.value - other.value), this.unit, this.dimension)
  }

  equals(other: Quantity): boolean {
    return (
      this.value === other.value
      && this.unit === other.unit
      && this.dimension === other.dimension
    )
  }

  isZero(): boolean {
    return this.value === 0
  }

  private assertSameDimension(other: Quantity): void {
    if (this.dimension !== other.dimension) {
      throw new IncompatibleUnitsError(this.dimension, other.dimension)
    }
  }

  private static assertValid(value: number): void {
    if (!Number.isFinite(value)) {
      throw new InvalidQuantityError(`Quantity must be a finite number (got ${value}).`)
    }
    if (value < 0) {
      throw new InvalidQuantityError(`Quantity must be non-negative (got ${value}).`)
    }
  }

  private static dimensionOf(unit: CanonicalUnit): Dimension {
    switch (unit) {
      case 'g': return 'mass'
      case 'ml': return 'volume'
      case 'unit': return 'discrete'
    }
  }
}
