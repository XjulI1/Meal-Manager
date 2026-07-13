import type { Wine } from '../entities/wine.entity'

export interface IWineRepository {
  create(wine: Wine): Promise<void>
  findById(id: string, householdId: string): Promise<Wine | null>
  list(householdId: string): Promise<Wine[]>
  update(wine: Wine): Promise<void>
}
