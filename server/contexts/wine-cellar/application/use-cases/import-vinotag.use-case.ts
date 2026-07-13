import { randomUUID } from 'node:crypto'
import type { ImportReportView, ImportSkippedRow } from '../../../../../shared/dto/wine-cellar'
import { Bottle } from '../../domain/entities/bottle.entity'
import { Wine } from '../../domain/entities/wine.entity'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { IWineImportParser } from '../../domain/ports/wine-import-parser.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { priceToCents, resolveBottleSize } from '../bottle-size'
import { createWineAttributes } from '../wine-attributes'
import { mapVinotagRow } from '../vinotag-mapping'

export interface ImportVinotagInput {
  householdId: string
  file: Uint8Array
}

/**
 * One-shot Vinotag `.xlsx` import. Creates a wine reference per row plus its
 * `bottle_quantity` unplaced bottles (the "à ranger" pool). Rows without a name
 * (or that fail validation) are skipped and reported, never aborting the batch.
 */
export class ImportVinotagUseCase {
  constructor(
    private readonly parser: IWineImportParser,
    private readonly wines: IWineRepository,
    private readonly bottles: IBottleRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: ImportVinotagInput): Promise<ImportReportView> {
    const rows = await this.parser.parse(input.file)

    let winesCreated = 0
    let bottlesCreated = 0
    const skippedRows: ImportSkippedRow[] = []
    const now = this.clock()

    for (const row of rows) {
      const mapped = mapVinotagRow(row.cells)
      if (!mapped) {
        skippedRows.push({ row: row.rowNumber, reason: 'wine_name manquant' })
        continue
      }

      let wine: Wine
      try {
        wine = Wine.create({
          id: this.idGenerator(),
          householdId: input.householdId,
          attributes: createWineAttributes(mapped.wine),
          now,
        })
      }
      catch (error) {
        skippedRows.push({
          row: row.rowNumber,
          reason: error instanceof Error ? error.message : 'ligne invalide',
        })
        continue
      }

      await this.wines.create(wine)
      winesCreated++

      const size = resolveBottleSize(mapped.size)
      const buyingPriceCents = priceToCents(mapped.buyingPrice)
      const created: Bottle[] = []
      for (let i = 0; i < mapped.bottleQuantity; i++) {
        created.push(Bottle.create({
          id: this.idGenerator(),
          householdId: input.householdId,
          wineId: wine.id,
          size,
          buyingPriceCents,
          addedDate: mapped.addedDate ?? null,
          position: null,
          now,
        }))
      }
      if (created.length > 0) {
        await this.bottles.createMany(created)
        bottlesCreated += created.length
      }
    }

    return { winesCreated, bottlesCreated, skippedRows }
  }
}
