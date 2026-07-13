<script setup lang="ts">
import type {
  BottleListItemView,
  CellarView,
  CreateWineDto,
  ExitJournalEntryView,
  ImportReportView,
  ListBottlesQueryDto,
  WineColor,
  WineRegion,
  WineView,
} from '../../../shared/dto/wine-cellar'

definePageMeta({ title: 'Cave' })

const api = useApiWineCellar()
const toast = useToast()

type Tab = 'caves' | 'vins' | 'bouteilles' | 'journal' | 'import'
const tab = ref<Tab>('caves')
const tabs: { value: Tab, label: string, icon: string }[] = [
  { value: 'caves', label: 'Mes caves', icon: 'i-lucide-warehouse' },
  { value: 'vins', label: 'Vins', icon: 'i-lucide-grape' },
  { value: 'bouteilles', label: 'Bouteilles', icon: 'i-lucide-wine' },
  { value: 'journal', label: 'Journal', icon: 'i-lucide-scroll-text' },
  { value: 'import', label: 'Importer', icon: 'i-lucide-upload' },
]

const cellars = ref<CellarView[]>([])
const wines = ref<WineView[]>([])
const bottles = ref<BottleListItemView[]>([])
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
async function loadWines() {
  try { wines.value = await api.listWines() }
  catch (e) { notifyError(e) }
}
async function loadJournal() {
  try { journalEntries.value = await api.journal() }
  catch (e) { notifyError(e) }
}

// ── Bottle filters ──────────────────────────────────────────────────────
const fColor = ref<WineColor | ''>('')
const fRegion = ref<WineRegion | ''>('')
const fDomain = ref('')
const fPlacement = ref<'' | 'placed' | 'unplaced'>('')
const fSort = ref<'name' | 'vintage' | 'region'>('name')

const colorFilterOptions = [{ value: '', label: 'Toutes robes' }, ...WINE_COLOR_OPTIONS]
const regionFilterOptions = [{ value: '', label: 'Toutes régions' }, ...WINE_REGION_OPTIONS]
const placementOptions = [
  { value: '', label: 'Tous' },
  { value: 'placed', label: 'Rangées' },
  { value: 'unplaced', label: 'À ranger' },
]
const sortOptions = [
  { value: 'name', label: 'Nom' },
  { value: 'vintage', label: 'Millésime' },
  { value: 'region', label: 'Région' },
]

async function loadBottles() {
  const query: ListBottlesQueryDto = { sort: fSort.value }
  if (fColor.value) query.color = fColor.value
  if (fRegion.value) query.region = fRegion.value
  if (fDomain.value.trim()) query.domain = fDomain.value.trim()
  if (fPlacement.value) query.placement = fPlacement.value
  try { bottles.value = await api.listBottles(query) }
  catch (e) { notifyError(e) }
}

watch([fColor, fRegion, fDomain, fPlacement, fSort], loadBottles)
watch(tab, (t) => {
  if (t === 'vins') loadWines()
  if (t === 'bouteilles') loadBottles()
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
function openCreateWine() { editingWine.value = null; showWineModal.value = true }
function openEditWine(w: WineView) { editingWine.value = w; showWineModal.value = true }

async function submitWine(payload: CreateWineDto) {
  loading.value = true
  try {
    if (editingWine.value) await api.updateWine(editingWine.value.id, payload)
    else await api.createWine(payload)
    showWineModal.value = false
    await loadWines()
    toast.add({ title: editingWine.value ? 'Vin mis à jour' : 'Vin créé', color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

// ── Add bottles ───────────────────────────────────────────────────────
const showBottlesModal = ref(false)
const bottlesWine = ref<WineView | null>(null)
function openAddBottles(w: WineView) { bottlesWine.value = w; showBottlesModal.value = true }
async function submitBottles(payload: import('../../../shared/dto/wine-cellar').AddBottlesDto) {
  if (!bottlesWine.value) return
  loading.value = true
  try {
    const res = await api.addBottles(bottlesWine.value.id, payload)
    showBottlesModal.value = false
    await Promise.all([loadWines(), loadBottles()])
    toast.add({ title: `${res.created} bouteille(s) ajoutée(s)`, color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

// ── Bottle actions ────────────────────────────────────────────────────
const showExitModal = ref(false)
const exitBottleId = ref<string | null>(null)
const exitReason = ref<'consumed' | 'gifted' | 'broken'>('consumed')
const exitNote = ref('')
const exitReasonOptions = [
  { value: 'consumed', label: 'Bue' },
  { value: 'gifted', label: 'Offerte' },
  { value: 'broken', label: 'Cassée' },
]
function openExit(id: string) { exitBottleId.value = id; exitReason.value = 'consumed'; exitNote.value = ''; showExitModal.value = true }
async function submitExit() {
  if (!exitBottleId.value) return
  loading.value = true
  try {
    await api.exitBottle(exitBottleId.value, {
      reason: exitReason.value,
      tastingNote: exitNote.value.trim() || undefined,
    })
    showExitModal.value = false
    await Promise.all([loadBottles(), loadWines()])
    toast.add({ title: 'Bouteille sortie du stock', color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

async function unassign(id: string) {
  try {
    await api.placeBottle(id, { position: null })
    await loadBottles()
    toast.add({ title: 'Bouteille renvoyée au pool « à ranger »', color: 'success' })
  }
  catch (e) { notifyError(e) }
}

function placementLabel(b: BottleListItemView): string {
  const p = b.bottle.placement
  if (!p) return 'À ranger'
  return `${p.cellarName} · ${p.shelfLabel || `Clayette ${p.shelfPosition}`} · Étage ${p.rowPosition} · ${p.depth === 'back' ? 'arrière' : 'avant'} #${p.index}`
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

    <div class="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
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
      <div class="flex justify-end">
        <UButton icon="i-lucide-plus" @click="openCreateWine">Nouveau vin</UButton>
      </div>
      <p v-if="wines.length === 0" class="text-sm text-gray-500">Aucun vin. Créez-en un ou importez depuis Vinotag.</p>
      <div class="space-y-2">
        <div
          v-for="wine in wines"
          :key="wine.id"
          class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          <span class="w-3 h-3 rounded-full shrink-0" :class="WINE_COLOR_DOT[wine.color]" />
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">{{ wine.name }} <span v-if="wine.vintage" class="text-gray-400">· {{ wine.vintage }}</span></p>
            <p class="text-xs text-gray-500 truncate">
              {{ wine.domain || '—' }}
              <template v-if="wine.region"> · {{ WINE_REGION_LABELS[wine.region] }}</template>
              · {{ wine.bottleCount }} en stock
            </p>
          </div>
          <UButton icon="i-lucide-wine" variant="soft" size="xs" @click="openAddBottles(wine)">Bouteilles</UButton>
          <UButton icon="i-lucide-pencil" variant="ghost" size="xs" @click="openEditWine(wine)" />
        </div>
      </div>
    </section>

    <!-- Bouteilles -->
    <section v-else-if="tab === 'bouteilles'" class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <USelect v-model="fColor" :items="colorFilterOptions" />
        <USelect v-model="fRegion" :items="regionFilterOptions" />
        <UInput v-model="fDomain" placeholder="Domaine…" />
        <USelect v-model="fPlacement" :items="placementOptions" />
        <USelect v-model="fSort" :items="sortOptions" />
      </div>
      <p v-if="bottles.length === 0" class="text-sm text-gray-500">Aucune bouteille en stock pour ce filtre.</p>
      <div class="space-y-2">
        <div
          v-for="item in bottles"
          :key="item.bottle.id"
          class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          <span class="w-3 h-3 rounded-full shrink-0" :class="WINE_COLOR_DOT[item.wine.color]" />
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">
              {{ item.wine.name }}
              <span v-if="item.wine.vintage" class="text-gray-400">· {{ item.wine.vintage }}</span>
            </p>
            <p class="text-xs text-gray-500 truncate">
              {{ formatBottleSize(item.bottle.size.value) }}
              <template v-if="item.bottle.buyingPrice !== null"> · {{ formatPrice(item.bottle.buyingPrice) }}</template>
              · <span :class="item.bottle.placement ? '' : 'text-amber-600'">{{ placementLabel(item) }}</span>
            </p>
          </div>
          <UButton
            v-if="item.bottle.placement"
            icon="i-lucide-package-open"
            variant="ghost"
            size="xs"
            title="Renvoyer au pool à ranger"
            @click="unassign(item.bottle.id)"
          />
          <UButton icon="i-lucide-wine-off" color="error" variant="soft" size="xs" @click="openExit(item.bottle.id)">
            Sortir
          </UButton>
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
        <WineForm :initial="editingWine" :loading="loading" @submit="submitWine" @cancel="showWineModal = false" />
      </template>
    </UModal>

    <UModal v-model:open="showBottlesModal" title="Ajouter des bouteilles">
      <template #body>
        <WineBottlesForm :wine-name="bottlesWine?.name" :loading="loading" @submit="submitBottles" @cancel="showBottlesModal = false" />
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
