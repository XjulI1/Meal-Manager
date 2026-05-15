export class AlreadyInHouseholdError extends Error {
  override readonly name = 'AlreadyInHouseholdError'
  constructor() {
    super('User already belongs to a household.')
  }
}
