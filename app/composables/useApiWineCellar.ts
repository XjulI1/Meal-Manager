import type {
  AddBottlesDto,
  AddRowDto,
  AddShelfDto,
  BottleListItemView,
  BottleView,
  CellarLayoutView,
  CellarView,
  CreateWineDto,
  ExitBottleDto,
  ExitJournalEntryView,
  ImportReportView,
  ListBottlesQueryDto,
  ListWinesQueryDto,
  PlaceBottleDto,
  RowLayoutView,
  ShelfLayoutView,
  UpdateBottleDto,
  UpdateRowDto,
  UpdateWineDto,
  WineView,
} from '../../shared/dto/wine-cellar'
import type { WineLabelDraftDto, WineLabelImageDto } from '../../shared/dto/wine-label'

interface GetWineResponse {
  wine: WineView
  bottles: BottleView[]
}

interface AddBottlesResponse {
  created: number
  bottles: BottleView[]
}

export function useApiWineCellar() {
  // ── Cellars & structure ──────────────────────────────────────────────
  const listCellars = () => $fetch<CellarView[]>('/api/cave/cellars')
  const createCellar = (name: string) =>
    $fetch<CellarView>('/api/cave/cellars', { method: 'POST', body: { name } })
  const renameCellar = (id: string, name: string) =>
    $fetch<CellarView>(`/api/cave/cellars/${id}`, { method: 'PATCH', body: { name } })
  const deleteCellar = (id: string) =>
    $fetch(`/api/cave/cellars/${id}`, { method: 'DELETE' })
  const getCellarLayout = (id: string) =>
    $fetch<CellarLayoutView>(`/api/cave/cellars/${id}`)

  const addShelf = (cellarId: string, payload: AddShelfDto) =>
    $fetch<ShelfLayoutView>(`/api/cave/cellars/${cellarId}/shelves`, { method: 'POST', body: payload })
  const renameShelf = (id: string, label: string) =>
    $fetch(`/api/cave/shelves/${id}`, { method: 'PATCH', body: { label } })
  const deleteShelf = (id: string) =>
    $fetch(`/api/cave/shelves/${id}`, { method: 'DELETE' })

  const addRow = (shelfId: string, payload: AddRowDto) =>
    $fetch<RowLayoutView>(`/api/cave/shelves/${shelfId}/rows`, { method: 'POST', body: payload })
  const updateRow = (id: string, payload: UpdateRowDto) =>
    $fetch<RowLayoutView>(`/api/cave/rows/${id}`, { method: 'PATCH', body: payload })
  const deleteRow = (id: string) =>
    $fetch(`/api/cave/rows/${id}`, { method: 'DELETE' })

  // ── Wines ────────────────────────────────────────────────────────────
  const listWines = (query: ListWinesQueryDto = {}) =>
    $fetch<WineView[]>('/api/cave/wines', { query })
  const getWine = (id: string) => $fetch<GetWineResponse>(`/api/cave/wines/${id}`)
  const createWine = (payload: CreateWineDto) =>
    $fetch<WineView>('/api/cave/wines', { method: 'POST', body: payload })
  const updateWine = (id: string, payload: UpdateWineDto) =>
    $fetch<WineView>(`/api/cave/wines/${id}`, { method: 'PATCH', body: payload })
  const addBottles = (wineId: string, payload: AddBottlesDto) =>
    $fetch<AddBottlesResponse>(`/api/cave/wines/${wineId}/bottles`, { method: 'POST', body: payload })

  // ── Bottles ──────────────────────────────────────────────────────────
  const listBottles = (query: ListBottlesQueryDto = {}) =>
    $fetch<BottleListItemView[]>('/api/cave/bottles', { query })
  const updateBottle = (id: string, payload: UpdateBottleDto) =>
    $fetch<BottleView>(`/api/cave/bottles/${id}`, { method: 'PATCH', body: payload })
  const placeBottle = (id: string, payload: PlaceBottleDto) =>
    $fetch<BottleView>(`/api/cave/bottles/${id}/position`, { method: 'PATCH', body: payload })
  const exitBottle = (id: string, payload: ExitBottleDto) =>
    $fetch<BottleView>(`/api/cave/bottles/${id}/exit`, { method: 'POST', body: payload })

  const journal = () => $fetch<ExitJournalEntryView[]>('/api/cave/journal')

  const importVinotag = (fileBase64: string, filename?: string) =>
    $fetch<ImportReportView>('/api/cave/import', { method: 'POST', body: { fileBase64, filename } })

  // ── Label scan (AI) ──────────────────────────────────────────────────
  /** Extract a wine draft from label photos (never persisted). */
  const scanLabel = (images: WineLabelImageDto[]) =>
    $fetch<WineLabelDraftDto>('/api/cave/scan-label', { method: 'POST', body: { images } })

  // ── Enrichment (AI) ────────────────────────────────────────────────────
  /** Research a wine's garde window, aromas and food pairings; persists on the wine. */
  const enrichWine = (id: string) =>
    $fetch<WineView>(`/api/cave/wines/${id}/enrich`, { method: 'POST' })

  return {
    listCellars,
    createCellar,
    renameCellar,
    deleteCellar,
    getCellarLayout,
    addShelf,
    renameShelf,
    deleteShelf,
    addRow,
    updateRow,
    deleteRow,
    listWines,
    getWine,
    createWine,
    updateWine,
    addBottles,
    listBottles,
    updateBottle,
    placeBottle,
    exitBottle,
    journal,
    importVinotag,
    scanLabel,
    enrichWine,
  }
}
