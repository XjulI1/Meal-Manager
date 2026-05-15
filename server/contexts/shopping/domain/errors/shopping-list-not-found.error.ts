export class ShoppingListNotFoundError extends Error {
  override readonly name = 'ShoppingListNotFoundError'
  constructor(message = 'Shopping list not found.') {
    super(message)
  }
}

export class ShoppingListItemNotFoundError extends Error {
  override readonly name = 'ShoppingListItemNotFoundError'
  constructor(itemId: string) {
    super(`Shopping list item not found: ${itemId}.`)
  }
}
