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

export const QuantityInputSchema = z.object({
  value: z.number().positive(),
  unit: z.string().min(1),
})

export const AddSlotItemSchema = z.discriminatedUnion('kind', [
  z.object({
    dayOfWeek: DayOfWeekSchema,
    mealType: MealTypeSchema,
    kind: z.literal('recipe'),
    recipeId: z.string().uuid(),
    servings: z.number().int().min(1).max(50),
  }),
  z.object({
    dayOfWeek: DayOfWeekSchema,
    mealType: MealTypeSchema,
    kind: z.literal('ingredient'),
    ingredientId: z.string().uuid(),
    quantity: QuantityInputSchema,
  }),
])
export type AddSlotItemDto = z.infer<typeof AddSlotItemSchema>

export const CreateMenuSchema = z.object({
  weekStart: WeekStartSchema,
})
export type CreateMenuDto = z.infer<typeof CreateMenuSchema>

export const MenuSlotItemViewSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().uuid(),
    kind: z.literal('recipe'),
    recipeId: z.string().uuid(),
    servings: z.number().int().min(1),
  }),
  z.object({
    id: z.string().uuid(),
    kind: z.literal('ingredient'),
    ingredientId: z.string().uuid(),
    quantity: z.object({ value: z.number(), unit: z.string() }),
  }),
])
export type MenuSlotItemView = z.infer<typeof MenuSlotItemViewSchema>

export const MenuSlotViewSchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  mealType: MealTypeSchema,
  items: z.array(MenuSlotItemViewSchema),
})
export type MenuSlotView = z.infer<typeof MenuSlotViewSchema>

export const MenuViewSchema = z.object({
  id: z.string().uuid(),
  weekStart: z.string(),
  slots: z.array(MenuSlotViewSchema),
})
export type MenuView = z.infer<typeof MenuViewSchema>
