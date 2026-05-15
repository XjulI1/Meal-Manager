const PUBLIC_ROUTES = new Set(['/login', '/register'])
const HOUSEHOLD_ROUTE = '/household'

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch: refreshSession } = useUserSession()

  if (loggedIn.value === undefined) {
    await refreshSession()
  }

  const isPublic = PUBLIC_ROUTES.has(to.path)

  if (!loggedIn.value) {
    if (isPublic) return
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (isPublic) {
    return navigateTo('/menu')
  }

  const { ensureLoaded } = useCurrentHousehold()
  const household = await ensureLoaded()

  if (!household && to.path !== HOUSEHOLD_ROUTE) {
    return navigateTo(HOUSEHOLD_ROUTE)
  }
})
