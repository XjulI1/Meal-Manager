/** A single spreadsheet row: header → cell string value. */
export interface RawImportRow {
  /** 1-based sheet row number (header is row 1; first data row is 2). */
  rowNumber: number
  cells: Record<string, string>
}

/**
 * Reads a Vinotag `.xlsx` export into normalized raw rows. The parser is the
 * only place that knows the file format; column mapping is a pure service in
 * the application layer. MUST throw `WineImportError` when the file cannot be
 * read or the expected `wine_name` header is absent.
 */
export interface IWineImportParser {
  parse(file: Uint8Array): Promise<RawImportRow[]>
}
