import { randomUUID } from 'node:crypto'
import type { ShelfLayoutView } from '../../../../../shared/dto/wine-cellar'
import { Shelf } from '../../domain/entities/shelf.entity'
import { CellarNotFoundError } from '../../domain/errors/cellar-not-found.error'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'

export interface AddShelfInput {
  householdId: string
  cellarId: string
  label?: string
  position?: number
}

export class AddShelfUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: AddShelfInput): Promise<ShelfLayoutView> {
    const cellar = await this.cellars.findCellarById(input.cellarId, input.householdId)
    if (!cellar) throw new CellarNotFoundError(input.cellarId)

    const existing = await this.cellars.listShelvesByCellar(cellar.id, input.householdId)
    const position = input.position ?? existing.length + 1

    const shelf = Shelf.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      cellarId: cellar.id,
      label: input.label ?? null,
      position,
      now: this.clock(),
    })
    await this.cellars.createShelf(shelf)

    return { id: shelf.id, label: shelf.label, position: shelf.position, rows: [] }
  }
}
