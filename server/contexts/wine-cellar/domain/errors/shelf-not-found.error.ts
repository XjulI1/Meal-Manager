export class ShelfNotFoundError extends Error {
  override readonly name = 'ShelfNotFoundError'
  constructor(readonly shelfId: string) {
    super(`Shelf ${shelfId} was not found in this household.`)
  }
}
