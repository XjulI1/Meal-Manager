import type { CurrentHousehold } from './useApiHousehold'

export function useCurrentHousehold() {
  const state = useState<CurrentHousehold | null | undefined>('current-household', () => undefined)
  const { fetchCurrent } = useApiHousehold()

  async function refresh(): Promise<CurrentHousehold | null> {
    const value = await fetchCurrent()
    state.value = value
    return value
  }

  async function ensureLoaded(): Promise<CurrentHousehold | null> {
    if (state.value === undefined) {
      return refresh()
    }
    return state.value
  }

  function reset(): void {
    state.value = undefined
  }

  return { state, refresh, ensureLoaded, reset }
}
