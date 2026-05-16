import { z } from 'zod'

export const IngredientStorageSchema = z.enum(['pantry', 'fridge'])
export type IngredientStorage = z.infer<typeof IngredientStorageSchema>

export const IngredientCategorySchema = z.enum([
  'produce',
  'bakery',
  'meat-fish',
  'dairy',
  'frozen',
  'grocery',
  'beverages',
  'household',
  'other',
])
export type IngredientCategory = z.infer<typeof IngredientCategorySchema>

export const CanonicalUnitSchema = z.enum(['g', 'ml', 'unit'])
export type CanonicalUnitDto = z.infer<typeof CanonicalUnitSchema>

export const AllergenSchema = z.enum([
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soy',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
])
export type Allergen = z.infer<typeof AllergenSchema>

const IngredientNameSchema = z.string().min(1).max(100).trim()
const AliasSchema = z.string().min(1).max(100).trim()
const UrlSchema = z.string().url().max(500)

export const CreateIngredientSchema = z.object({
  name: IngredientNameSchema,
  storage: IngredientStorageSchema,
  category: IngredientCategorySchema,
  canonicalUnit: CanonicalUnitSchema,
  shelfLifeDays: z.number().int().positive().optional(),
  imageUrl: UrlSchema.optional(),
  defaultPackSize: z.number().int().positive().optional(),
  allergens: z.array(AllergenSchema).optional().default([]),
  aliases: z.array(AliasSchema).optional().default([]),
})
export type CreateIngredientDto = z.infer<typeof CreateIngredientSchema>

export const UpdateIngredientSchema = z.object({
  name: IngredientNameSchema.optional(),
  storage: IngredientStorageSchema.optional(),
  category: IngredientCategorySchema.optional(),
  canonicalUnit: CanonicalUnitSchema.optional(),
  shelfLifeDays: z.number().int().positive().nullable().optional(),
  imageUrl: UrlSchema.nullable().optional(),
  defaultPackSize: z.number().int().positive().nullable().optional(),
  allergens: z.array(AllergenSchema).optional(),
  aliases: z.array(AliasSchema).optional(),
})
export type UpdateIngredientDto = z.infer<typeof UpdateIngredientSchema>

export const ListIngredientsQuerySchema = z.object({
  q: z.string().min(1).max(100).trim().optional(),
  category: IngredientCategorySchema.optional(),
  storage: IngredientStorageSchema.optional(),
  includeArchived: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((v) => v === true || v === 'true')
    .optional(),
})
export type ListIngredientsQueryDto = z.infer<typeof ListIngredientsQuerySchema>

export const IngredientViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  storage: IngredientStorageSchema,
  category: IngredientCategorySchema,
  canonicalUnit: CanonicalUnitSchema,
  shelfLifeDays: z.number().int().positive().nullable(),
  imageUrl: z.string().nullable(),
  defaultPackSize: z.number().int().positive().nullable(),
  allergens: z.array(AllergenSchema),
  aliases: z.array(z.string()),
  archived: z.boolean(),
  updatedAt: z.string().datetime(),
})
export type IngredientView = z.infer<typeof IngredientViewSchema>
