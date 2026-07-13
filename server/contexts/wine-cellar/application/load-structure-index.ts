import type { ICellarRepository } from '../domain/ports/cellar-repository.port'
import { buildStructureIndex, type StructureIndex } from './wine-cellar-views'

/** Loads the full household structure (cellars → shelves → rows) into an index. */
export async function loadStructureIndex(
  cellars: ICellarRepository,
  householdId: string,
): Promise<StructureIndex> {
  const cs = await cellars.listCellars(householdId)
  const shelves = (await Promise.all(
    cs.map((c) => cellars.listShelvesByCellar(c.id, householdId)),
  )).flat()
  const rows = (await Promise.all(
    shelves.map((s) => cellars.listRowsByShelf(s.id, householdId)),
  )).flat()
  return buildStructureIndex(cs, shelves, rows)
}
