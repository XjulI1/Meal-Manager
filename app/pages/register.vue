<script setup lang="ts">
import { RegisterUserSchema } from '../../shared/dto/auth'

definePageMeta({ layout: 'auth', title: 'Créer un compte' })

const toast = useToast()
const { register } = useApiAuth()
const { refresh: refreshHousehold } = useCurrentHousehold()

const state = reactive({
  email: '',
  password: '',
})

const submitting = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    const parsed = RegisterUserSchema.safeParse(state)
    if (!parsed.success) {
      toast.add({
        title: 'Données invalides',
        description: parsed.error.issues[0]?.message ?? 'Vérifiez l’email et le mot de passe (≥ 12 caractères).',
        color: 'error',
      })
      return
    }
    await register(parsed.data)
    await refreshHousehold()
    await navigateTo('/onboarding')
  }
  catch (error) {
    const message = (error as { statusMessage?: string }).statusMessage ?? 'Inscription impossible'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">Créer un compte</h2>
    </template>

    <UForm :state="state" class="space-y-4" @submit.prevent="onSubmit">
      <UFormField label="Email" name="email" required>
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField label="Mot de passe" name="password" hint="12 caractères minimum" required>
        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>
      <UButton type="submit" :loading="submitting" block>S’inscrire</UButton>
    </UForm>

    <template #footer>
      <p class="text-sm text-gray-500">
        Déjà inscrit ?
        <NuxtLink to="/login" class="text-primary-600 hover:underline">Se connecter</NuxtLink>
      </p>
    </template>
  </UCard>
</template>
