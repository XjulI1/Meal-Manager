export class TokenNotFoundError extends Error {
  override readonly name = 'TokenNotFoundError'
  constructor() {
    super('Token not found.')
  }
}
