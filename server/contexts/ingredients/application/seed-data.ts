import type { CanonicalUnit } from '../../../../shared/units/conversions'
import type { IngredientCategoryValue } from '../domain/value-objects/ingredient-category.vo'

export interface SeedIngredient {
  name: string
  storage: 'pantry' | 'fridge' | 'freezer'
  category: IngredientCategoryValue
  canonicalUnit: CanonicalUnit
  defaultPackSize?: number
  shelfLifeDays?: number
  aliases?: string[]
}

/**
 * Default catalog seeded into every newly created household. Covers the most
 * common French staples. Brands/products and barcodes are intentionally NOT
 * seeded — they're added by users as they scan or enter their own.
 */
export const DEFAULT_SEED: readonly SeedIngredient[] = [
  // produce
  { name: 'Tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g', shelfLifeDays: 7 },
  { name: 'Tomate cerise', storage: 'fridge', category: 'produce', canonicalUnit: 'g', shelfLifeDays: 7, aliases: ['tomates cerises'] },
  { name: 'Oignon', storage: 'pantry', category: 'produce', canonicalUnit: 'g' },
  { name: 'Ail', storage: 'pantry', category: 'produce', canonicalUnit: 'g' },
  { name: 'Carotte', storage: 'fridge', category: 'produce', canonicalUnit: 'g', shelfLifeDays: 21 },
  { name: 'Courgette', storage: 'fridge', category: 'produce', canonicalUnit: 'g', shelfLifeDays: 10 },
  { name: 'Pomme de terre', storage: 'pantry', category: 'produce', canonicalUnit: 'g' },
  { name: 'Salade', storage: 'fridge', category: 'produce', canonicalUnit: 'unit', shelfLifeDays: 5 },
  { name: 'Poivron', storage: 'fridge', category: 'produce', canonicalUnit: 'g', shelfLifeDays: 10 },
  { name: 'Citron', storage: 'fridge', category: 'produce', canonicalUnit: 'unit', shelfLifeDays: 21 },
  { name: 'Pomme', storage: 'pantry', category: 'produce', canonicalUnit: 'g' },
  { name: 'Banane', storage: 'pantry', category: 'produce', canonicalUnit: 'g' },
  { name: 'Champignon de Paris', storage: 'fridge', category: 'produce', canonicalUnit: 'g', shelfLifeDays: 5 },
  // bakery
  { name: 'Pain', storage: 'pantry', category: 'bakery', canonicalUnit: 'g' },
  { name: 'Baguette', storage: 'pantry', category: 'bakery', canonicalUnit: 'unit' },
  // meat-fish
  { name: 'Poulet', storage: 'fridge', category: 'meat-fish', canonicalUnit: 'g', shelfLifeDays: 3 },
  { name: 'Bœuf haché', storage: 'fridge', category: 'meat-fish', canonicalUnit: 'g', shelfLifeDays: 2 },
  { name: 'Saumon', storage: 'fridge', category: 'meat-fish', canonicalUnit: 'g', shelfLifeDays: 2 },
  { name: 'Jambon', storage: 'fridge', category: 'meat-fish', canonicalUnit: 'g', shelfLifeDays: 7 },
  { name: 'Thon en conserve', storage: 'pantry', category: 'meat-fish', canonicalUnit: 'g', defaultPackSize: 140 },
  // dairy
  { name: 'Lait', storage: 'fridge', category: 'dairy', canonicalUnit: 'ml', defaultPackSize: 1000, shelfLifeDays: 7 },
  { name: 'Beurre', storage: 'fridge', category: 'dairy', canonicalUnit: 'g', defaultPackSize: 250, shelfLifeDays: 30 },
  { name: 'Œufs', storage: 'fridge', category: 'dairy', canonicalUnit: 'unit', defaultPackSize: 6, shelfLifeDays: 21 },
  { name: 'Yaourt nature', storage: 'fridge', category: 'dairy', canonicalUnit: 'g', defaultPackSize: 125, shelfLifeDays: 21 },
  { name: 'Crème fraîche', storage: 'fridge', category: 'dairy', canonicalUnit: 'ml', defaultPackSize: 200, shelfLifeDays: 14 },
  { name: 'Fromage râpé', storage: 'fridge', category: 'dairy', canonicalUnit: 'g', defaultPackSize: 200, shelfLifeDays: 21 },
  { name: 'Mozzarella', storage: 'fridge', category: 'dairy', canonicalUnit: 'g', defaultPackSize: 125, shelfLifeDays: 14 },
  // frozen
  { name: 'Petits pois surgelés', storage: 'freezer', category: 'frozen', canonicalUnit: 'g', defaultPackSize: 1000 },
  { name: 'Épinards surgelés', storage: 'freezer', category: 'frozen', canonicalUnit: 'g', defaultPackSize: 1000 },
  // grocery
  { name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 500 },
  { name: 'Riz', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 1000 },
  { name: 'Farine', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 1000 },
  { name: 'Sucre', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 1000 },
  { name: 'Sel', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 500 },
  { name: 'Poivre', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' },
  { name: 'Huile d\'olive', storage: 'pantry', category: 'grocery', canonicalUnit: 'ml', defaultPackSize: 1000 },
  { name: 'Vinaigre', storage: 'pantry', category: 'grocery', canonicalUnit: 'ml', defaultPackSize: 500 },
  { name: 'Moutarde', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 200 },
  { name: 'Ketchup', storage: 'pantry', category: 'grocery', canonicalUnit: 'ml', defaultPackSize: 500 },
  { name: 'Mayonnaise', storage: 'fridge', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 350 },
  { name: 'Tomate concassée', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 400 },
  { name: 'Bouillon cube', storage: 'pantry', category: 'grocery', canonicalUnit: 'unit' },
  { name: 'Lentilles', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 500 },
  { name: 'Pois chiches', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 400 },
  { name: 'Haricots verts en conserve', storage: 'pantry', category: 'grocery', canonicalUnit: 'g', defaultPackSize: 400 },
  // beverages
  { name: 'Eau', storage: 'pantry', category: 'beverages', canonicalUnit: 'ml', defaultPackSize: 1500 },
  { name: 'Jus d\'orange', storage: 'fridge', category: 'beverages', canonicalUnit: 'ml', defaultPackSize: 1000, shelfLifeDays: 30 },
  { name: 'Café', storage: 'pantry', category: 'beverages', canonicalUnit: 'g', defaultPackSize: 250 },
  { name: 'Thé', storage: 'pantry', category: 'beverages', canonicalUnit: 'g' },
]
