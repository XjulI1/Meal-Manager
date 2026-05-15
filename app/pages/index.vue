<script setup lang="ts">
definePageMeta({ title: 'Accueil' })

const { loggedIn } = useUserSession()
const { state: household, ensureLoaded } = useCurrentHousehold()

onMounted(async () => {
  if (!loggedIn.value) {
    await navigateTo('/login')
    return
  }
  await ensureLoaded()
  await navigateTo(household.value ? '/menu' : '/onboarding')
})
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <UIcon name="i-lucide-loader" class="size-8 animate-spin" />
  </div>
</template>
