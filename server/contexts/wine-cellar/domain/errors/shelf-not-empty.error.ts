export class ShelfNotEmptyError extends Error {
  override readonly name = 'ShelfNotEmptyError'
  constructor(readonly shelfId: string, readonly bottleCount: number) {
    super(`Shelf ${shelfId} still holds ${bottleCount} placed bottle(s); move or remove them first.`)
  }
}
