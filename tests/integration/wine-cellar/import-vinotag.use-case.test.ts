import { beforeEach, describe, expect, it } from 'vitest'
import { ImportVinotagUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/import-vinotag.use-case'
import { ListBottlesUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/list-bottles.use-case'
import { ListWinesUseCase } from '../../../server/contexts/wine-cellar/application/use-cases/list-wines.use-case'
import type {
  IWineImportParser,
  RawImportRow,
} from '../../../server/contexts/wine-cellar/domain/ports/wine-import-parser.port'
import { InMemoryBottleRepository } from './in-memory/in-memory-bottle.repository'
import { InMemoryCellarRepository } from './in-memory/in-memory-cellar.repository'
import { InMemoryWineRepository } from './in-memory/in-memory-wine.repository'

class StubParser implements IWineImportParser {
  constructor(private readonly rows: RawImportRow[]) {}
  async parse(): Promise<RawImportRow[]> {
    return this.rows
  }
}

const HH = 'hh-1'

function dataRow(rowNumber: number, cells: Record<string, string>): RawImportRow {
  return { rowNumber, cells }
}

describe('ImportVinotagUseCase', () => {
  let wines: InMemoryWineRepository
  let bottles: InMemoryBottleRepository
  let cellars: InMemoryCellarRepository
  let ids: () => string
  const now = () => new Date('2026-07-13T10:00:00Z')

  beforeEach(() => {
    wines = new InMemoryWineRepository()
    bottles = new InMemoryBottleRepository()
    cellars = new InMemoryCellarRepository()
    let n = 0
    ids = () => `id-${++n}`
  })

  it('creates a wine per row and N unplaced bottles', async () => {
    const parser = new StubParser([
      dataRow(2, { wine_name: 'Saint véran', wine_type: 'wine_white', wine_region: 'bourgogne', bottle_quantity: '4', bottle_size: '75cl' }),
      dataRow(3, { wine_name: 'Saint-Amour', wine_type: 'wine_red', wine_region: 'beaujolais', bottle_quantity: '2', bottle_buying_price: '20.00' }),
    ])
    const useCase = new ImportVinotagUseCase(parser, wines, bottles, ids, now)

    const report = await useCase.execute({ householdId: HH, file: new Uint8Array() })

    expect(report.winesCreated).toBe(2)
    expect(report.bottlesCreated).toBe(6)
    expect(report.skippedRows).toHaveLength(0)

    const listWines = new ListWinesUseCase(wines, bottles)
    const listBottles = new ListBottlesUseCase(bottles, wines, cellars)
    expect(await listWines.execute({ householdId: HH })).toHaveLength(2)

    const unplaced = await listBottles.execute({ householdId: HH, placement: 'unplaced' })
    expect(unplaced).toHaveLength(6)
    // Purchase price propagated to each bottle of the priced line.
    const priced = unplaced.filter((it) => it.bottle.buyingPrice === 20)
    expect(priced).toHaveLength(2)
  })

  it('skips rows without a name and reports them', async () => {
    const parser = new StubParser([
      dataRow(2, { wine_name: 'Villa Cantrius', wine_type: 'wine_white', bottle_quantity: '1' }),
      dataRow(3, { wine_name: '', wine_type: 'wine_red', bottle_quantity: '2' }),
    ])
    const useCase = new ImportVinotagUseCase(parser, wines, bottles, ids, now)

    const report = await useCase.execute({ householdId: HH, file: new Uint8Array() })

    expect(report.winesCreated).toBe(1)
    expect(report.bottlesCreated).toBe(1)
    expect(report.skippedRows).toEqual([{ row: 3, reason: 'wine_name manquant' }])
  })
})
