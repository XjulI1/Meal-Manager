import { ProductNotFoundError } from '../../domain/errors/product-not-found.error'
import type { IProductRepository } from '../../domain/ports/product-repository.port'

export interface RemoveProductInput {
  householdId: string
  id: string
}

export class RemoveProductUseCase {
  constructor(private readonly products: IProductRepository) {}

  async execute(input: RemoveProductInput): Promise<void> {
    const existing = await this.products.findById(input.id, input.householdId)
    if (!existing) {
      throw new ProductNotFoundError(input.id)
    }
    await this.products.delete(input.id, input.householdId)
  }
}
