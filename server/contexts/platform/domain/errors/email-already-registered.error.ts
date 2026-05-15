export class EmailAlreadyRegisteredError extends Error {
  override readonly name = 'EmailAlreadyRegisteredError'
  constructor() {
    super('An account already exists for this email address.')
  }
}
