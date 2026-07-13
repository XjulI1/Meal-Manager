<script setup lang="ts">
import type { CellarLayoutView, RowLayoutView, SlotView } from '../../shared/dto/wine-cellar'

defineProps<{
  layout: CellarLayoutView
}>()

const emit = defineEmits<{
  slotClick: [payload: { rowId: string, slot: SlotView }]
}>()

const FRONT = 38
const BACK = 24
const GAP = 6

interface Cell {
  key: string
  slot: SlotView
  big: boolean
}

/**
 * One étage = a single centered line alternating front (large) and back (small).
 * Alternate étages flip the starting size (front-first vs back-first) so the
 * large tokens stagger into a quincunx down the panel — the Vinotag layout.
 */
function cellsOf(row: RowLayoutView, flip: boolean): Cell[] {
  const cells: Cell[] = []
  const max = Math.max(row.front.length, row.back.length)
  for (let i = 0; i < max; i++) {
    const front = row.front[i]
    const back = row.back[i]
    if (flip) {
      if (back) cells.push({ key: `b-${i}`, slot: back, big: false })
      if (front) cells.push({ key: `f-${i}`, slot: front, big: true })
    }
    else {
      if (front) cells.push({ key: `f-${i}`, slot: front, big: true })
      if (back) cells.push({ key: `b-${i}`, slot: back, big: false })
    }
  }
  return cells
}

/** Render highest position on top, étage 1 at the bottom (physical order). */
function orderedRows(shelf: { rows: RowLayoutView[] }): RowLayoutView[] {
  return [...shelf.rows].reverse()
}

function occupancy(row: RowLayoutView): { filled: number, total: number } {
  const all = [...row.back, ...row.front]
  return { filled: all.filter((s) => s.bottle).length, total: all.length }
}

function title(slot: SlotView): string {
  const where = `${slot.depth === 'back' ? 'arrière' : 'avant'} #${slot.index}`
  if (!slot.wine) return `Emplacement libre (${where})`
  return `${slot.wine.name}${slot.wine.vintage ? ` ${slot.wine.vintage}` : ''} — ${where}`
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="layout.shelves.length === 0" class="text-sm text-gray-500">
      Cette cave n'a pas encore de clayette.
    </p>

    <div
      v-for="shelf in layout.shelves"
      :key="shelf.id"
      class="rounded-lg overflow-hidden border border-amber-800/40 bg-gray-50 dark:bg-gray-950"
    >
      <div class="p-3 overflow-x-auto">
        <p v-if="shelf.rows.length === 0" class="text-sm text-gray-500">Aucun étage.</p>

        <div v-for="(row, ri) in orderedRows(shelf)" :key="row.id" class="flex items-center gap-3 py-1">
          <div class="w-16 shrink-0 text-right">
            <span class="text-xs font-medium text-gray-500">Étage {{ row.position }}</span>
            <span class="block text-[10px] text-gray-400">{{ occupancy(row).filled }}/{{ occupancy(row).total }}</span>
          </div>

          <div class="flex items-center" :style="{ gap: `${GAP}px` }">
            <button
              v-for="cell in cellsOf(row, (shelf.rows.length - 1 - ri) % 2 === 1)"
              :key="cell.key"
              type="button"
              class="shrink-0 flex items-center justify-center"
              :style="{ width: `${FRONT}px`, height: `${FRONT}px` }"
              :title="title(cell.slot)"
              @click="emit('slotClick', { rowId: row.id, slot: cell.slot })"
            >
              <span
                class="rounded-full flex items-center justify-center transition-all"
                :style="{ width: `${cell.big ? FRONT : BACK}px`, height: `${cell.big ? FRONT : BACK}px` }"
                :class="cell.slot.wine
                  ? `${WINE_COLOR_DOT[cell.slot.wine.color]} border border-black/25 shadow-sm hover:ring-2 hover:ring-amber-400`
                  : 'bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:border-amber-500'"
              >
                <span
                  v-if="cell.slot.wine?.vintage && cell.big"
                  class="text-[9px] font-medium leading-none"
                  :class="cell.slot.wine.color === 'rouge' || cell.slot.wine.color === 'rose' ? 'text-white/90' : 'text-black/70'"
                >{{ String(cell.slot.wine.vintage).slice(2) }}</span>
              </span>
            </button>
          </div>

          <div class="ml-auto pl-2">
            <slot name="row-actions" :row="row" />
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 px-3 py-2 bg-amber-200/60 dark:bg-amber-900/30 border-t border-amber-800/40">
        <span class="font-medium text-amber-900 dark:text-amber-200 truncate">
          {{ shelf.label || `Clayette ${shelf.position}` }}
        </span>
        <div class="flex items-center gap-1 shrink-0">
          <slot name="shelf-actions" :shelf="shelf" />
        </div>
      </div>
    </div>

    <div v-if="layout.shelves.length" class="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
      <span class="font-medium">Robe :</span>
      <span v-for="c in (['rouge', 'blanc', 'rose', 'effervescent'] as const)" :key="c" class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-full" :class="WINE_COLOR_DOT[c]" />
        {{ WINE_COLOR_LABELS[c] }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-4 h-4 rounded-full bg-gray-400" /> avant
        <span class="w-2.5 h-2.5 rounded-full bg-gray-400 ml-1" /> arrière
      </span>
    </div>
  </div>
</template>
