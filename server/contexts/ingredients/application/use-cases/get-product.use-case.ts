import { ProductNotFoundError } from '../../domain/errors/product-not-found.error'
import type { IProductRepository } from '../../domain/ports/product-repository.port'
import { toProductView, type ProductView } from './views'

export interface GetProductInput {
  householdId: string
  id: string
}

export class GetProductUseCase {
  constructor(private readonly products: IProductRepository) {}

  async execute(input: GetProductInput): Promise<ProductView> {
    const product = await this.products.findById(input.id, input.householdId)
    if (!product) {
      throw new ProductNotFoundError(input.id)
    }
    return toProductView(product)
  }
}
