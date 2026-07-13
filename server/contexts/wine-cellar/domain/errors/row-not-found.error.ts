export class RowNotFoundError extends Error {
  override readonly name = 'RowNotFoundError'
  constructor(readonly rowId: string) {
    super(`Row ${rowId} was not found in this household.`)
  }
}
