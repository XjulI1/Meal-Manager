<script setup lang="ts">
import type { CellarLayoutView, RowLayoutView, SlotView } from '../../shared/dto/wine-cellar'

defineProps<{
  layout: CellarLayoutView
}>()

const emit = defineEmits<{
  slotClick: [payload: { rowId: string, slot: SlotView }]
}>()

function slotTitle(slot: SlotView): string {
  if (!slot.wine) return 'Emplacement libre'
  return `${slot.wine.name}${slot.wine.vintage ? ` ${slot.wine.vintage}` : ''}`
}
</script>

<template>
  <div class="space-y-6">
    <p v-if="layout.shelves.length === 0" class="text-sm text-gray-500">
      Cette cave n'a pas encore de clayette.
    </p>

    <div
      v-for="shelf in layout.shelves"
      :key="shelf.id"
      class="rounded-lg border border-gray-200 dark:border-gray-800 p-4"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">{{ shelf.label || `Clayette ${shelf.position}` }}</h3>
        <slot name="shelf-actions" :shelf="shelf" />
      </div>

      <p v-if="shelf.rows.length === 0" class="text-sm text-gray-500">Aucun étage.</p>

      <div v-for="row in (shelf.rows as RowLayoutView[])" :key="row.id" class="mb-4 last:mb-0">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-gray-500">Étage {{ row.position }}</span>
          <slot name="row-actions" :row="row" />
        </div>

        <div class="space-y-1 overflow-x-auto">
          <div class="flex items-center gap-1">
            <span class="w-14 shrink-0 text-xs text-gray-400">Arrière</span>
            <div class="flex gap-1">
              <button
                v-for="slot in row.back"
                :key="`b-${slot.index}`"
                type="button"
                class="flex flex-col items-center justify-center w-16 h-14 shrink-0 rounded border text-[10px] leading-tight px-1 transition-colors"
                :class="slot.bottle
                  ? 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:ring-2 hover:ring-primary-400'
                  : 'border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'"
                :title="slotTitle(slot)"
                @click="emit('slotClick', { rowId: row.id, slot })"
              >
                <template v-if="slot.wine">
                  <span class="w-3 h-3 rounded-full mb-0.5" :class="WINE_COLOR_DOT[slot.wine.color]" />
                  <span class="truncate w-full text-center">{{ slot.wine.name }}</span>
                  <span v-if="slot.wine.vintage" class="text-gray-400">{{ slot.wine.vintage }}</span>
                </template>
                <span v-else>{{ slot.index }}</span>
              </button>
            </div>
          </div>

          <div v-if="row.capacityFront > 0" class="flex items-center gap-1">
            <span class="w-14 shrink-0 text-xs text-gray-400">Avant</span>
            <div class="flex gap-1">
              <button
                v-for="slot in row.front"
                :key="`f-${slot.index}`"
                type="button"
                class="flex flex-col items-center justify-center w-16 h-14 shrink-0 rounded border text-[10px] leading-tight px-1 transition-colors"
                :class="slot.bottle
                  ? 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:ring-2 hover:ring-primary-400'
                  : 'border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'"
                :title="slotTitle(slot)"
                @click="emit('slotClick', { rowId: row.id, slot })"
              >
                <template v-if="slot.wine">
                  <span class="w-3 h-3 rounded-full mb-0.5" :class="WINE_COLOR_DOT[slot.wine.color]" />
                  <span class="truncate w-full text-center">{{ slot.wine.name }}</span>
                  <span v-if="slot.wine.vintage" class="text-gray-400">{{ slot.wine.vintage }}</span>
                </template>
                <span v-else>{{ slot.index }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
