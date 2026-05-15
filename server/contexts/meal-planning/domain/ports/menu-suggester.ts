import type { WeekStart } from '../value-objects/week-start.vo'

/** Minimal hint context passed to the suggester. */
export interface SuggestionContext {
  householdId: string
  availableRecipeIds: ReadonlyArray<string>
  pantry: ReadonlyArray<{ name: string, quantity: { value: number, unit: 'g' | 'ml' | 'unit' } }>
}

export interface SuggestedSlot {
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  mealType: 'breakfast' | 'lunch' | 'dinner'
  recipeId: string
  servings: number
}

export interface SuggestedMenu {
  weekStart: WeekStart
  slots: ReadonlyArray<SuggestedSlot>
}

/**
 * Future-proofing port for AI-backed menu suggestions. v1 has no
 * implementation; the interface exists so adapters can be plugged later
 * without touching the domain.
 */
export interface IMenuSuggester {
  suggestForWeek(weekStart: WeekStart, context: SuggestionContext): Promise<SuggestedMenu>
}
