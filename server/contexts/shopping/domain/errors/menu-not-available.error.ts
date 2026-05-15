export class MenuNotAvailableError extends Error {
  override readonly name = 'MenuNotAvailableError'
  constructor(menuId: string) {
    super(`Menu ${menuId} is not available for shopping-list generation in this household.`)
  }
}
