<script setup lang="ts">
import { LoginUserSchema } from '../../shared/dto/auth'

definePageMeta({ layout: 'auth', title: 'Connexion' })

const toast = useToast()
const route = useRoute()
const { login } = useApiAuth()
const { refresh: refreshHousehold } = useCurrentHousehold()

const state = reactive({
  email: '',
  password: '',
})

const submitting = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    const parsed = LoginUserSchema.safeParse(state)
    if (!parsed.success) {
      toast.add({ title: 'Identifiants invalides', color: 'error' })
      return
    }
    await login(parsed.data)
    const household = await refreshHousehold()
    const redirect = (route.query.redirect as string | undefined) ?? (household ? '/menu' : '/onboarding')
    await navigateTo(redirect)
  }
  catch (error) {
    const message = (error as { statusMessage?: string }).statusMessage ?? 'Connexion impossible'
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
      <h2 class="text-lg font-semibold">Connexion</h2>
    </template>

    <UForm :state="state" class="space-y-4" @submit.prevent="onSubmit">
      <UFormField label="Email" name="email" required>
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField label="Mot de passe" name="password" required>
        <UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" />
      </UFormField>
      <UButton type="submit" :loading="submitting" block>Se connecter</UButton>
    </UForm>

    <template #footer>
      <p class="text-sm text-gray-500">
        Pas encore de compte ?
        <NuxtLink to="/register" class="text-primary-600 hover:underline">Créer un compte</NuxtLink>
      </p>
    </template>
  </UCard>
</template>
