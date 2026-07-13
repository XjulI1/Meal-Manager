import type { BottleView } from '../../../../../shared/dto/wine-cellar'
import type { ExitReason } from '../../domain/entities/bottle.entity'
import { BottleNotFoundError } from '../../domain/errors/bottle-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import { toBottleView } from '../wine-cellar-views'

export interface ExitBottleInput {
  householdId: string
  id: string
  reason: ExitReason
  exitDate?: string
  tastingNote?: string
}

/** Takes a bottle out of stock (drunk / gifted / broken) and journals the exit. */
export class ExitBottleUseCase {
  constructor(
    private readonly bottles: IBottleRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: ExitBottleInput): Promise<BottleView> {
    const bottle = await this.bottles.findById(input.id, input.householdId)
    if (!bottle) throw new BottleNotFoundError(input.id)

    const now = this.clock()
    const exitDate = input.exitDate ?? now.toISOString().slice(0, 10)
    const updated = bottle.takeOut(input.reason, exitDate, input.tastingNote ?? null, now)
    await this.bottles.update(updated)

    return toBottleView(updated, null)
  }
}
