<script setup lang="ts">
import type {
  BottleView,
  CellarView,
  CreateWineDto,
  ExitJournalEntryView,
  ImportReportView,
  ListWinesQueryDto,
  WineColor,
  WineLabelInputDto,
  WineRegion,
  WineView,
} from '../../../shared/dto/wine-cellar'
import type { WineLabelDraftDto } from '../../../shared/dto/wine-label'

definePageMeta({ title: 'Cave' })

const api = useApiWineCellar()
const toast = useToast()

type Tab = 'caves' | 'vins' | 'journal' | 'import'
const tab = ref<Tab>('caves')
const tabs: { value: Tab, label: string, icon: string }[] = [
  { value: 'caves', label: 'Mes caves', icon: 'i-lucide-warehouse' },
  { value: 'vins', label: 'Vins', icon: 'i-lucide-grape' },
  { value: 'journal', label: 'Journal', icon: 'i-lucide-scroll-text' },
  { value: 'import', label: 'Importer', icon: 'i-lucide-upload' },
]

const cellars = ref<CellarView[]>([])
const wines = ref<WineView[]>([])
const journalEntries = ref<ExitJournalEntryView[]>([])
const loading = ref(false)

function notifyError(error: unknown) {
  const e = error as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
  toast.add({ title: e?.data?.statusMessage ?? e?.statusMessage ?? e?.message ?? 'Erreur', color: 'error' })
}

async function loadCellars() {
  try { cellars.value = await api.listCellars() }
  catch (e) { notifyError(e) }
}
// ── Wine filters ────────────────────────────────────────────────────────
const wColor = ref<WineColor | 'all'>('all')
const wRegion = ref<WineRegion | 'all'>('all')
const wSearch = ref('')
const wSort = ref<'name' | 'vintage' | 'region'>('name')
const wineFiltersActive = computed(() =>
  wColor.value !== 'all' || wRegion.value !== 'all' || wSearch.value.trim() !== '',
)

async function loadWines() {
  const query: ListWinesQueryDto = { sort: wSort.value }
  if (wColor.value !== 'all') query.color = wColor.value
  if (wRegion.value !== 'all') query.region = wRegion.value
  if (wSearch.value.trim()) query.q = wSearch.value.trim()
  try { wines.value = await api.listWines(query) }
  catch (e) { notifyError(e) }
}
async function loadJournal() {
  try { journalEntries.value = await api.journal() }
  catch (e) { notifyError(e) }
}

// ── Wine view mode + expansion ────────────────────────────────────────────
/** Wine tab layout: dense list or label-first grid. */
const wineView = ref<'list' | 'grid'>('list')
/** Show only wines with ≥1 in-stock bottle (default) vs the full catalogue. */
const showOnlyInStock = ref(true)

const colorFilterOptions = [{ value: 'all', label: 'Toutes robes' }, ...WINE_COLOR_OPTIONS]
const regionFilterOptions = [{ value: 'all', label: 'Toutes régions' }, ...WINE_REGION_OPTIONS]
const sortOptions = [
  { value: 'name', label: 'Nom' },
  { value: 'vintage', label: 'Millésime' },
  { value: 'region', label: 'Région' },
]

const displayedWines = computed(() =>
  showOnlyInStock.value ? wines.value.filter((w) => w.bottleCount > 0) : wines.value,
)

// Per-wine bottle detail, shown in a modal and lazy-loaded on open.
const bottlesByWine = ref<Record<string, BottleView[]>>({})
const loadingBottles = ref(false)
const showWineBottlesModal = ref(false)
const detailWine = ref<WineView | null>(null)

async function loadWineBottles(id: string) {
  loadingBottles.value = true
  try {
    const { bottles } = await api.getWine(id)
    bottlesByWine.value = { ...bottlesByWine.value, [id]: bottles }
  }
  catch (e) { notifyError(e) }
  finally { loadingBottles.value = false }
}

async function openWineBottles(wine: WineView) {
  detailWine.value = wine
  showWineBottlesModal.value = true
  await loadWineBottles(wine.id)
}

/** Refresh the wine's stock count and the open modal's bottle detail after a mutation. */
async function refreshWine(id: string) {
  loadingBottles.value = true
  try {
    const { wine, bottles } = await api.getWine(id)
    bottlesByWine.value = { ...bottlesByWine.value, [id]: bottles }
    const idx = wines.value.findIndex((w) => w.id === id)
    if (idx !== -1) wines.value[idx] = wine
    if (detailWine.value?.id === id) detailWine.value = wine
  }
  catch (e) { notifyError(e) }
  finally { loadingBottles.value = false }
}

watch([wColor, wRegion, wSearch, wSort], loadWines)
watch(tab, (t) => {
  if (t === 'vins') loadWines()
  if (t === 'journal') loadJournal()
})

onMounted(loadCellars)

// ── Create cellar ─────────────────────────────────────────────────────
const showCellarModal = ref(false)
const newCellarName = ref('')
async function submitCellar() {
  if (!newCellarName.value.trim()) return
  loading.value = true
  try {
    await api.createCellar(newCellarName.value.trim())
    newCellarName.value = ''
    showCellarModal.value = false
    await loadCellars()
    toast.add({ title: 'Cave créée', color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

async function removeCellar(cellar: CellarView) {
  if (!confirm(`Supprimer la cave « ${cellar.name} » et sa structure ?`)) return
  try {
    await api.deleteCellar(cellar.id)
    await loadCellars()
  }
  catch (e) { notifyError(e) }
}

// ── Wine create/edit ──────────────────────────────────────────────────
const showWineModal = ref(false)
const editingWine = ref<WineView | null>(null)
/** Pre-fill (from label scan) and label photo carried into the create form. */
const winePrefill = ref<WineLabelDraftDto | null>(null)
const wineLabelPhoto = ref<WineLabelInputDto | null>(null)
/** When set, chain into "add bottles" after a scan-driven creation. */
const pendingBottleCount = ref<number | null>(null)

function openCreateWine() {
  editingWine.value = null
  winePrefill.value = null
  wineLabelPhoto.value = null
  pendingBottleCount.value = null
  showWineModal.value = true
}
function openEditWine(w: WineView) {
  editingWine.value = w
  winePrefill.value = null
  wineLabelPhoto.value = null
  pendingBottleCount.value = null
  showWineModal.value = true
}

async function submitWine(payload: CreateWineDto) {
  loading.value = true
  try {
    if (editingWine.value) {
      await api.updateWine(editingWine.value.id, payload)
      showWineModal.value = false
      await loadWines()
      toast.add({ title: 'Vin mis à jour', color: 'success' })
    }
    else {
      const created = await api.createWine(payload)
      showWineModal.value = false
      await loadWines()
      toast.add({ title: 'Vin créé', color: 'success' })
      // Chain into adding bottles when the wine came from a label scan.
      if (pendingBottleCount.value !== null) {
        openAddBottles(created, pendingBottleCount.value)
      }
    }
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

// ── Photo preview (lightbox) ──────────────────────────────────────────
const showPhotoModal = ref(false)
const previewPhotoUrl = ref<string | null>(null)
function openPhoto(url: string) { previewPhotoUrl.value = url; showPhotoModal.value = true }

// ── Label scan ────────────────────────────────────────────────────────
// The button opens the OS photo/camera picker directly (no intermediate modal).
const scanInput = useTemplateRef<HTMLInputElement>('scanInput')
const scanning = ref(false)
function openScan() { scanInput.value?.click() }

async function onLabelFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow re-picking the same file
  if (!file) return

  scanning.value = true
  const scanToast = toast.add({ title: 'Lecture de l\'étiquette…', icon: 'i-lucide-loader-circle', color: 'info' })
  try {
    const image: WineLabelInputDto = await normalizeImageFile(file)
    const draft = await api.scanLabel([image])
    editingWine.value = null
    winePrefill.value = draft
    wineLabelPhoto.value = image
    pendingBottleCount.value = draft.suggestedBottleCount
    showWineModal.value = true
  }
  catch (e) { notifyError(e) }
  finally {
    toast.remove(scanToast.id)
    scanning.value = false
  }
}

// ── Add bottles ───────────────────────────────────────────────────────
const showBottlesModal = ref(false)
const bottlesWine = ref<WineView | null>(null)
const bottlesInitialQuantity = ref(1)
function openAddBottles(w: WineView, initialQuantity = 1) {
  bottlesWine.value = w
  bottlesInitialQuantity.value = initialQuantity > 0 ? initialQuantity : 1
  showBottlesModal.value = true
}
async function submitBottles(payload: import('../../../shared/dto/wine-cellar').AddBottlesDto) {
  if (!bottlesWine.value) return
  loading.value = true
  try {
    const res = await api.addBottles(bottlesWine.value.id, payload)
    const wineId = bottlesWine.value.id
    showBottlesModal.value = false
    await loadWines()
    if (detailWine.value?.id === wineId) await refreshWine(wineId)
    toast.add({ title: `${res.created} bouteille(s) ajoutée(s)`, color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

// ── Bottle actions ────────────────────────────────────────────────────
const showExitModal = ref(false)
const exitBottleId = ref<string | null>(null)
const exitWineId = ref<string | null>(null)
const exitReason = ref<'consumed' | 'gifted' | 'broken'>('consumed')
const exitNote = ref('')
const exitReasonOptions = [
  { value: 'consumed', label: 'Bue' },
  { value: 'gifted', label: 'Offerte' },
  { value: 'broken', label: 'Cassée' },
]
function openExit(bottleId: string, wineId: string) {
  exitBottleId.value = bottleId
  exitWineId.value = wineId
  exitReason.value = 'consumed'
  exitNote.value = ''
  showExitModal.value = true
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
    if (exitWineId.value) await refreshWine(exitWineId.value)
    toast.add({ title: 'Bouteille sortie du stock', color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

async function unassign(bottleId: string, wineId: string) {
  try {
    await api.placeBottle(bottleId, { position: null })
    await loadWineBottles(wineId)
    toast.add({ title: 'Bouteille renvoyée au pool « à ranger »', color: 'success' })
  }
  catch (e) { notifyError(e) }
}

// ── Import ────────────────────────────────────────────────────────────
const importReport = ref<ImportReportView | null>(null)
const importing = ref(false)
const importFileName = ref('')

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importFileName.value = file.name
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    notifyError({ message: 'Seuls les fichiers .xlsx sont acceptés.' })
    return
  }
  importing.value = true
  importReport.value = null
  try {
    const base64 = await fileToBase64(file)
    importReport.value = await api.importVinotag(base64, file.name)
    toast.add({ title: 'Import terminé', color: 'success' })
    await Promise.all([loadWines(), loadCellars()])
  }
  catch (e) { notifyError(e) }
  finally { importing.value = false; input.value = '' }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Cave à vin</h1>
    </div>

    <div class="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto overflow-y-hidden">
      <button
        v-for="t in tabs"
        :key="t.value"
        type="button"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="tab === t.value
          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        @click="tab = t.value"
      >
        <UIcon :name="t.icon" class="size-4" />
        {{ t.label }}
      </button>
    </div>

    <!-- Caves -->
    <section v-if="tab === 'caves'" class="space-y-4">
      <div class="flex justify-end">
        <UButton icon="i-lucide-plus" @click="showCellarModal = true">Nouvelle cave</UButton>
      </div>
      <p v-if="cellars.length === 0" class="text-sm text-gray-500">
        Aucune cave déclarée. Créez-en une pour organiser vos clayettes et étages.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard v-for="cellar in cellars" :key="cellar.id">
          <div class="space-y-2">
            <div class="flex items-start justify-between">
              <NuxtLink :to="`/cave/${cellar.id}`" class="font-semibold hover:underline">{{ cellar.name }}</NuxtLink>
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="removeCellar(cellar)" />
            </div>
            <p class="text-sm text-gray-500">
              {{ cellar.shelfCount }} clayette(s) · {{ cellar.bottleCount }} bouteille(s) rangée(s)
            </p>
            <UButton :to="`/cave/${cellar.id}`" variant="soft" size="xs" icon="i-lucide-layout-grid">
              Ouvrir la cave
            </UButton>
          </div>
        </UCard>
      </div>
    </section>

    <!-- Vins -->
    <section v-else-if="tab === 'vins'" class="space-y-4">
      <div class="flex justify-end gap-2">
        <input
          ref="scanInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          @change="onLabelFilePicked"
        >
        <UButton icon="i-lucide-camera" color="neutral" variant="soft" :loading="scanning" @click="openScan">
          Scanner une étiquette
        </UButton>
        <UButton icon="i-lucide-plus" @click="openCreateWine">Nouveau vin</UButton>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <UInput v-model="wSearch" icon="i-lucide-search" placeholder="Rechercher…" class="col-span-2 sm:col-span-1" />
        <USelect v-model="wColor" :items="colorFilterOptions" />
        <USelect v-model="wRegion" :items="regionFilterOptions" />
        <USelect v-model="wSort" :items="sortOptions" />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <USwitch v-model="showOnlyInStock" label="En stock uniquement" />
        <UButtonGroup size="xs">
          <UButton
            icon="i-lucide-list"
            :color="wineView === 'list' ? 'primary' : 'neutral'"
            :variant="wineView === 'list' ? 'solid' : 'soft'"
            @click="wineView = 'list'"
          >
            Liste
          </UButton>
          <UButton
            icon="i-lucide-layout-grid"
            :color="wineView === 'grid' ? 'primary' : 'neutral'"
            :variant="wineView === 'grid' ? 'solid' : 'soft'"
            @click="wineView = 'grid'"
          >
            Grille
          </UButton>
        </UButtonGroup>
      </div>

      <p v-if="displayedWines.length === 0" class="text-sm text-gray-500">
        {{ wineFiltersActive || showOnlyInStock ? 'Aucun vin pour ce filtre.' : 'Aucun vin. Créez-en un ou importez depuis Vinotag.' }}
      </p>

      <!-- Vue liste -->
      <div v-else-if="wineView === 'list'" class="space-y-2">
        <div
          v-for="wine in displayedWines"
          :key="wine.id"
          class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40 cursor-pointer"
          @click="openWineBottles(wine)"
        >
          <img
            v-if="wine.photoUrl"
            :src="wine.photoUrl"
            alt=""
            loading="lazy"
            class="w-10 h-12 rounded object-cover shrink-0 bg-gray-100 dark:bg-gray-800 cursor-zoom-in"
            @click.stop="openPhoto(wine.photoUrl)"
          >
          <span v-else class="w-3 h-3 rounded-full shrink-0" :class="WINE_COLOR_DOT[wine.color]" />
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">{{ wine.name }} <span v-if="wine.vintage" class="text-gray-400">· {{ wine.vintage }}</span></p>
            <p class="text-xs text-gray-500 truncate">
              {{ wine.domain || '—' }}
              <template v-if="wine.region"> · {{ WINE_REGION_LABELS[wine.region] }}</template>
              · {{ wine.bottleCount }} en stock
            </p>
          </div>
          <UButton icon="i-lucide-wine" variant="soft" size="xs" @click.stop="openWineBottles(wine)">Bouteilles</UButton>
          <UButton icon="i-lucide-pencil" variant="ghost" size="xs" @click.stop="openEditWine(wine)" />
        </div>
      </div>

      <!-- Vue grille (étiquettes) -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="wine in displayedWines"
          :key="wine.id"
          class="flex flex-col rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
          @click="openWineBottles(wine)"
        >
          <div class="relative aspect-[3/4] bg-gray-100 dark:bg-gray-800 shrink-0">
            <img
              v-if="wine.photoUrl"
              :src="wine.photoUrl"
              :alt="wine.name"
              loading="lazy"
              class="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
              @click.stop="openPhoto(wine.photoUrl)"
            >
            <div v-else class="absolute inset-0 flex items-center justify-center">
              <span class="w-8 h-8 rounded-full" :class="WINE_COLOR_DOT[wine.color]" />
            </div>
          </div>
          <div class="p-2 space-y-1 flex-1 flex flex-col min-w-0">
            <p class="text-sm font-medium truncate">
              {{ wine.name }}
              <span v-if="wine.vintage" class="text-gray-400">· {{ wine.vintage }}</span>
            </p>
            <p class="text-xs text-gray-500 truncate">
              {{ wine.domain || '—' }}
              <template v-if="wine.region"> · {{ WINE_REGION_LABELS[wine.region] }}</template>
              · {{ wine.bottleCount }} en stock
            </p>
            <div class="flex gap-1 pt-1 mt-auto">
              <UButton icon="i-lucide-wine" variant="soft" size="xs" class="flex-1 justify-center" @click.stop="openWineBottles(wine)">Bouteilles</UButton>
              <UButton icon="i-lucide-pencil" variant="ghost" size="xs" @click.stop="openEditWine(wine)" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Journal -->
    <section v-else-if="tab === 'journal'" class="space-y-2">
      <p v-if="journalEntries.length === 0" class="text-sm text-gray-500">Aucune sortie enregistrée.</p>
      <div
        v-for="entry in journalEntries"
        :key="entry.bottleId"
        class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800"
      >
        <div class="min-w-0 flex-1">
          <p class="font-medium truncate">
            {{ entry.wineName }}<span v-if="entry.vintage" class="text-gray-400"> · {{ entry.vintage }}</span>
          </p>
          <p v-if="entry.tastingNote" class="text-xs text-gray-500 truncate">{{ entry.tastingNote }}</p>
        </div>
        <UBadge :color="entry.reason === 'consumed' ? 'primary' : 'neutral'" variant="soft">
          {{ entry.reason === 'consumed' ? 'Bue' : entry.reason === 'gifted' ? 'Offerte' : 'Cassée' }}
        </UBadge>
        <span class="text-xs text-gray-400">{{ entry.exitDate }}</span>
      </div>
    </section>

    <!-- Import -->
    <section v-else-if="tab === 'import'" class="space-y-4 max-w-xl">
      <UCard>
        <div class="space-y-3">
          <p class="text-sm">
            Importez un export Excel <strong>Vinotag</strong> (<code>.xlsx</code>). Chaque vin est créé avec ses
            bouteilles dans le pool « à ranger ». L'import ne fusionne pas avec l'existant : relancer le même fichier
            crée des doublons.
          </p>
          <input
            type="file"
            accept=".xlsx"
            :disabled="importing"
            class="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary-50 file:text-primary-700"
            @change="onImportFile"
          >
          <p v-if="importing" class="text-sm text-gray-500">Import en cours de « {{ importFileName }} »…</p>
        </div>
      </UCard>

      <UCard v-if="importReport">
        <template #header><span class="font-semibold">Rapport d'import</span></template>
        <div class="space-y-1 text-sm">
          <p>✅ {{ importReport.winesCreated }} vin(s) créé(s)</p>
          <p>🍾 {{ importReport.bottlesCreated }} bouteille(s) ajoutée(s) au pool « à ranger »</p>
          <p v-if="importReport.skippedRows.length">
            ⚠️ {{ importReport.skippedRows.length }} ligne(s) ignorée(s) :
            <span class="text-gray-500">{{ importReport.skippedRows.map((r) => `ligne ${r.row} (${r.reason})`).join(', ') }}</span>
          </p>
        </div>
      </UCard>
    </section>

    <!-- Modals -->
    <UModal v-model:open="showCellarModal" title="Nouvelle cave">
      <template #body>
        <UForm :state="{ newCellarName }" class="space-y-4" @submit.prevent="submitCellar">
          <UFormField label="Nom de la cave" required>
            <UInput v-model="newCellarName" class="w-full" placeholder="Cave J.R" autofocus />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showCellarModal = false">Annuler</UButton>
            <UButton type="submit" :loading="loading" :disabled="!newCellarName.trim()">Créer</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="showWineModal" :title="editingWine ? 'Modifier le vin' : 'Nouveau vin'">
      <template #body>
        <WineForm
          :initial="editingWine"
          :prefill="winePrefill"
          :label-photo="wineLabelPhoto"
          :loading="loading"
          @submit="submitWine"
          @cancel="showWineModal = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showPhotoModal" title="Étiquette">
      <template #body>
        <img v-if="previewPhotoUrl" :src="previewPhotoUrl" alt="Étiquette du vin" class="w-full h-auto rounded-lg">
      </template>
    </UModal>

    <UModal
      v-model:open="showWineBottlesModal"
      :title="detailWine ? `Bouteilles · ${detailWine.name}` : 'Bouteilles'"
    >
      <template #body>
        <div v-if="detailWine" class="space-y-4">
          <p class="text-sm text-gray-500">
            {{ detailWine.bottleCount }} bouteille(s) en stock
            <template v-if="detailWine.vintage"> · millésime {{ detailWine.vintage }}</template>
          </p>
          <WineBottleList
            :bottles="bottlesByWine[detailWine.id] ?? []"
            :loading="loadingBottles"
            @exit="(id) => openExit(id, detailWine!.id)"
            @unassign="(id) => unassign(id, detailWine!.id)"
          />
          <div class="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-800">
            <UButton icon="i-lucide-plus" variant="soft" @click="openAddBottles(detailWine)">
              Ajouter des bouteilles
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showBottlesModal" title="Ajouter des bouteilles">
      <template #body>
        <WineBottlesForm
          :wine-name="bottlesWine?.name"
          :initial-quantity="bottlesInitialQuantity"
          :loading="loading"
          @submit="submitBottles"
          @cancel="showBottlesModal = false"
        />
      </template>
    </UModal>

    <UModal v-model:open="showExitModal" title="Sortir une bouteille">
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
