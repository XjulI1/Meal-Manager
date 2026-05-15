<script setup lang="ts">
definePageMeta({ title: 'Mon foyer' })

const toast = useToast()
const { create, join, leave } = useApiHousehold()
const { state: household, refresh, reset } = useCurrentHousehold()

watchEffect(() => {
  setPageLayout(household.value ? 'default' : 'auth')
})

const tab = ref<'create' | 'join'>('create')

const createState = reactive({ name: '' })
const joinState = reactive({ inviteCode: '' })
const submitting = ref(false)

async function onCreate() {
  if (!createState.name.trim()) return
  submitting.value = true
  try {
    await create({ name: createState.name.trim() })
    await refresh()
    toast.add({ title: 'Foyer créé', color: 'success' })
    await navigateTo('/menu')
  }
  catch (error) {
    const message = (error as { statusMessage?: string }).statusMessage ?? 'Création impossible'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    submitting.value = false
  }
}

async function onJoin() {
  if (!joinState.inviteCode.trim()) return
  submitting.value = true
  try {
    await join({ inviteCode: joinState.inviteCode.trim() })
    await refresh()
    toast.add({ title: 'Foyer rejoint', color: 'success' })
    await navigateTo('/menu')
  }
  catch (error) {
    const message = (error as { statusMessage?: string }).statusMessage ?? 'Code invalide'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    submitting.value = false
  }
}

async function onLeave() {
  if (!confirm('Quitter le foyer ? Si vous êtes le dernier membre, toutes les données du foyer seront supprimées.')) {
    return
  }
  submitting.value = true
  try {
    await leave()
    reset()
    toast.add({ title: 'Foyer quitté', color: 'success' })
    await navigateTo('/household')
  }
  catch (error) {
    const message = (error as { statusMessage?: string }).statusMessage ?? 'Action impossible'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    submitting.value = false
  }
}

async function copyInvite() {
  if (!household.value) return
  await navigator.clipboard.writeText(household.value.inviteCode)
  toast.add({ title: 'Code copié', color: 'success' })
}
</script>

<template>
  <UCard v-if="household">
    <template #header>
      <h2 class="text-lg font-semibold">{{ household.name }}</h2>
    </template>

    <div class="space-y-4">
      <div>
        <p class="text-sm text-gray-500 mb-1">Code d’invitation</p>
        <div class="flex items-center gap-2">
          <code class="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-base font-mono">
            {{ household.inviteCode }}
          </code>
          <UButton icon="i-lucide-copy" color="neutral" variant="ghost" @click="copyInvite" />
        </div>
      </div>
      <div>
        <p class="text-sm text-gray-500 mb-2">Membres ({{ household.members.length }})</p>
        <ul class="space-y-1 text-sm">
          <li v-for="m in household.members" :key="m.userId" class="flex items-center gap-2">
            <UIcon name="i-lucide-user" class="size-4 text-gray-400" />
            <span>{{ m.email }}</span>
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <UButton to="/menu" variant="ghost">Aller au menu</UButton>
        <UButton color="error" variant="soft" :loading="submitting" @click="onLeave">Quitter le foyer</UButton>
      </div>
    </template>
  </UCard>

  <UCard v-else>
    <template #header>
      <h2 class="text-lg font-semibold">Rejoindre ou créer un foyer</h2>
      <p class="text-sm text-gray-500 mt-1">Tu dois faire partie d’un foyer pour utiliser l’application.</p>
    </template>

    <UTabs
      v-model="tab"
      :items="[{ label: 'Créer', value: 'create' }, { label: 'Rejoindre', value: 'join' }]"
      class="mb-4"
    />

    <UForm v-if="tab === 'create'" :state="createState" class="space-y-4" @submit.prevent="onCreate">
      <UFormField label="Nom du foyer" required>
        <UInput v-model="createState.name" placeholder="Famille Dupont" class="w-full" />
      </UFormField>
      <UButton type="submit" :loading="submitting" block>Créer le foyer</UButton>
    </UForm>

    <UForm v-else :state="joinState" class="space-y-4" @submit.prevent="onJoin">
      <UFormField label="Code d’invitation" required>
        <UInput v-model="joinState.inviteCode" placeholder="XXXXXXXX" class="w-full font-mono" />
      </UFormField>
      <UButton type="submit" :loading="submitting" block>Rejoindre</UButton>
    </UForm>
  </UCard>
</template>
