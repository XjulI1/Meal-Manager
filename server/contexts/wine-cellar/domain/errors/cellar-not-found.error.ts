export class CellarNotFoundError extends Error {
  override readonly name = 'CellarNotFoundError'
  constructor(readonly cellarId: string) {
    super(`Cellar ${cellarId} was not found in this household.`)
  }
}
