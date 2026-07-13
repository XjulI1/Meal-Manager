import type { ExitJournalEntryView } from '../../../../../shared/dto/wine-cellar'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { IWineRepository } from '../../domain/ports/wine-repository.port'
import { toExitJournalEntryView } from '../wine-cellar-views'

export interface ListExitJournalInput {
  householdId: string
}

/** The exit journal: consumed/gifted/broken bottles, most recent first. */
export class ListExitJournalUseCase {
  constructor(
    private readonly bottles: IBottleRepository,
    private readonly wines: IWineRepository,
  ) {}

  async execute(input: ListExitJournalInput): Promise<ExitJournalEntryView[]> {
    const consumed = await this.bottles.listConsumed(input.householdId)
    const winesById = new Map((await this.wines.list(input.householdId)).map((w) => [w.id, w]))

    return consumed
      .map((bottle) => toExitJournalEntryView(bottle, winesById.get(bottle.wineId)))
      .sort((a, b) => (b.exitDate ?? '').localeCompare(a.exitDate ?? ''))
  }
}
