<script setup lang="ts">
const { user } = useUserSession()
const { state: household } = useCurrentHousehold()
const { logout } = useApiAuth()
const uiStore = useUiStore()

const menuItems = computed(() => [
  [
    {
      label: household.value?.name ?? 'Sans foyer',
      slot: 'household',
      type: 'label' as const,
    },
  ],
  [
    {
      label: 'Mon foyer',
      icon: 'i-lucide-users',
      to: '/household',
    },
    {
      label: 'Paramètres',
      icon: 'i-lucide-settings',
      to: '/settings/tokens',
    },
  ],
  [
    {
      label: 'Se déconnecter',
      icon: 'i-lucide-log-out',
      onSelect: async () => {
        await logout()
        await navigateTo('/login')
      },
    },
  ],
])
</script>

<template>
  <header class="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center px-4 gap-3">
    <UButton
      icon="i-lucide-menu"
      color="neutral"
      variant="ghost"
      class="lg:hidden"
      @click="uiStore.toggleSidebar()"
    />
    <div class="flex-1" />
    <UDropdownMenu v-if="user" :items="menuItems">
      <UButton color="neutral" variant="ghost" icon="i-lucide-user-round" trailing-icon="i-lucide-chevron-down">
        {{ user.email }}
      </UButton>
    </UDropdownMenu>
  </header>
</template>
