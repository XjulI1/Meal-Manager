import { randomUUID } from 'node:crypto'
import type { CellarView } from '../../../../../shared/dto/wine-cellar'
import { Cellar } from '../../domain/entities/cellar.entity'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'

export interface CreateCellarInput {
  householdId: string
  name: string
}

export class CreateCellarUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly idGenerator: () => string = randomUUID,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(input: CreateCellarInput): Promise<CellarView> {
    const cellar = Cellar.create({
      id: this.idGenerator(),
      householdId: input.householdId,
      name: input.name,
      now: this.clock(),
    })
    await this.cellars.createCellar(cellar)
    return { id: cellar.id, name: cellar.name, shelfCount: 0, bottleCount: 0 }
  }
}
