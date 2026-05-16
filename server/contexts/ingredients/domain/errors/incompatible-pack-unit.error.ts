import type { CanonicalUnit } from '../../../../../shared/units/conversions'

export class IncompatiblePackUnitError extends Error {
  override readonly name = 'IncompatiblePackUnitError'
  constructor(packUnit: CanonicalUnit, ingredientUnit: CanonicalUnit) {
    super(
      `Product pack unit "${packUnit}" does not match the ingredient canonical unit "${ingredientUnit}".`,
    )
  }
}
