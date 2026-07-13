<script setup lang="ts">
import type { CellarLayoutView, RowLayoutView, SlotView } from '../../shared/dto/wine-cellar'

defineProps<{
  layout: CellarLayoutView
}>()

const emit = defineEmits<{
  slotClick: [payload: { rowId: string, slot: SlotView }]
}>()

// Geometry of the quincunx (staggered) rack, in px.
const FRONT = 38
const BACK = 24
const FRONT_GAP = 16
const PITCH = FRONT + FRONT_GAP
const BACK_GAP = PITCH - BACK // back bottles share the front pitch…
const BACK_OFFSET = PITCH / 2 - BACK / 2 // …shifted half a pitch into the valleys
const OVERLAP = 15 // front rises into the back row

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
      <div class="p-3 space-y-4 overflow-x-auto">
        <p v-if="shelf.rows.length === 0" class="text-sm text-gray-500">Aucun étage.</p>

        <div v-for="row in (shelf.rows as RowLayoutView[])" :key="row.id" class="flex items-center gap-3">
          <div class="w-16 shrink-0 text-right">
            <span class="text-xs font-medium text-gray-500">Étage {{ row.position }}</span>
            <span class="block text-[10px] text-gray-400">{{ occupancy(row).filled }}/{{ occupancy(row).total }}</span>
          </div>

          <div class="relative">
            <!-- Back rack (arrière): small, nestled in the valleys between front bottles. -->
            <div
              v-if="row.capacityFront > 0"
              class="flex"
              :style="{ gap: `${BACK_GAP}px`, paddingLeft: `${BACK_OFFSET}px` }"
            >
              <button
                v-for="slot in row.back"
                :key="`b-${slot.index}`"
                type="button"
                class="rounded-full shrink-0 flex items-center justify-center transition-all"
                :style="{ width: `${BACK}px`, height: `${BACK}px` }"
                :class="slot.wine
                  ? `${WINE_COLOR_DOT[slot.wine.color]} border border-black/25 hover:ring-2 hover:ring-amber-400`
                  : 'border border-dashed border-gray-400 dark:border-gray-600 hover:border-amber-500'"
                :title="title(slot)"
                @click="emit('slotClick', { rowId: row.id, slot })"
              />
            </div>

            <!-- Front rack (avant): large, overlapping upward into the back row. -->
            <div
              class="flex relative"
              :style="{ gap: `${FRONT_GAP}px`, marginTop: row.capacityFront > 0 ? `-${OVERLAP}px` : '0', zIndex: 1 }"
            >
              <button
                v-for="slot in (row.capacityFront > 0 ? row.front : row.back)"
                :key="`f-${slot.index}`"
                type="button"
                class="rounded-full shrink-0 flex items-center justify-center transition-all"
                :style="{ width: `${FRONT}px`, height: `${FRONT}px` }"
                :class="slot.wine
                  ? `${WINE_COLOR_DOT[slot.wine.color]} border border-black/25 shadow-sm hover:ring-2 hover:ring-amber-400`
                  : 'border border-dashed border-gray-400 dark:border-gray-600 hover:border-amber-500'"
                :title="title(slot)"
                @click="emit('slotClick', { rowId: row.id, slot })"
              >
                <span
                  v-if="slot.wine?.vintage"
                  class="text-[9px] font-medium leading-none"
                  :class="slot.wine.color === 'rouge' || slot.wine.color === 'rose' ? 'text-white/90' : 'text-black/70'"
                >{{ String(slot.wine.vintage).slice(2) }}</span>
              </button>
            </div>
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
