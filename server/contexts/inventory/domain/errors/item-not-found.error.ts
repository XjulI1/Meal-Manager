export class ItemNotFoundError extends Error {
  override readonly name = 'ItemNotFoundError'
  constructor(id: string) {
    super(`Inventory item not found: ${id}.`)
  }
}
