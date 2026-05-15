export class NotInHouseholdError extends Error {
  override readonly name = 'NotInHouseholdError'
  constructor() {
    super('User does not belong to any household.')
  }
}
