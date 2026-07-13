import ExcelJS from 'exceljs'
import { WineImportError } from '../../domain/errors/wine-import.error'
import type { IWineImportParser, RawImportRow } from '../../domain/ports/wine-import-parser.port'

/** Reads a Vinotag `.xlsx` export using ExcelJS. Format knowledge lives here only. */
export class ExcelJsWineImportParser implements IWineImportParser {
  async parse(file: Uint8Array): Promise<RawImportRow[]> {
    const workbook = new ExcelJS.Workbook()
    try {
      const buffer = Buffer.from(file) as unknown as Parameters<typeof workbook.xlsx.load>[0]
      await workbook.xlsx.load(buffer)
    }
    catch {
      throw new WineImportError('Le fichier fourni n\'est pas un classeur Excel (.xlsx) lisible.')
    }

    const sheet = workbook.worksheets[0]
    if (!sheet) {
      throw new WineImportError('Le classeur ne contient aucune feuille.')
    }

    const headers = new Map<number, string>()
    sheet.getRow(1).eachCell((cell, col) => {
      const text = cellText(cell).trim()
      if (text) headers.set(col, text)
    })

    if (![...headers.values()].includes('wine_name')) {
      throw new WineImportError(
        'En-têtes Vinotag introuvables : la colonne « wine_name » est absente de la première ligne.',
      )
    }

    const out: RawImportRow[] = []
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const cells: Record<string, string> = {}
      let hasValue = false
      row.eachCell((cell, col) => {
        const key = headers.get(col)
        if (!key) return
        const text = cellText(cell)
        cells[key] = text
        if (text.trim()) hasValue = true
      })
      if (hasValue) out.push({ rowNumber, cells })
    })

    return out
  }
}

/** Coerces any ExcelJS cell value to a plain string. */
function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toDateString()
  if (typeof value === 'object') {
    if ('text' in value && value.text != null) return String(value.text)
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('')
    }
    if ('result' in value && value.result != null) return String(value.result)
    if ('formula' in value) return ''
    return ''
  }
  return String(value)
}
