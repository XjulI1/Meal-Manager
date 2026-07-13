import type { BottleSizeInput } from './bottle-size'
import type { WineInput } from './wine-attributes'

export interface MappedVinotagRow {
  wine: WineInput
  bottleQuantity: number
  size?: BottleSizeInput
  buyingPrice?: number
  addedDate?: string
}

const COLOR_MAP: Record<string, WineInput['color']> = {
  wine_red: 'rouge',
  wine_white: 'blanc',
  wine_rose: 'rose',
  wine_sparkling: 'effervescent',
}

const REGION_MAP: Record<string, string> = {
  bourgogne: 'bourgogne',
  bordeaux: 'bordeaux',
  beaujolais: 'beaujolais',
  vallee_du_rhone: 'vallee-du-rhone',
  vallee_de_la_loire: 'vallee-de-la-loire',
  alsace: 'alsace',
  champagne: 'champagne',
  languedoc: 'languedoc',
  provence: 'provence',
  sud_ouest: 'sud-ouest',
  jura: 'jura',
  savoie: 'savoie',
}

function cell(cells: Record<string, string>, key: string): string {
  return (cells[key] ?? '').trim()
}

function mapColor(raw: string): WineInput['color'] {
  return COLOR_MAP[raw.trim().toLowerCase()] ?? 'rouge'
}

function mapRegion(raw: string): string {
  const key = raw.trim().toLowerCase()
  if (!key) return 'autre'
  return REGION_MAP[key] ?? 'autre'
}

function mapCountry(raw: string): string | undefined {
  const key = raw.trim().toLowerCase()
  if (!key) return undefined // Wine creation defaults to "France".
  if (key === 'fr') return 'France'
  return raw.trim()
}

function parseYear(raw: string): number | undefined {
  const match = raw.match(/(\d{4})/)
  if (!match) return undefined
  const year = Number.parseInt(match[1]!, 10)
  return Number.isFinite(year) ? year : undefined
}

function parseSize(raw: string): BottleSizeInput | undefined {
  const match = raw.trim().toLowerCase().match(/([\d.,]+)\s*(ml|cl|dl|l)\b/)
  if (!match) return undefined
  const value = Number.parseFloat(match[1]!.replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0) return undefined
  return { value, unit: match[2]! }
}

function parsePrice(raw: string): number | undefined {
  if (!raw.trim()) return undefined
  const value = Number.parseFloat(raw.replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

function parseAddedDate(raw: string): string | undefined {
  if (!raw.trim()) return undefined
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return undefined
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseQuantity(raw: string): number {
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value >= 1 ? value : 1
}

function parseRating(raw: string): number | undefined {
  if (!raw.trim()) return undefined
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value >= 0 && value <= 5 ? value : undefined
}

/**
 * Maps a raw Vinotag row to the domain shape. Returns null when `wine_name` is
 * empty (the caller records it as a skipped row). `favorite` and
 * `bottle_real_price` are intentionally ignored.
 */
export function mapVinotagRow(cells: Record<string, string>): MappedVinotagRow | null {
  const name = cell(cells, 'wine_name')
  if (!name) return null

  const domain = cell(cells, 'wine_domain')
  const comment = cell(cells, 'wine_comment') || cell(cells, 'bottle_comment')

  return {
    wine: {
      name,
      domain: domain || undefined,
      country: mapCountry(cell(cells, 'wine_country')),
      region: mapRegion(cell(cells, 'wine_region')),
      vintage: parseYear(cell(cells, 'millesime_year')),
      color: mapColor(cell(cells, 'wine_type')),
      gardeMin: parseYear(cell(cells, 'wine_apogee_start')),
      gardeMax: parseYear(cell(cells, 'wine_apogee_end')),
      comment: comment || undefined,
      rating: parseRating(cell(cells, 'rating')),
    },
    bottleQuantity: parseQuantity(cell(cells, 'bottle_quantity')),
    size: parseSize(cell(cells, 'bottle_size')),
    buyingPrice: parsePrice(cell(cells, 'bottle_buying_price')),
    addedDate: parseAddedDate(cell(cells, 'last_bottle_added')),
  }
}
