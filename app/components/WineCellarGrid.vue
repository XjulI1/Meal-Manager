<script setup lang="ts">
import type { CellarLayoutView, RowLayoutView, SlotView } from '../../shared/dto/wine-cellar'

defineProps<{
  layout: CellarLayoutView
}>()

const emit = defineEmits<{
  slotClick: [payload: { rowId: string, slot: SlotView }]
}>()

interface Cell {
  key: string
  depth: 'front' | 'back'
  slot: SlotView
}

/**
 * Interleaves front (large) and back (small) slots on a single line —
 * front #1, back #1, front #2, back #2… — to convey depth, Vinotag-style.
 */
function cellsOf(row: RowLayoutView): Cell[] {
  const cells: Cell[] = []
  const max = Math.max(row.capacityFront, row.capacityBack)
  for (let i = 0; i < max; i++) {
    const front = row.front[i]
    if (front) cells.push({ key: `f-${i}`, depth: 'front', slot: front })
    const back = row.back[i]
    if (back) cells.push({ key: `b-${i}`, depth: 'back', slot: back })
  }
  return cells
}

function occupancy(row: RowLayoutView): { filled: number, total: number } {
  const all = [...row.back, ...row.front]
  return { filled: all.filter((s) => s.bottle).length, total: all.length }
}

function title(slot: SlotView): string {
  if (!slot.wine) return `Emplacement libre (${slot.depth === 'back' ? 'arrière' : 'avant'} #${slot.index})`
  return `${slot.wine.name}${slot.wine.vintage ? ` ${slot.wine.vintage}` : ''} — ${slot.depth === 'back' ? 'arrière' : 'avant'} #${slot.index}`
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="layout.shelves.length === 0" class="text-sm text-gray-500">
      Cette cave n'a pas encore de clayette.
    </p>

    <!-- One panel per shelf: rack of bottles on top, gold caption bar at the bottom. -->
    <div
      v-for="shelf in layout.shelves"
      :key="shelf.id"
      class="rounded-lg overflow-hidden border border-amber-800/40 bg-gray-50 dark:bg-gray-950"
    >
      <div class="p-3 space-y-3 overflow-x-auto">
        <p v-if="shelf.rows.length === 0" class="text-sm text-gray-500">Aucun étage.</p>

        <div v-for="row in (shelf.rows as RowLayoutView[])" :key="row.id" class="flex items-center gap-3">
          <div class="w-16 shrink-0 text-right">
            <span class="text-xs font-medium text-gray-500">Étage {{ row.position }}</span>
            <span class="block text-[10px] text-gray-400">{{ occupancy(row).filled }}/{{ occupancy(row).total }}</span>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              v-for="cell in cellsOf(row)"
              :key="cell.key"
              type="button"
              class="rounded-full shrink-0 border transition-all flex items-center justify-center"
              :class="[
                cell.depth === 'front' ? 'w-9 h-9' : 'w-5 h-5',
                cell.slot.wine
                  ? `${WINE_COLOR_DOT[cell.slot.wine.color]} border-black/20 shadow-sm hover:ring-2 hover:ring-amber-400`
                  : 'bg-gray-200/70 dark:bg-gray-800 border-dashed border-gray-400 dark:border-gray-600 hover:border-amber-500',
              ]"
              :title="title(cell.slot)"
              @click="emit('slotClick', { rowId: row.id, slot: cell.slot })"
            >
              <span
                v-if="cell.slot.wine?.vintage && cell.depth === 'front'"
                class="text-[9px] font-medium text-white/90 leading-none"
              >{{ String(cell.slot.wine.vintage).slice(2) }}</span>
            </button>
          </div>

          <div class="ml-auto pl-2">
            <slot name="row-actions" :row="row" />
          </div>
        </div>
      </div>

      <!-- Gold caption bar -->
      <div class="flex items-center justify-between gap-2 px-3 py-2 bg-amber-200/60 dark:bg-amber-900/30 border-t border-amber-800/40">
        <span class="font-medium text-amber-900 dark:text-amber-200 truncate">
          {{ shelf.label || `Clayette ${shelf.position}` }}
        </span>
        <div class="flex items-center gap-1 shrink-0">
          <slot name="shelf-actions" :shelf="shelf" />
        </div>
      </div>
    </div>

    <!-- Robe legend -->
    <div v-if="layout.shelves.length" class="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
      <span class="font-medium">Robe :</span>
      <span v-for="c in (['rouge', 'blanc', 'rose', 'effervescent'] as const)" :key="c" class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-full" :class="WINE_COLOR_DOT[c]" />
        {{ WINE_COLOR_LABELS[c] }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-4 h-4 rounded-full bg-gray-400" /> Avant
        <span class="w-2.5 h-2.5 rounded-full bg-gray-400 ml-1" /> Arrière
      </span>
    </div>
  </div>
</template>
