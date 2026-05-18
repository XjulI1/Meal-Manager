<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CreateProductDto } from '../../../shared/dto/product'
import type { ConsumePreviewResponse, ScanResult } from '../../../shared/dto/scan.dto'
import type { StorageLocation } from '../../../shared/dto/inventory'

type Mode = 'enrich' | 'stock-in' | 'consume'

const props = defineProps<{
  barcode: string
  mode: Mode
  preselectedIngredientId?: string | null
}>()

const emit = defineEmits<{
  done: []
  cancel: []
  /** Switch to a different mode (e.g. stock-in → enrich when barcode unknown). */
  'switch-mode': [mode: Mode]
}>()

const toast = useToast()
const api = useApiBarcodes()
const inventoryApi = useApiInventory()
const productsApi = useApiProducts()

const pending = ref(true)
const submitting = ref(false)
const resolved = ref<ScanResult | null>(null)

// Stock-in form state
const quantityValue = ref<number>(0)
const quantityUnit = ref<string>('g')
const location = ref<StorageLocation>('pantry')

// Consume form state
const consumeQty = ref<number>(1)
const consumeUnit = ref<string>('g')
const preview = ref<ConsumePreviewResponse | null>(null)

// Enrich state — used when barcode is unknown and the user wants to create a product.
const pickedIngredientId = ref<string | null>(props.preselectedIngredientId ?? null)
const ingredientsApi = useApiIngredients()
const { data: allIngredients } = ingredientsApi.list()
const pickedIngredient = computed(() =>
  (allIngredients.value ?? []).find((i) => i.id === pickedIngredientId.value) ?? null,
)

onMounted(async () => {
  try {
    resolved.value = await api.resolve(props.barcode)
    if (resolved.value && props.mode === 'stock-in') {
      quantityValue.value = resolved.value.product.packSize
      quantityUnit.value = resolved.value.product.packUnit
      location.value = resolved.value.ingredient.storage
    }
    if (resolved.value && props.mode === 'consume') {
      consumeUnit.value = resolved.value.ingredient.canonicalUnit
      // Discover whether multiple locations carry this ingredient; if so, fetch a preview.
      const items = await $fetch<Array<{ ingredientId: string }>>('/api/inventory')
      const matching = items.filter((i) => i.ingredientId === resolved.value!.ingredient.id)
      if (matching.length > 1) {
        preview.value = await api.consumeByBarcode({
          barcode: props.barcode,
          quantity: { value: consumeQty.value, unit: consumeUnit.value },
          preview: true,
        })
      }
    }
  }
  finally {
    pending.value = false
  }
})

const isKnown = computed(() => resolved.value !== null)

async function submitEnrichWithBarcode(payload: CreateProductDto) {
  if (!pickedIngredientId.value) {
    toast.add({ title: 'Sélectionnez un ingrédient', color: 'error' })
    return
  }
  // Always include the scanned barcode in the new product, even if the user
  // also typed others in the textarea.
  const barcodes = Array.from(new Set([props.barcode, ...payload.barcodes]))
  submitting.value = true
  try {
    await productsApi.addToIngredient(pickedIngredientId.value, { ...payload, barcodes })
    toast.add({ title: 'Produit créé', color: 'success' })
    emit('done')
  }
  catch (err) {
    toast.add({
      title: (err as { statusMessage?: string }).statusMessage ?? 'Création impossible',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

async function submitStockIn() {
  if (!resolved.value) return
  submitting.value = true
  try {
    const res = await api.addFromScan({
      productId: resolved.value.product.id,
      quantity: { value: quantityValue.value, unit: quantityUnit.value },
      location: location.value,
    })
    toast.add({
      title: res.created ? 'Article ajouté' : 'Quantité incrémentée',
      color: 'success',
    })
    emit('done')
  }
  catch (err) {
    toast.add({
      title: (err as { statusMessage?: string }).statusMessage ?? 'Ajout impossible',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

async function refreshPreview() {
  if (!resolved.value) return
  preview.value = await api.consumeByBarcode({
    barcode: props.barcode,
    quantity: { value: consumeQty.value, unit: consumeUnit.value },
    preview: true,
  })
}

async function submitConsume() {
  if (!resolved.value) return
  submitting.value = true
  try {
    const res = await api.consumeByBarcode({
      barcode: props.barcode,
      quantity: { value: consumeQty.value, unit: consumeUnit.value },
    })
    const total = res.impactedLines.reduce((sum, l) => sum + l.quantityRemoved.value, 0)
    toast.add({
      title: `${total} ${res.impactedLines[0]?.quantityRemoved.unit ?? ''} retiré(s) de l’inventaire`,
      color: 'success',
    })
    emit('done')
  }
  catch (err) {
    toast.add({
      title: (err as { statusMessage?: string }).statusMessage ?? 'Consommation impossible',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

// Unused — kept so the `inventoryApi` import isn't dead-stripped while we
// keep the option of falling back to manual inventory listing if needed.
void inventoryApi

const LOCATION_LABELS: Record<StorageLocation, string> = {
  pantry: 'Placard',
  fridge: 'Frigo',
  freezer: 'Congélateur',
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="pending" class="text-center text-gray-500 py-8">
      Résolution du code-barres…
    </p>

    <!-- Mode: ENRICH -->
    <div v-else-if="mode === 'enrich'" class="space-y-3">
      <div v-if="isKnown" class="space-y-3">
        <UAlert
          color="info"
          icon="i-lucide-info"
          title="Ce produit est déjà connu"
          :description="`${resolved!.product.brand ?? 'Sans marque'} — ${resolved!.product.packSize} ${resolved!.product.packUnit} (ingrédient : ${resolved!.ingredient.name})`"
        />
        <p class="text-sm text-gray-500">
          Vous pouvez modifier ce produit depuis la page de l’ingrédient.
        </p>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="emit('cancel')">Fermer</UButton>
          <UButton
            :to="`/ingredients/${resolved!.ingredient.id}`"
            icon="i-lucide-external-link"
          >
            Ouvrir l’ingrédient
          </UButton>
        </div>
      </div>

      <div v-else class="space-y-3">
        <UAlert
          color="warning"
          icon="i-lucide-plus-circle"
          :title="`Nouveau produit (EAN ${barcode})`"
          description="Sélectionnez l’ingrédient parent puis remplissez le conditionnement."
        />

        <UFormField label="Ingrédient" required>
          <IngredientsIngredientPicker v-model="pickedIngredientId" />
        </UFormField>

        <IngredientsProductForm
          v-if="pickedIngredient"
          :key="pickedIngredient.id"
          :ingredient-canonical-unit="pickedIngredient.canonicalUnit"
          :initial="null as never"
          :loading="submitting"
          @submit="submitEnrichWithBarcode"
          @cancel="emit('cancel')"
        />
      </div>
    </div>

    <!-- Mode: STOCK-IN -->
    <div v-else-if="mode === 'stock-in'" class="space-y-3">
      <div v-if="!isKnown" class="space-y-3">
        <UAlert
          color="warning"
          icon="i-lucide-alert-circle"
          title="Produit inconnu"
          :description="`L’EAN ${barcode} n’est pas dans votre catalogue.`"
        />
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
          <UButton icon="i-lucide-plus" @click="emit('switch-mode', 'enrich')">Le créer d’abord</UButton>
        </div>
      </div>

      <div v-else class="space-y-3">
        <UAlert
          color="success"
          icon="i-lucide-package"
          :title="resolved!.ingredient.name"
          :description="`${resolved!.product.brand ?? 'Sans marque'} — ${resolved!.product.packSize} ${resolved!.product.packUnit}`"
        />

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Quantité" required>
            <UInput v-model.number="quantityValue" type="number" min="0" />
          </UFormField>
          <UFormField label="Unité">
            <UInput v-model="quantityUnit" />
          </UFormField>
        </div>

        <UFormField label="Emplacement">
          <USelectMenu
            v-model="location"
            :items="[
              { label: LOCATION_LABELS.pantry, value: 'pantry' },
              { label: LOCATION_LABELS.fridge, value: 'fridge' },
              { label: LOCATION_LABELS.freezer, value: 'freezer' },
            ]"
            value-key="value"
            label-key="label"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
          <UButton :loading="submitting" @click="submitStockIn">Ajouter à l’inventaire</UButton>
        </div>
      </div>
    </div>

    <!-- Mode: CONSUME -->
    <div v-else-if="mode === 'consume'" class="space-y-3">
      <div v-if="!isKnown" class="space-y-3">
        <UAlert
          color="error"
          icon="i-lucide-x-circle"
          title="Produit inconnu"
          :description="`L’EAN ${barcode} n’est pas dans votre catalogue.`"
        />
        <div class="flex justify-end">
          <UButton variant="ghost" color="neutral" @click="emit('cancel')">Fermer</UButton>
        </div>
      </div>

      <div v-else class="space-y-3">
        <UAlert
          color="info"
          icon="i-lucide-package-minus"
          :title="resolved!.ingredient.name"
          :description="`${resolved!.product.brand ?? 'Sans marque'} — ${resolved!.product.packSize} ${resolved!.product.packUnit}`"
        />

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Quantité à retirer" required>
            <UInput
              v-model.number="consumeQty"
              type="number"
              min="0"
              @change="refreshPreview"
            />
          </UFormField>
          <UFormField label="Unité">
            <UInput v-model="consumeUnit" @change="refreshPreview" />
          </UFormField>
        </div>

        <div v-if="preview" class="text-sm border border-gray-200 dark:border-gray-800 rounded p-3">
          <p class="font-medium mb-2">Plan de retrait :</p>
          <ul class="space-y-1">
            <li v-for="cand in preview.candidates" :key="cand.lineId">
              <span class="font-medium">{{ LOCATION_LABELS[cand.location] }}</span> :
              {{ cand.wouldRemove.value }} {{ cand.wouldRemove.unit }}
              / {{ cand.currentQuantity.value }} {{ cand.currentQuantity.unit }}
            </li>
          </ul>
          <p v-if="!preview.fullyConsumed" class="text-xs text-gray-500 mt-2">
            Total disponible : {{ preview.totalAvailable.value }} {{ preview.totalAvailable.unit }}.
          </p>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton variant="ghost" color="neutral" @click="emit('cancel')">Annuler</UButton>
          <UButton :loading="submitting" color="error" @click="submitConsume">Confirmer</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
