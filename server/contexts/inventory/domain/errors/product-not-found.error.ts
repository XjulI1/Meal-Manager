/**
 * Raised by `AddInventoryItemFromProductScanUseCase` when the resolved product
 * is unknown in the household (404 on `POST /api/inventory/from-scan`).
 */
export class ProductNotFoundError extends Error {
  override readonly name = 'ProductNotFoundError'
  constructor(readonly productId: string) {
    super(`Product not found: ${productId}.`)
  }
}
