export class WineNotFoundError extends Error {
  override readonly name = 'WineNotFoundError'
  constructor(readonly wineId: string) {
    super(`Wine ${wineId} was not found in this household.`)
  }
}
