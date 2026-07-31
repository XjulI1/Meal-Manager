export class SlotItemNotFoundError extends Error {
  override readonly name = 'SlotItemNotFoundError'
  constructor(itemId: string) {
    super(`Slot item not found: ${itemId}.`)
  }
}
