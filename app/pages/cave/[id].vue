<script setup lang="ts">
import type {
  BottleListItemView,
  CellarLayoutView,
  ShelfLayoutView,
  RowLayoutView,
  SlotView,
} from '../../../shared/dto/wine-cellar'

definePageMeta({ title: 'Cave' })

const route = useRoute()
const cellarId = computed(() => route.params.id as string)
const highlightBottleId = computed(() => (route.query.bottle as string) || null)
const api = useApiWineCellar()
const toast = useToast()

const layout = ref<CellarLayoutView | null>(null)
const unplaced = ref<BottleListItemView[]>([])
const loading = ref(false)

function notifyError(error: unknown) {
  const e = error as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
  toast.add({ title: e?.data?.statusMessage ?? e?.statusMessage ?? e?.message ?? 'Erreur', color: 'error' })
}

async function loadLayout() {
  try { layout.value = await api.getCellarLayout(cellarId.value) }
  catch (e) { notifyError(e) }
}
async function loadUnplaced() {
  try { unplaced.value = await api.listBottles({ placement: 'unplaced' }) }
  catch (e) { notifyError(e) }
}
async function refresh() {
  await Promise.all([loadLayout(), loadUnplaced()])
  if (highlightBottleId.value) scrollToHighlight()
}

function scrollToHighlight() {
  nextTick(() => {
    setTimeout(() => {
      const el = document.querySelector(`[data-bottle-id="${highlightBottleId.value}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }, 100)
  })
}

onMounted(refresh)

// ── Add shelf ─────────────────────────────────────────────────────────
const showShelfModal = ref(false)
const shelfLabel = ref('')
async function submitShelf() {
  loading.value = true
  try {
    await api.addShelf(cellarId.value, { label: shelfLabel.value.trim() || undefined })
    shelfLabel.value = ''
    showShelfModal.value = false
    await loadLayout()
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}
async function removeShelf(shelf: ShelfLayoutView) {
  if (!confirm('Supprimer cette clayette ?')) return
  try { await api.deleteShelf(shelf.id); await loadLayout() }
  catch (e) { notifyError(e) }
}

// ── Rename shelf ──────────────────────────────────────────────────────
const showRenameShelfModal = ref(false)
const renameShelfId = ref<string | null>(null)
const renameShelfLabel = ref('')
function openRenameShelf(shelf: ShelfLayoutView) {
  renameShelfId.value = shelf.id
  renameShelfLabel.value = shelf.label ?? ''
  showRenameShelfModal.value = true
}
async function submitRenameShelf() {
  if (!renameShelfId.value) return
  loading.value = true
  try {
    await api.renameShelf(renameShelfId.value, renameShelfLabel.value.trim())
    showRenameShelfModal.value = false
    await loadLayout()
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

// ── Add row ───────────────────────────────────────────────────────────
const showRowModal = ref(false)
const rowShelfId = ref<string | null>(null)
const capacityBack = ref(8)
const capacityFront = ref(0)
function openAddRow(shelfId: string) { rowShelfId.value = shelfId; capacityBack.value = 8; capacityFront.value = 0; showRowModal.value = true }
async function submitRow() {
  if (!rowShelfId.value) return
  loading.value = true
  try {
    await api.addRow(rowShelfId.value, { capacityBack: capacityBack.value, capacityFront: capacityFront.value })
    showRowModal.value = false
    await loadLayout()
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}
async function removeRow(row: RowLayoutView) {
  if (!confirm('Supprimer cet étage ?')) return
  try { await api.deleteRow(row.id); await loadLayout() }
  catch (e) { notifyError(e) }
}

// ── Slot interaction ──────────────────────────────────────────────────
const showPlaceModal = ref(false)
const showOccupantModal = ref(false)
const target = ref<{ rowId: string, slot: SlotView } | null>(null)

function onSlotClick(payload: { rowId: string, slot: SlotView }) {
  target.value = payload
  if (payload.slot.bottle) showOccupantModal.value = true
  else { loadUnplaced(); showPlaceModal.value = true }
}

async function placeInSlot(bottleId: string) {
  if (!target.value) return
  loading.value = true
  try {
    await api.placeBottle(bottleId, {
      position: { rowId: target.value.rowId, depth: target.value.slot.depth, index: target.value.slot.index },
    })
    showPlaceModal.value = false
    await refresh()
    toast.add({ title: 'Bouteille rangée', color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

async function unassignOccupant() {
  if (!target.value?.slot.bottle) return
  loading.value = true
  try {
    await api.placeBottle(target.value.slot.bottle.id, { position: null })
    showOccupantModal.value = false
    await refresh()
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}

async function drinkOccupant() {
  if (!target.value?.slot.bottle) return
  loading.value = true
  try {
    await api.exitBottle(target.value.slot.bottle.id, { reason: 'consumed' })
    showOccupantModal.value = false
    await refresh()
    toast.add({ title: 'Bouteille bue', color: 'success' })
  }
  catch (e) { notifyError(e) }
  finally { loading.value = false }
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center gap-3">
      <UButton to="/cave" icon="i-lucide-arrow-left" variant="ghost" size="sm">Caves</UButton>
      <h1 class="text-2xl font-bold">{{ layout?.name ?? 'Cave' }}</h1>
    </div>

    <div class="flex justify-end">
      <UButton icon="i-lucide-plus" @click="showShelfModal = true">Ajouter une clayette</UButton>
    </div>

    <WineCellarGrid v-if="layout" :layout="layout" :highlight-bottle-id="highlightBottleId" @slot-click="onSlotClick">
      <template #shelf-actions="{ shelf }">
        <div class="flex gap-1">
          <UButton icon="i-lucide-pencil" size="xs" variant="ghost" color="neutral" title="Renommer" @click="openRenameShelf(shelf)" />
          <UButton icon="i-lucide-plus" size="xs" variant="soft" @click="openAddRow(shelf.id)">Étage</UButton>
          <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="removeShelf(shelf)" />
        </div>
      </template>
      <template #row-actions="{ row }">
        <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="neutral" @click="removeRow(row)" />
      </template>
    </WineCellarGrid>

    <!-- Add shelf modal -->
    <UModal v-model:open="showShelfModal" title="Nouvelle clayette">
      <template #body>
        <UForm :state="{ shelfLabel }" class="space-y-4" @submit.prevent="submitShelf">
          <UFormField label="Libellé (optionnel)">
            <UInput v-model="shelfLabel" class="w-full" placeholder="Clayette haute" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showShelfModal = false">Annuler</UButton>
            <UButton type="submit" :loading="loading">Ajouter</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Rename shelf modal -->
    <UModal v-model:open="showRenameShelfModal" title="Renommer la clayette">
      <template #body>
        <UForm :state="{ renameShelfLabel }" class="space-y-4" @submit.prevent="submitRenameShelf">
          <UFormField label="Libellé" help="Laisser vide pour revenir au libellé par défaut.">
            <UInput v-model="renameShelfLabel" class="w-full" placeholder="Bourgogne" autofocus />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showRenameShelfModal = false">Annuler</UButton>
            <UButton type="submit" :loading="loading">Enregistrer</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Add row modal -->
    <UModal v-model:open="showRowModal" title="Nouvel étage">
      <template #body>
        <UForm :state="{ capacityBack }" class="space-y-4" @submit.prevent="submitRow">
          <UFormField label="Capacité arrière" required help="Nombre de bouteilles (≥ 1).">
            <UInput v-model.number="capacityBack" type="number" min="1" class="w-full" />
          </UFormField>
          <UFormField label="Capacité avant" help="0 = pas de rangée avant.">
            <UInput v-model.number="capacityFront" type="number" min="0" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showRowModal = false">Annuler</UButton>
            <UButton type="submit" :loading="loading">Ajouter</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Place bottle modal -->
    <UModal v-model:open="showPlaceModal" title="Ranger une bouteille ici">
      <template #body>
        <div class="space-y-2">
          <p v-if="unplaced.length === 0" class="text-sm text-gray-500">
            Aucune bouteille dans le pool « à ranger ».
          </p>
          <button
            v-for="item in unplaced"
            :key="item.bottle.id"
            type="button"
            class="w-full flex items-center gap-3 p-2 rounded border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
            :disabled="loading"
            @click="placeInSlot(item.bottle.id)"
          >
            <span class="w-3 h-3 rounded-full shrink-0" :class="WINE_COLOR_DOT[item.wine.color]" />
            <span class="min-w-0 flex-1 truncate text-sm">
              {{ item.wine.name }}<span v-if="item.wine.vintage" class="text-gray-400"> · {{ item.wine.vintage }}</span>
            </span>
            <span class="text-xs text-gray-400">{{ formatBottleSize(item.bottle.size.value) }}</span>
          </button>
        </div>
      </template>
    </UModal>

    <!-- Occupant modal -->
    <UModal v-model:open="showOccupantModal" title="Bouteille rangée">
      <template #body>
        <div v-if="target?.slot.wine" class="space-y-4">
          <div class="flex items-center gap-3">
            <span class="w-4 h-4 rounded-full shrink-0" :class="WINE_COLOR_DOT[target.slot.wine.color]" />
            <div>
              <p class="font-medium">{{ target.slot.wine.name }}<span v-if="target.slot.wine.vintage" class="text-gray-400"> · {{ target.slot.wine.vintage }}</span></p>
              <p class="text-xs text-gray-500">
                {{ WINE_COLOR_LABELS[target.slot.wine.color] }}
                <template v-if="target.slot.wine.region"> · {{ WINE_REGION_LABELS[target.slot.wine.region] }}</template>
                <template v-if="target.slot.bottle"> · {{ formatBottleSize(target.slot.bottle.size.value) }}</template>
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <UButton variant="soft" color="neutral" icon="i-lucide-package-open" :loading="loading" @click="unassignOccupant">
              Retirer (à ranger)
            </UButton>
            <UButton color="error" icon="i-lucide-wine" :loading="loading" @click="drinkOccupant">Boire</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
