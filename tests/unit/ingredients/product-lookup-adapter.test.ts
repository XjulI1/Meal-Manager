import { describe, expect, it } from 'vitest'
import { Product } from '../../../server/contexts/ingredients/domain/entities/product.entity'
import type { IProductRepository } from '../../../server/contexts/ingredients/domain/ports/product-repository.port'
import { ProductLookupAdapter } from '../../../server/contexts/ingredients/infrastructure/product-lookup.adapter'

const HH_A = '00000000-0000-4000-8000-000000000001'
const HH_B = '00000000-0000-4000-8000-000000000002'
const PROD_ID = '00000000-0000-4000-8000-0000000000aa'
const INGR_ID = '00000000-0000-4000-8000-0000000000bb'

class FakeProductRepository implements IProductRepository {
  constructor(private readonly products: Map<string, Product> = new Map()) {}
  add(p: Product) { this.products.set(`${p.householdId}|${p.id}`, p) }
  async findById(id: string, householdId: string): Promise<Product | null> {
    return this.products.get(`${householdId}|${id}`) ?? null
  }
  async findByIngredient(): Promise<Product[]> { return [] }
  async findByBarcodeInHousehold(): Promise<Product | null> { return null }
  async findDuplicateBarcodesInHousehold(): Promise<string[]> { return [] }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

function makeProduct(householdId: string): Product {
  return Product.create({
    id: PROD_ID,
    householdId,
    ingredientId: INGR_ID,
    ingredientCanonicalUnit: 'g',
    brand: 'Panzani',
    packSize: 500,
    packUnit: 'g',
    barcodes: ['3038359002564'],
  })
}

describe('ProductLookupAdapter', () => {
  it('returns a ProductSummary for a product belonging to the household', async () => {
    const repo = new FakeProductRepository()
    repo.add(makeProduct(HH_A))
    const adapter = new ProductLookupAdapter(repo)

    const result = await adapter.findById(PROD_ID, HH_A)

    expect(result).toEqual({
      id: PROD_ID,
      ingredientId: INGR_ID,
      packSize: 500,
      packUnit: 'g',
    })
  })

  it('returns null for a product belonging to another household', async () => {
    const repo = new FakeProductRepository()
    repo.add(makeProduct(HH_A))
    const adapter = new ProductLookupAdapter(repo)

    const result = await adapter.findById(PROD_ID, HH_B)

    expect(result).toBeNull()
  })

  it('returns null for a non-existent product id', async () => {
    const adapter = new ProductLookupAdapter(new FakeProductRepository())

    const result = await adapter.findById(PROD_ID, HH_A)

    expect(result).toBeNull()
  })
})
