/** Raised when a Vinotag import file cannot be read or lacks the expected headers. */
export class WineImportError extends Error {
  override readonly name = 'WineImportError'
}
