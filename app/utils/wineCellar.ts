import type { BottleSizeInput, WineColor, WineRegion } from '../../shared/dto/wine-cellar'
import { WINE_REGIONS } from '../../shared/dto/wine-cellar'

export const WINE_COLOR_LABELS: Record<WineColor, string> = {
  rouge: 'Rouge',
  blanc: 'Blanc',
  rose: 'Rosé',
  effervescent: 'Effervescent',
}

/** Tailwind background classes for the robe colour dot (accessible: paired with a label). */
export const WINE_COLOR_DOT: Record<WineColor, string> = {
  rouge: 'bg-red-800',
  blanc: 'bg-amber-300',
  rose: 'bg-pink-400',
  effervescent: 'bg-yellow-300',
}

export const WINE_REGION_LABELS: Record<WineRegion, string> = {
  'bourgogne': 'Bourgogne',
  'bordeaux': 'Bordeaux',
  'beaujolais': 'Beaujolais',
  'vallee-du-rhone': 'Vallée du Rhône',
  'vallee-de-la-loire': 'Vallée de la Loire',
  'alsace': 'Alsace',
  'champagne': 'Champagne',
  'languedoc': 'Languedoc',
  'provence': 'Provence',
  'sud-ouest': 'Sud-Ouest',
  'jura': 'Jura',
  'savoie': 'Savoie',
  'autre': 'Autre',
}

export const WINE_COLOR_OPTIONS = (Object.keys(WINE_COLOR_LABELS) as WineColor[])
  .map((value) => ({ value, label: WINE_COLOR_LABELS[value] }))

export const WINE_REGION_OPTIONS = WINE_REGIONS.map((value) => ({
  value,
  label: WINE_REGION_LABELS[value],
}))

/** Standard bottle contenances offered in the UI. */
export const BOTTLE_SIZE_OPTIONS: { value: string, label: string, size: BottleSizeInput }[] = [
  { value: 'demi', label: 'Demi-bouteille (37,5 cl)', size: { value: 37.5, unit: 'cl' } },
  { value: '50cl', label: '50 cl', size: { value: 50, unit: 'cl' } },
  { value: '75cl', label: 'Bouteille (75 cl)', size: { value: 75, unit: 'cl' } },
  { value: 'magnum', label: 'Magnum (1,5 L)', size: { value: 1.5, unit: 'l' } },
  { value: 'jeroboam', label: 'Jéroboam (3 L)', size: { value: 3, unit: 'l' } },
]

export function formatBottleSize(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toLocaleString('fr-FR')} L`
  return `${(ml / 10).toLocaleString('fr-FR')} cl`
}

export function formatPrice(euros: number | null): string | null {
  if (euros === null) return null
  return euros.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}
