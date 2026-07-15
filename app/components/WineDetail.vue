<script setup lang="ts">
import type { BottleView, WineView } from '../../shared/dto/wine-cellar'

defineProps<{
  wine: WineView
  bottles: BottleView[]
  loadingBottles?: boolean
  enriching?: boolean
}>()

const emit = defineEmits<{
  enrich: []
  exit: [bottleId: string]
  unassign: [bottleId: string]
  addBottles: []
  openPhoto: [url: string]
}>()

function formatEnrichedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-500">
      {{ wine.bottleCount }} bouteille(s) en stock
    </p>

    <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-3">
      <div class="flex items-start gap-3">
        <img
          v-if="wine.photoUrl"
          :src="wine.photoUrl"
          :alt="`Étiquette · ${wine.name}`"
          class="w-14 h-14 rounded object-cover cursor-pointer shrink-0"
          @click="emit('openPhoto', wine.photoUrl)"
        >
        <span
          v-else
          class="w-4 h-4 rounded-full shrink-0 mt-1"
          :class="WINE_COLOR_DOT[wine.color]"
        />
        <p class="min-w-0 text-sm text-gray-500">
          {{ wine.domain || '—' }}
          <template v-if="wine.region"> · {{ WINE_REGION_LABELS[wine.region] }}</template>
        </p>
      </div>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt class="text-gray-500">Robe</dt>
          <dd class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full" :class="WINE_COLOR_DOT[wine.color]" />
            {{ WINE_COLOR_LABELS[wine.color] }}
          </dd>
        </div>
        <div v-if="wine.vintage">
          <dt class="text-gray-500">Millésime</dt>
          <dd>{{ wine.vintage }}</dd>
        </div>
        <div v-if="wine.appellation">
          <dt class="text-gray-500">Appellation</dt>
          <dd>{{ wine.appellation }}</dd>
        </div>
        <div v-if="wine.country">
          <dt class="text-gray-500">Pays</dt>
          <dd>{{ wine.country }}</dd>
        </div>
        <div v-if="wine.rating !== null">
          <dt class="text-gray-500">Note</dt>
          <dd>{{ wine.rating }}/5</dd>
        </div>
      </dl>
      <div v-if="wine.comment" class="text-sm">
        <dt class="text-gray-500">Commentaire</dt>
        <dd class="whitespace-pre-line">{{ wine.comment }}</dd>
      </div>
    </div>

    <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-sparkles" class="text-primary" />
          <span class="text-sm font-medium">Fiche IA</span>
          <UBadge
            v-if="wine.aiEnrichedAt"
            color="neutral"
            variant="subtle"
            size="sm"
          >
            Recherché le {{ formatEnrichedAt(wine.aiEnrichedAt) }}
          </UBadge>
        </div>
        <UButton
          :icon="wine.aiEnrichedAt ? 'i-lucide-refresh-cw' : 'i-lucide-sparkles'"
          :label="wine.aiEnrichedAt ? 'Relancer' : 'Rechercher via l\'IA'"
          size="sm"
          variant="soft"
          :loading="enriching"
          @click="emit('enrich')"
        />
      </div>
      <dl
        v-if="wine.aiEnrichedAt"
        class="grid grid-cols-1 gap-2 text-sm"
      >
        <div>
          <dt class="text-gray-500">Période de garde</dt>
          <dd v-if="wine.gardeMin || wine.gardeMax">
            {{ wine.gardeMin ?? '?' }} – {{ wine.gardeMax ?? '?' }}
          </dd>
          <dd v-else class="text-gray-400 italic">Non déterminée par la recherche</dd>
        </div>
        <div>
          <dt class="text-gray-500">Profil aromatique</dt>
          <dd v-if="wine.aromas">{{ wine.aromas }}</dd>
          <dd v-else class="text-gray-400 italic">Non déterminé par la recherche</dd>
        </div>
        <div>
          <dt class="text-gray-500">Accords mets/vin</dt>
          <dd v-if="wine.foodPairings">{{ wine.foodPairings }}</dd>
          <dd v-else class="text-gray-400 italic">Non déterminés par la recherche</dd>
        </div>
      </dl>
      <p v-else class="text-sm text-gray-500">
        Aucune fiche IA pour ce vin. Lancez une recherche pour trouver sa période de
        garde, son profil aromatique et les accords mets/vin.
      </p>
    </div>

    <WineBottleList
      :bottles="bottles"
      :loading="loadingBottles"
      @exit="(id) => emit('exit', id)"
      @unassign="(id) => emit('unassign', id)"
    />
    <div class="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-800">
      <UButton icon="i-lucide-plus" variant="soft" @click="emit('addBottles')">
        Ajouter des bouteilles
      </UButton>
    </div>
  </div>
</template>
