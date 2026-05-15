import { z } from 'zod'

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner'])
export type MealType = z.infer<typeof MealTypeSchema>

export const DayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>

/** ISO date string of a Monday (YYYY-MM-DD). */
export const WeekStartSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((iso) => {
    const d = new Date(`${iso}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.getUTCDay() === 1
  }, 'weekStart must be a Monday')

export const AssignRecipeToSlotSchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  mealType: MealTypeSchema,
  recipeId: z.string().uuid(),
  servings: z.number().int().min(1).max(50),
})
export type AssignRecipeToSlotDto = z.infer<typeof AssignRecipeToSlotSchema>

export const CreateMenuSchema = z.object({
  weekStart: WeekStartSchema,
})
export type CreateMenuDto = z.infer<typeof CreateMenuSchema>

export const MenuSlotViewSchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  mealType: MealTypeSchema,
  recipeId: z.string().uuid().nullable(),
  servings: z.number().int().min(1).nullable(),
})

export const MenuViewSchema = z.object({
  id: z.string().uuid(),
  weekStart: z.string(),
  slots: z.array(MenuSlotViewSchema),
})
export type MenuView = z.infer<typeof MenuViewSchema>
