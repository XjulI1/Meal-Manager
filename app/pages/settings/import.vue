<script setup lang="ts">
import type { ImportReportView } from '../../../shared/dto/wine-cellar'

definePageMeta({ title: 'Import cave' })

const api = useApiWineCellar()
const toast = useToast()

const importReport = ref<ImportReportView | null>(null)
const importing = ref(false)
const importFileName = ref('')

function notifyError(error: unknown) {
  const e = error as { data?: { statusMessage?: string }, statusMessage?: string, message?: string }
  toast.add({ title: e?.data?.statusMessage ?? e?.statusMessage ?? e?.message ?? 'Erreur', color: 'error' })
}

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
  <div>
    <SettingsNav />

    <div class="space-y-4 max-w-xl">
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
          <NuxtLink to="/cave" class="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline pt-2">
            Voir la cave <UIcon name="i-lucide-arrow-right" class="size-4" />
          </NuxtLink>
        </div>
      </UCard>
    </div>
  </div>
</template>
