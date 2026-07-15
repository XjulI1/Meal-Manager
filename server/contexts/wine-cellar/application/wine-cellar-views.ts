import type {
  BottlePlacementView,
  BottleView,
  ExitJournalEntryView,
  RowLayoutView,
  SlotView,
  WineView,
} from '../../../../shared/dto/wine-cellar'
import type { BottleDepth } from '../domain/value-objects/slot-position.vo'
import type { Bottle } from '../domain/entities/bottle.entity'
import type { Cellar } from '../domain/entities/cellar.entity'
import type { Row } from '../domain/entities/row.entity'
import type { Shelf } from '../domain/entities/shelf.entity'
import type { Wine } from '../domain/entities/wine.entity'

/** Index of the structure used to resolve a bottle's full placement path. */
export interface StructureIndex {
  cellarById: Map<string, Cellar>
  shelfById: Map<string, Shelf>
  rowById: Map<string, Row>
}

export function buildStructureIndex(
  cellars: Cellar[],
  shelves: Shelf[],
  rows: Row[],
): StructureIndex {
  return {
    cellarById: new Map(cellars.map((c) => [c.id, c])),
    shelfById: new Map(shelves.map((s) => [s.id, s])),
    rowById: new Map(rows.map((r) => [r.id, r])),
  }
}

export function toWineView(wine: Wine, bottleCount: number): WineView {
  return {
    id: wine.id,
    name: wine.name,
    domain: wine.domain,
    country: wine.country,
    region: wine.region ? wine.region.value : null,
    appellation: wine.appellation,
    vintage: wine.vintage,
    color: wine.color.value,
    gardeMin: wine.gardeMin,
    gardeMax: wine.gardeMax,
    comment: wine.comment,
    photoUrl: wine.photoUrl,
    rating: wine.rating,
    bottleCount,
  }
}

/** Accent- and case-insensitive normalization for free-text search. */
export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/** Whether a wine matches a free-text query across its searchable fields. */
export function wineMatchesQuery(wine: WineView, query: string): boolean {
  const needle = normalizeSearch(query)
  if (!needle) return true
  const haystack = normalizeSearch(
    [wine.name, wine.domain, wine.appellation, wine.country, wine.region, wine.vintage]
      .filter((v) => v !== null && v !== undefined)
      .join(' '),
  )
  return haystack.includes(needle)
}

export function toPlacementView(bottle: Bottle, index: StructureIndex): BottlePlacementView | null {
  if (!bottle.position) return null
  const row = index.rowById.get(bottle.position.rowId)
  if (!row) return null
  const shelf = index.shelfById.get(row.shelfId)
  if (!shelf) return null
  const cellar = index.cellarById.get(shelf.cellarId)
  if (!cellar) return null
  return {
    cellarId: cellar.id,
    cellarName: cellar.name,
    shelfId: shelf.id,
    shelfLabel: shelf.label,
    shelfPosition: shelf.position,
    rowId: row.id,
    rowPosition: row.position,
    depth: bottle.position.depth,
    index: bottle.position.index,
  }
}

export function toBottleView(bottle: Bottle, placement: BottlePlacementView | null): BottleView {
  return {
    id: bottle.id,
    wineId: bottle.wineId,
    size: bottle.size.toDisplay(),
    buyingPrice: bottle.buyingPriceCents === null ? null : bottle.buyingPriceCents / 100,
    addedDate: bottle.addedDate,
    status: bottle.status,
    placement,
  }
}

/** Builds a row's grid layout (back rack, then optional front rack). */
export function buildRowLayoutView(
  row: Row,
  bottlesInRow: Bottle[],
  winesById: Map<string, Wine>,
  index: StructureIndex,
  wineCounts: Map<string, number>,
): RowLayoutView {
  const slotAt = (depth: BottleDepth, i: number): SlotView => {
    const bottle = bottlesInRow.find(
      (b) => b.position && b.position.depth === depth && b.position.index === i,
    )
    if (!bottle) return { depth, index: i, bottle: null, wine: null }
    const wine = winesById.get(bottle.wineId)
    return {
      depth,
      index: i,
      bottle: toBottleView(bottle, toPlacementView(bottle, index)),
      wine: wine ? toWineView(wine, wineCounts.get(bottle.wineId) ?? 0) : null,
    }
  }
  return {
    id: row.id,
    position: row.position,
    capacityBack: row.capacityBack,
    capacityFront: row.capacityFront,
    back: Array.from({ length: row.capacityBack }, (_, k) => slotAt('back', k + 1)),
    front: Array.from({ length: row.capacityFront }, (_, k) => slotAt('front', k + 1)),
  }
}

/** Counts in-stock bottles per wine id. */
export function countBottlesByWine(bottles: Bottle[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const bottle of bottles) {
    counts.set(bottle.wineId, (counts.get(bottle.wineId) ?? 0) + 1)
  }
  return counts
}

export function toExitJournalEntryView(bottle: Bottle, wine: Wine | undefined): ExitJournalEntryView {
  return {
    bottleId: bottle.id,
    wineId: bottle.wineId,
    wineName: wine ? wine.name : '(vin supprimé)',
    vintage: wine ? wine.vintage : null,
    reason: bottle.exit ? bottle.exit.reason : 'consumed',
    exitDate: bottle.exit ? bottle.exit.date : null,
    tastingNote: bottle.exit ? bottle.exit.tastingNote : null,
  }
}
