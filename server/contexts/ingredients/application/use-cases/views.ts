import type { Ingredient } from '../../domain/entities/ingredient.entity'
import type { Product } from '../../domain/entities/product.entity'

export interface IngredientView {
  id: string
  name: string
  storage: 'pantry' | 'fridge' | 'freezer'
  category: string
  canonicalUnit: 'g' | 'ml' | 'unit'
  shelfLifeDays: number | null
  imageUrl: string | null
  defaultPackSize: number | null
  allergens: string[]
  aliases: string[]
  archived: boolean
  updatedAt: string
}

export interface ProductView {
  id: string
  ingredientId: string
  brand: string | null
  packSize: number
  packUnit: 'g' | 'ml' | 'unit'
  imageUrl: string | null
  barcodes: string[]
  updatedAt: string
}

export interface IngredientWithProductsView extends IngredientView {
  products: ProductView[]
}

export function toIngredientView(ingredient: Ingredient): IngredientView {
  return {
    id: ingredient.id,
    name: ingredient.name,
    storage: ingredient.storage,
    category: ingredient.category.value,
    canonicalUnit: ingredient.canonicalUnit,
    shelfLifeDays: ingredient.shelfLifeDays,
    imageUrl: ingredient.imageUrl,
    defaultPackSize: ingredient.defaultPackSize,
    allergens: [...ingredient.allergens],
    aliases: [...ingredient.aliases],
    archived: ingredient.archived,
    updatedAt: ingredient.updatedAt.toISOString(),
  }
}

export function toProductView(product: Product): ProductView {
  return {
    id: product.id,
    ingredientId: product.ingredientId,
    brand: product.brand,
    packSize: product.packSize,
    packUnit: product.packUnit,
    imageUrl: product.imageUrl,
    barcodes: product.barcodes.map((b) => b.value),
    updatedAt: product.updatedAt.toISOString(),
  }
}
