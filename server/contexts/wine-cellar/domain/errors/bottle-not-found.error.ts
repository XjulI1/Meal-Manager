export class BottleNotFoundError extends Error {
  override readonly name = 'BottleNotFoundError'
  constructor(readonly bottleId: string) {
    super(`Bottle ${bottleId} was not found in this household.`)
  }
}
