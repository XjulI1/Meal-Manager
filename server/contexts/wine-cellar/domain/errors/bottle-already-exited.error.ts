export class BottleAlreadyExitedError extends Error {
  override readonly name = 'BottleAlreadyExitedError'
  constructor(readonly bottleId: string) {
    super(`Bottle ${bottleId} has already been taken out of stock.`)
  }
}
