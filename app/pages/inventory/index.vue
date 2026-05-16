<script setup lang="ts">
import type { CreateInventoryItemDto, InventoryItemView, StorageLocation } from '../../../shared/dto/inventory'

definePageMeta({ title: 'Inventaire' })

const toast = useToast()
const api = useApiInventory()

const location = ref<StorageLocation>('pantry')
const { data: items, refresh, pending } = api.list(location)

const showForm = ref(false)
const editing = ref<InventoryItemView | null>(null)
const submitting = ref(false)

function openCreate() {
  editing.value = null
  showForm.value = true
}

function openEdit(item: InventoryItemView) {
  editing.value = item
  showForm.value = true
}

async function onSubmit(payload: CreateInventoryItemDto) {
  submitting.value = true
  try {
    if (editing.value) {
      await api.update(editing.value.id, payload)
      toast.add({ title: 'Article mis à jour', color: 'success' })
    }
    else {
      await api.create(payload)
      toast.add({ title: 'Article ajouté', color: 'success' })
    }
    showForm.value = false
    await refresh()
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Action impossible',
      color: 'error',
    })
  }
  finally {
    submitting.value = false
  }
}

async function onDelete(item: InventoryItemView) {
  if (!confirm(`Supprimer « ${item.name} » ?`)) return
  try {
    await api.remove(item.id)
    toast.add({ title: 'Article supprimé', color: 'success' })
    await refresh()
  }
  catch (error) {
    toast.add({
      title: (error as { statusMessage?: string }).statusMessage ?? 'Suppression impossible',
      color: 'error',
    })
  }
}

const tabItems = [
  { label: 'Placard', value: 'pantry' as StorageLocation, icon: 'i-lucide-archive' },
  { label: 'Frigo', value: 'fridge' as StorageLocation, icon: 'i-lucide-refrigerator' },
  { label: 'Congélateur', value: 'freezer' as StorageLocation, icon: 'i-lucide-snowflake' },
]

const EMPTY_LABELS: Record<StorageLocation, string> = {
  pantry: 'dans le placard',
  fridge: 'au frigo',
  freezer: 'au congélateur',
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-semibold">Inventaire</h1>
      <UButton icon="i-lucide-plus" @click="openCreate">Ajouter un article</UButton>
    </div>

    <UTabs v-model="location" :items="tabItems" />

    <UCard>
      <div v-if="pending && !items?.length" class="p-8 text-center text-gray-500">Chargement…</div>
      <div v-else-if="!items?.length" class="p-8 text-center text-gray-500">
        Aucun article {{ EMPTY_LABELS[location] }}.
      </div>
      <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
        <li v-for="item in items" :key="item.id" class="py-3 flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ item.name }}</p>
            <p class="text-sm text-gray-500">
              {{ item.quantity.value }} {{ item.quantity.unit }}
            </p>
          </div>
          <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" @click="openEdit(item)" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" @click="onDelete(item)" />
        </li>
      </ul>
    </UCard>

    <UModal
      v-model:open="showForm"
      :title="editing ? 'Modifier un article' : 'Ajouter un article'"
    >
      <template #body>
        <InventoryItemForm
          :initial="editing"
          :default-location="location"
          :loading="submitting"
          @submit="onSubmit"
          @cancel="showForm = false"
        />
      </template>
    </UModal>
  </div>
</template>
