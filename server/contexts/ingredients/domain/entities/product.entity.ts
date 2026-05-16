import type { CanonicalUnit } from '../../../../../shared/units/conversions'
import { IncompatiblePackUnitError } from '../errors/incompatible-pack-unit.error'
import { Barcode } from '../value-objects/barcode.vo'

export interface ProductProps {
  id: string
  householdId: string
  ingredientId: string
  brand: string | null
  packSize: number
  packUnit: CanonicalUnit
  imageUrl: string | null
  barcodes: Barcode[]
  createdAt: Date
  updatedAt: Date
}

export interface ProductCreateInput {
  id: string
  householdId: string
  ingredientId: string
  ingredientCanonicalUnit: CanonicalUnit
  brand?: string | null
  packSize: number
  packUnit: CanonicalUnit
  imageUrl?: string | null
  barcodes: readonly string[]
  now?: Date
}

export interface ProductUpdateInput {
  brand?: string | null
  packSize?: number
  imageUrl?: string | null
  barcodes?: readonly string[]
}

export class Product {
  readonly id: string
  readonly householdId: string
  readonly ingredientId: string
  readonly brand: string | null
  readonly packSize: number
  readonly packUnit: CanonicalUnit
  readonly imageUrl: string | null
  readonly barcodes: readonly Barcode[]
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: ProductProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.ingredientId = props.ingredientId
    this.brand = props.brand
    this.packSize = props.packSize
    this.packUnit = props.packUnit
    this.imageUrl = props.imageUrl
    this.barcodes = props.barcodes
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(input: ProductCreateInput): Product {
    if (input.packUnit !== input.ingredientCanonicalUnit) {
      throw new IncompatiblePackUnitError(input.packUnit, input.ingredientCanonicalUnit)
    }
    const now = input.now ?? new Date()
    return new Product({
      id: input.id,
      householdId: input.householdId,
      ingredientId: input.ingredientId,
      brand: Product.assertBrand(input.brand ?? null),
      packSize: Product.assertPackSize(input.packSize),
      packUnit: input.packUnit,
      imageUrl: input.imageUrl ?? null,
      barcodes: Product.assertBarcodes(input.barcodes),
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: ProductProps): Product {
    return new Product(props)
  }

  update(input: ProductUpdateInput, now: Date = new Date()): Product {
    return new Product({
      ...this.props(),
      brand: input.brand !== undefined ? Product.assertBrand(input.brand) : this.brand,
      packSize: input.packSize !== undefined ? Product.assertPackSize(input.packSize) : this.packSize,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : this.imageUrl,
      barcodes: input.barcodes !== undefined ? Product.assertBarcodes(input.barcodes) : [...this.barcodes],
      updatedAt: now,
    })
  }

  private props(): ProductProps {
    return {
      id: this.id,
      householdId: this.householdId,
      ingredientId: this.ingredientId,
      brand: this.brand,
      packSize: this.packSize,
      packUnit: this.packUnit,
      imageUrl: this.imageUrl,
      barcodes: [...this.barcodes],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  private static assertBrand(raw: string | null): string | null {
    if (raw === null) return null
    const v = raw.trim()
    if (v.length === 0) return null
    if (v.length > 100) {
      throw new Error('Brand must not exceed 100 characters.')
    }
    return v
  }

  private static assertPackSize(value: number): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('packSize must be a positive integer.')
    }
    return value
  }

  private static assertBarcodes(raw: readonly string[]): Barcode[] {
    if (raw.length === 0) {
      throw new Error('A product must have at least one barcode.')
    }
    const seen = new Set<string>()
    const result: Barcode[] = []
    for (const r of raw) {
      const b = Barcode.fromString(r)
      if (seen.has(b.value)) continue
      seen.add(b.value)
      result.push(b)
    }
    return result
  }
}
