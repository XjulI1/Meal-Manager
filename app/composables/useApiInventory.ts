import type {
  CreateInventoryItemDto,
  InventoryItemView,
  StorageLocation,
  UpdateInventoryItemDto,
} from '../../shared/dto/inventory'

export function useApiInventory() {
  function list(location?: Ref<StorageLocation | undefined> | StorageLocation) {
    return useFetch<InventoryItemView[]>('/api/inventory', {
      query: { location },
      default: () => [],
    })
  }

  async function create(payload: CreateInventoryItemDto): Promise<InventoryItemView> {
    return $fetch<InventoryItemView>('/api/inventory', {
      method: 'POST',
      body: payload,
    })
  }

  async function update(id: string, payload: UpdateInventoryItemDto): Promise<InventoryItemView> {
    return $fetch<InventoryItemView>(`/api/inventory/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  }

  async function remove(id: string): Promise<void> {
    await $fetch(`/api/inventory/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
