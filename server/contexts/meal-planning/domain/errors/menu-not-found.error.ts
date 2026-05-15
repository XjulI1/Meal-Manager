export class MenuNotFoundError extends Error {
  override readonly name = 'MenuNotFoundError'
  constructor(id: string) {
    super(`Menu not found: ${id}.`)
  }
}
