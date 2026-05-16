export class ProductNotFoundError extends Error {
  override readonly name = 'ProductNotFoundError'
  constructor(id: string) {
    super(`Product not found: ${id}`)
  }
}
