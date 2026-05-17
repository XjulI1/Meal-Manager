export class UserNotInHouseholdError extends Error {
  override readonly name = 'UserNotInHouseholdError'
  constructor() {
    super('User must belong to a household to perform this action.')
  }
}
