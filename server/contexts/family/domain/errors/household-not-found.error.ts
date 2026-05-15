export class HouseholdNotFoundError extends Error {
  override readonly name = 'HouseholdNotFoundError'
  constructor() {
    super('Household not found.')
  }
}
