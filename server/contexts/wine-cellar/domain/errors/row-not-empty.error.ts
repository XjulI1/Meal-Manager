export class RowNotEmptyError extends Error {
  override readonly name = 'RowNotEmptyError'
  constructor(readonly rowId: string, readonly bottleCount: number) {
    super(`Row ${rowId} still holds ${bottleCount} placed bottle(s); move or remove them first.`)
  }
}
