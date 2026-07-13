import { RowNotEmptyError } from '../../domain/errors/row-not-empty.error'
import { RowNotFoundError } from '../../domain/errors/row-not-found.error'
import type { IBottleRepository } from '../../domain/ports/bottle-repository.port'
import type { ICellarRepository } from '../../domain/ports/cellar-repository.port'

export interface DeleteRowInput {
  householdId: string
  id: string
}

/** Deletes a row. Refused (RowNotEmptyError) while it still holds placed bottles. */
export class DeleteRowUseCase {
  constructor(
    private readonly cellars: ICellarRepository,
    private readonly bottles: IBottleRepository,
  ) {}

  async execute(input: DeleteRowInput): Promise<void> {
    const row = await this.cellars.findRowById(input.id, input.householdId)
    if (!row) throw new RowNotFoundError(input.id)

    const placed = await this.bottles.listPlacedByRowIds([row.id], input.householdId)
    if (placed.length > 0) {
      throw new RowNotEmptyError(row.id, placed.length)
    }

    await this.cellars.deleteRow(row.id, input.householdId)
  }
}
