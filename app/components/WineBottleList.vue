<script setup lang="ts">
import type { BottlePlacementView, BottleView } from '../../shared/dto/wine-cellar'

defineProps<{
  bottles: BottleView[]
  loading?: boolean
}>()

const emit = defineEmits<{
  exit: [bottleId: string]
  unassign: [bottleId: string]
}>()

function placementLabel(p: BottlePlacementView | null): string {
  if (!p) return 'À ranger'
  return `${p.cellarName} · ${p.shelfLabel || `Clayette ${p.shelfPosition}`} · Étage ${p.rowPosition} · ${p.depth === 'back' ? 'arrière' : 'avant'} #${p.index}`
}
</script>

<template>
  <div class="space-y-2">
    <p v-if="loading" class="text-xs text-gray-500 flex items-center gap-2">
      <UIcon name="i-lucide-loader-circle" class="size-3 animate-spin" /> Chargement des bouteilles…
    </p>
    <p v-else-if="bottles.length === 0" class="text-xs text-gray-500">Aucune bouteille en stock pour ce vin.</p>
    <div
      v-for="bottle in bottles"
      v-else
      :key="bottle.id"
      class="flex items-center gap-2 py-1.5 text-sm border-b border-gray-100 dark:border-gray-800 last:border-0"
    >
      <div class="min-w-0 flex-1">
        <span>{{ formatBottleSize(bottle.size.value) }}</span>
        <template v-if="bottle.buyingPrice !== null"> · {{ formatPrice(bottle.buyingPrice) }}</template>
        <span class="mx-1">·</span>
        <NuxtLink
          v-if="bottle.placement"
          :to="`/cave/${bottle.placement.cellarId}?bottle=${bottle.id}`"
          class="text-primary-600 dark:text-primary-400 hover:underline"
        >{{ placementLabel(bottle.placement) }} <UIcon name="i-lucide-map-pin" class="size-3 align-middle" /></NuxtLink>
        <span v-else class="text-amber-600">{{ placementLabel(bottle.placement) }}</span>
      </div>
      <UButton
        v-if="bottle.placement"
        icon="i-lucide-package-open"
        variant="ghost"
        size="xs"
        title="Renvoyer au pool à ranger"
        @click="emit('unassign', bottle.id)"
      />
      <UButton icon="i-lucide-wine-off" color="error" variant="soft" size="xs" @click="emit('exit', bottle.id)">
        Sortir
      </UButton>
    </div>
  </div>
</template>
