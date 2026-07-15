<script setup lang="ts">
import type {
  AddBottlesDto,
  ApogeeCalendarWineView,
  ApogeeStatus,
  BottleView,
  WineView,
} from '../../../shared/dto/wine-cellar'

definePageMeta({ title: 'Calendrier d\'apogée' })

const api = useApiWineCellar()
const toast = useToast()

function notifyError(error: unknown) {
  const e = error as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
  toast.add({ title: e?.data?.statusMessage ?? e?.statusMessage ?? e?.message ?? 'Erreur', color: 'error' })
}

const loading = ref(false)
const refYear = ref(new Date().getFullYear())
const entries = ref<ApogeeCalendarWineView[]>([])

async function loadCalendar() {
  loading.value = true
  try {
    const data = await api.getApogeeCalendar()
    refYear.value = data.refYear
    entries.value = data.wines
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}
onMounted(loadCalendar)

/** Whether a wine is drinkable in year `y` (mirrors the server's `isDrinkableInYear`). */
function isDrinkableInYear(gardeMin: number | null, gardeMax: number | null, y: number): boolean {
  return (gardeMin === null || gardeMin <= y) && (gardeMax === null || gardeMax >= y)
}

// ── Dashboard buckets (current year) ──────────────────────────────────────
interface BucketDef {
  status: ApogeeStatus
  label: string
  hint: string
  icon: string
  /** Tailwind classes for the bucket header accent. */
  accent: string
}

const BUCKETS: BucketDef[] = [
  { status: 'fin-apogee', label: 'À boire vite', hint: 'Fin de la période de garde', icon: 'i-lucide-alarm-clock', accent: 'text-amber-600 dark:text-amber-400' },
  { status: 'au-sommet', label: 'À son apogée', hint: 'Au sommet, moment idéal', icon: 'i-lucide-wine', accent: 'text-emerald-600 dark:text-emerald-400' },
  { status: 'debut-apogee', label: 'Peut s\'ouvrir', hint: 'Début de la période de garde', icon: 'i-lucide-door-open', accent: 'text-teal-600 dark:text-teal-400' },
  { status: 'a-venir', label: 'À venir', hint: 'Fenêtre pas encore ouverte', icon: 'i-lucide-hourglass', accent: 'text-sky-600 dark:text-sky-400' },
  { status: 'depasse', label: 'Apogée dépassée', hint: 'Fenêtre de garde passée', icon: 'i-lucide-triangle-alert', accent: 'text-rose-600 dark:text-rose-400' },
  { status: 'garde-non-renseignee', label: 'Garde non renseignée', hint: 'Aucune période de garde connue', icon: 'i-lucide-circle-help', accent: 'text-gray-500' },
]

const buckets = computed(() =>
  BUCKETS
    .map((def) => ({ ...def, wines: entries.value.filter((e) => e.status === def.status) }))
    .filter((b) => b.wines.length > 0),
)

const totalBottles = computed(() => entries.value.reduce((sum, e) => sum + e.wine.bottleCount, 0))

// ── Timeline by year ──────────────────────────────────────────────────────
/** Wines with at least one garde bound; those without are shown separately. */
const withWindow = computed(() => entries.value.filter((e) => e.wine.gardeMin !== null || e.wine.gardeMax !== null))
const withoutWindow = computed(() => entries.value.filter((e) => e.wine.gardeMin === null && e.wine.gardeMax === null))

const timeline = computed(() => {
  const maxGardeMax = withWindow.value.reduce((max, e) => Math.max(max, e.wine.gardeMax ?? 0), 0)
  // Cap the span so an outlier garde window can't render hundreds of years.
  const lastYear = Math.min(Math.max(refYear.value, maxGardeMax), refYear.value + 40)
  const years: { year: number, wines: ApogeeCalendarWineView[] }[] = []
  for (let y = refYear.value; y <= lastYear; y++) {
    const wines = withWindow.value.filter((e) => isDrinkableInYear(e.wine.gardeMin, e.wine.gardeMax, y))
    if (wines.length > 0) years.push({ year: y, wines })
  }
  return years
})

function gardeLabel(wine: WineView): string {
  if (wine.gardeMin === null && wine.gardeMax === null) return 'Garde non renseignée'
  return `${wine.gardeMin ?? '?'} – ${wine.gardeMax ?? '?'}`
}

// ── Wine detail + "boire" (exit) ──────────────────────────────────────────
const showDetail = ref(false)
const detailWine = ref<WineView | null>(null)
const detailBottles = ref<BottleView[]>([])
const loadingBottles = ref(false)

async function openWine(wine: WineView) {
  detailWine.value = wine
  detailBottles.value = []
  showDetail.value = true
  loadingBottles.value = true
  try {
    const { wine: fresh, bottles } = await api.getWine(wine.id)
    detailWine.value = fresh
    detailBottles.value = bottles
  }
  catch (e) { notifyError(e) }
  finally { loadingBottles.value = false }
}

/** Reloads the open cuvée (detail + bottles) and the calendar after a mutation. */
async function refreshDetail(id: string, closeIfEmpty = false) {
  const { wine, bottles } = await api.getWine(id)
  detailWine.value = wine
  detailBottles.value = bottles
  if (closeIfEmpty && wine.bottleCount === 0) showDetail.value = false
  await loadCalendar()
}

// ── AI enrichment ──────────────────────────────────────────────────────
const enriching = ref(false)
async function enrichCurrentWine() {
  if (!detailWine.value) return
  enriching.value = true
  const t = toast.add({ title: 'Recherche via l\'IA…', icon: 'i-lucide-loader-circle', color: 'info' })
  try {
    const updated = await api.enrichWine(detailWine.value.id)
    detailWine.value = updated
    await loadCalendar()
    toast.add({ title: 'Vin enrichi', color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally {
    toast.remove(t.id)
    enriching.value = false
  }
}

// ── Photo lightbox ──────────────────────────────────────────────────────
const showPhotoModal = ref(false)
const previewPhotoUrl = ref<string | null>(null)
function openPhoto(url: string) { previewPhotoUrl.value = url; showPhotoModal.value = true }

// ── Add bottles ─────────────────────────────────────────────────────────
const showBottlesModal = ref(false)
const bottlesWine = ref<WineView | null>(null)
function openAddBottles() {
  bottlesWine.value = detailWine.value
  showBottlesModal.value = true
}
async function submitBottles(payload: AddBottlesDto) {
  if (!bottlesWine.value) return
  loading.value = true
  try {
    const res = await api.addBottles(bottlesWine.value.id, payload)
    const wineId = bottlesWine.value.id
    showBottlesModal.value = false
    await refreshDetail(wineId)
    toast.add({ title: `${res.created} bouteille(s) ajoutée(s)`, color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

const showExitModal = ref(false)
const exitBottleId = ref<string | null>(null)
const exitReason = ref<'consumed' | 'gifted' | 'broken'>('consumed')
const exitNote = ref('')
const exitReasonOptions = [
  { value: 'consumed', label: 'Bue' },
  { value: 'gifted', label: 'Offerte' },
  { value: 'broken', label: 'Cassée' },
]
function openExit(bottleId: string) {
  exitBottleId.value = bottleId
  exitReason.value = 'consumed'
  exitNote.value = ''
  showExitModal.value = true
}
async function unassign(bottleId: string) {
  try {
    await api.placeBottle(bottleId, { position: null })
    if (detailWine.value) await refreshDetail(detailWine.value.id)
    toast.add({ title: 'Bouteille renvoyée au pool « à ranger »', color: 'success' })
  }
  catch (e) { notifyError(e) }
}

async function submitExit() {
  if (!exitBottleId.value) return
  loading.value = true
  try {
    await api.exitBottle(exitBottleId.value, {
      reason: exitReason.value,
      tastingNote: exitNote.value.trim() || undefined,
    })
    showExitModal.value = false
    toast.add({ title: 'Bouteille sortie du stock', color: 'success' })
    if (detailWine.value) await refreshDetail(detailWine.value.id, true)
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Calendrier d'apogée</h1>
        <p class="text-sm text-gray-500">Quand boire vos vins, selon leur période de garde.</p>
      </div>
      <UButton to="/cave" icon="i-lucide-arrow-left" variant="ghost" color="neutral">Cave</UButton>
    </div>

    <div v-if="loading && entries.length === 0" class="flex items-center gap-2 text-sm text-gray-500">
      <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Chargement…
    </div>

    <p v-else-if="entries.length === 0" class="text-sm text-gray-500">
      Aucun vin en stock. Ajoutez des bouteilles à votre cave pour planifier vos dégustations.
    </p>

    <template v-else>
      <p class="text-sm text-gray-500">
        {{ entries.length }} cuvée(s) · {{ totalBottles }} bouteille(s) en stock · année de référence {{ refYear }}
      </p>

      <!-- Dashboard "à boire" -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold">À boire ({{ refYear }})</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UCard v-for="bucket in buckets" :key="bucket.status">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon :name="bucket.icon" :class="bucket.accent" class="size-5" />
                <div class="min-w-0">
                  <p class="font-semibold leading-tight">{{ bucket.label }}</p>
                  <p class="text-xs text-gray-500">{{ bucket.hint }}</p>
                </div>
                <UBadge class="ml-auto" color="neutral" variant="subtle">{{ bucket.wines.length }}</UBadge>
              </div>
            </template>
            <ul class="divide-y divide-gray-100 dark:divide-gray-800">
              <li
                v-for="e in bucket.wines"
                :key="e.wine.id"
                class="flex items-center gap-3 py-2 cursor-pointer hover:opacity-80"
                @click="openWine(e.wine)"
              >
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="WINE_COLOR_DOT[e.wine.color]" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium truncate">
                    {{ e.wine.name }}<span v-if="e.wine.vintage" class="text-gray-400"> · {{ e.wine.vintage }}</span>
                  </p>
                  <p class="text-xs text-gray-500 truncate">
                    {{ WINE_COLOR_LABELS[e.wine.color] }}
                    <template v-if="e.wine.region"> · {{ WINE_REGION_LABELS[e.wine.region] }}</template>
                    · garde {{ gardeLabel(e.wine) }}
                  </p>
                </div>
                <UBadge color="neutral" variant="soft">{{ e.wine.bottleCount }}</UBadge>
              </li>
            </ul>
          </UCard>
        </div>
      </section>

      <!-- Timeline par année -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold">Chronologie</h2>
        <p v-if="timeline.length === 0" class="text-sm text-gray-500">
          Aucune cuvée avec une période de garde à venir.
        </p>
        <div v-else class="space-y-4">
          <div v-for="row in timeline" :key="row.year" class="flex gap-4">
            <div class="w-16 shrink-0 text-right">
              <span
                class="text-lg font-bold"
                :class="row.year === refYear ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'"
              >{{ row.year }}</span>
            </div>
            <div class="flex-1 border-l-2 border-gray-200 dark:border-gray-800 pl-4 pb-2 space-y-2">
              <div
                v-for="e in row.wines"
                :key="e.wine.id"
                class="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40 cursor-pointer"
                @click="openWine(e.wine)"
              >
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="WINE_COLOR_DOT[e.wine.color]" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium truncate">
                    {{ e.wine.name }}<span v-if="e.wine.vintage" class="text-gray-400"> · {{ e.wine.vintage }}</span>
                  </p>
                  <p class="text-xs text-gray-500 truncate">
                    {{ WINE_COLOR_LABELS[e.wine.color] }} · garde {{ gardeLabel(e.wine) }}
                  </p>
                </div>
                <UBadge color="neutral" variant="soft">{{ e.wine.bottleCount }}</UBadge>
              </div>
            </div>
          </div>
        </div>

        <!-- Garde non renseignée -->
        <div v-if="withoutWindow.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold text-gray-500">Garde non renseignée</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="e in withoutWindow"
              :key="e.wine.id"
              class="flex items-center gap-3 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40 cursor-pointer"
              @click="openWine(e.wine)"
            >
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="WINE_COLOR_DOT[e.wine.color]" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium truncate">
                  {{ e.wine.name }}<span v-if="e.wine.vintage" class="text-gray-400"> · {{ e.wine.vintage }}</span>
                </p>
                <p class="text-xs text-gray-500 truncate">{{ WINE_COLOR_LABELS[e.wine.color] }}</p>
              </div>
              <UBadge color="neutral" variant="soft">{{ e.wine.bottleCount }}</UBadge>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Détail cuvée + action "boire" -->
    <UModal
      v-model:open="showDetail"
      :title="detailWine ? detailWine.name : 'Cuvée'"
    >
      <template #body>
        <WineDetail
          v-if="detailWine"
          :wine="detailWine"
          :bottles="detailBottles"
          :loading-bottles="loadingBottles"
          :enriching="enriching"
          @enrich="enrichCurrentWine"
          @exit="openExit"
          @unassign="unassign"
          @add-bottles="openAddBottles"
          @open-photo="openPhoto"
        />
      </template>
    </UModal>

    <UModal v-model:open="showPhotoModal" title="Étiquette">
      <template #body>
        <img v-if="previewPhotoUrl" :src="previewPhotoUrl" alt="Étiquette du vin" class="w-full h-auto rounded-lg">
      </template>
    </UModal>

    <UModal v-model:open="showBottlesModal" title="Ajouter des bouteilles">
      <template #body>
        <WineBottlesForm
          :wine-name="bottlesWine?.name"
          :loading="loading"
          @submit="submitBottles"
          @cancel="showBottlesModal = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showExitModal" title="Boire / sortir une bouteille">
      <template #body>
        <UForm :state="{ exitReason }" class="space-y-4" @submit.prevent="submitExit">
          <UFormField label="Motif" required>
            <USelect v-model="exitReason" :items="exitReasonOptions" class="w-full" />
          </UFormField>
          <UFormField label="Note de dégustation">
            <UTextarea v-model="exitNote" class="w-full" :rows="2" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showExitModal = false">Annuler</UButton>
            <UButton type="submit" :loading="loading">Confirmer</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
