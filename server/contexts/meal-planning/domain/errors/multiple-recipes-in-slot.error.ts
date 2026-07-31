export class MultipleRecipesInSlotError extends Error {
  override readonly name = 'MultipleRecipesInSlotError'
  constructor(dayOfWeek: string, mealType: string) {
    super(`Slot ${dayOfWeek}/${mealType} cannot hold more than one recipe item.`)
  }
}
