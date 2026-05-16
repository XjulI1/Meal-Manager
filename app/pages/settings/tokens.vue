<script setup lang="ts">
import type { PersonalAccessTokenView } from '../../../shared/dto/personal-access-tokens'

definePageMeta({ title: 'Tokens d’accès' })

const toast = useToast()
const { list, create, revoke } = useApiTokens()

const tokens = ref<PersonalAccessTokenView[]>([])
const loading = ref(false)

async function refresh() {
  loading.value = true
  try {
    tokens.value = await list()
  }
  finally {
    loading.value = false
  }
}

await refresh()

const createOpen = ref(false)
const createName = ref('')
const submitting = ref(false)
const lastPlaintext = ref<string | null>(null)

function openCreate() {
  createName.value = ''
  lastPlaintext.value = null
  createOpen.value = true
}

async function submitCreate() {
  const name = createName.value.trim()
  if (!name) return
  submitting.value = true
  try {
    const result = await create({ name })
    lastPlaintext.value = result.plaintext
    await refresh()
    toast.add({ title: 'Token créé', color: 'success' })
  }
  catch (error) {
    const message = (error as { statusMessage?: string }).statusMessage ?? 'Création impossible'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    submitting.value = false
  }
}

async function copyPlaintext() {
  if (!lastPlaintext.value) return
  await navigator.clipboard.writeText(lastPlaintext.value)
  toast.add({ title: 'Token copié', color: 'success' })
}

function closeCreate() {
  createOpen.value = false
  // Clear the plaintext from memory after the modal closes.
  setTimeout(() => {
    lastPlaintext.value = null
    createName.value = ''
  }, 300)
}

async function onRevoke(token: PersonalAccessTokenView) {
  if (!confirm(`Révoquer le token « ${token.name} » ? Les clients qui l’utilisent perdront immédiatement l’accès.`)) {
    return
  }
  try {
    await revoke(token.id)
    await refresh()
    toast.add({ title: 'Token révoqué', color: 'success' })
  }
  catch (error) {
    const message = (error as { statusMessage?: string }).statusMessage ?? 'Action impossible'
    toast.add({ title: message, color: 'error' })
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}
</script>

<template>
  <div>
    <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold">Tokens d’accès personnels</h2>
          <p class="text-sm text-gray-500 mt-1">
            Utilisés par les clients LLM (Claude Desktop, Home Assistant, scripts) pour interroger
            ton foyer via le serveur MCP exposé sur <code class="font-mono">/mcp</code>.
            Lecture seule en v1.
          </p>
        </div>
        <UButton icon="i-lucide-plus" @click="openCreate">Nouveau token</UButton>
      </div>
    </template>

    <div v-if="loading" class="text-sm text-gray-500">Chargement…</div>

    <div v-else-if="tokens.length === 0" class="text-sm text-gray-500 py-6 text-center">
      Aucun token. Crée-en un pour autoriser un client LLM à lire ton foyer.
    </div>

    <table v-else class="w-full text-sm">
      <thead class="text-left text-xs text-gray-500 uppercase">
        <tr>
          <th class="py-2 pr-3">Nom</th>
          <th class="py-2 pr-3">Préfixe</th>
          <th class="py-2 pr-3">Créé</th>
          <th class="py-2 pr-3">Dernière utilisation</th>
          <th class="py-2 pr-3">Statut</th>
          <th class="py-2" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tokens" :key="t.id" class="border-t border-gray-200 dark:border-gray-800">
          <td class="py-3 pr-3 font-medium">{{ t.name }}</td>
          <td class="py-3 pr-3">
            <code class="font-mono text-xs">mm_pat_{{ t.prefix }}…</code>
          </td>
          <td class="py-3 pr-3 text-gray-500">{{ formatDate(t.createdAt) }}</td>
          <td class="py-3 pr-3 text-gray-500">{{ formatDate(t.lastUsedAt) }}</td>
          <td class="py-3 pr-3">
            <span v-if="t.revokedAt" class="text-error-600 dark:text-error-400">Révoqué</span>
            <span v-else class="text-success-600 dark:text-success-400">Actif</span>
          </td>
          <td class="py-3 text-right">
            <UButton
              v-if="!t.revokedAt"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              @click="onRevoke(t)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </UCard>

  <UModal v-model:open="createOpen" :ui="{ content: 'sm:max-w-lg' }" title="Nouveau token">
    <template #body>
      <div v-if="lastPlaintext" class="space-y-4">
        <UAlert
          color="warning"
          variant="subtle"
          title="Copie ton token maintenant"
          description="Pour des raisons de sécurité, il ne sera plus jamais affiché. Si tu le perds, crée-en un nouveau."
        />
        <div class="flex items-center gap-2">
          <code class="flex-1 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-sm font-mono break-all">
            {{ lastPlaintext }}
          </code>
          <UButton icon="i-lucide-copy" color="neutral" variant="ghost" @click="copyPlaintext" />
        </div>
        <div class="flex justify-end">
          <UButton @click="closeCreate">J’ai copié le token</UButton>
        </div>
      </div>

      <UForm v-else :state="{ name: createName }" class="space-y-4" @submit.prevent="submitCreate">
        <UFormField label="Nom du token" required hint="Pour reconnaître à quoi il sert (ex: « Claude Desktop »).">
          <UInput v-model="createName" placeholder="Claude Desktop" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="createOpen = false">Annuler</UButton>
          <UButton type="submit" :loading="submitting">Créer</UButton>
        </div>
      </UForm>
    </template>
  </UModal>
  </div>
</template>
