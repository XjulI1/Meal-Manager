import { beforeEach, describe, expect, it } from 'vitest'
import { AddProductUseCase } from '../../../server/contexts/ingredients/application/use-cases/add-product.use-case'
import { CreateIngredientUseCase } from '../../../server/contexts/ingredients/application/use-cases/create-ingredient.use-case'
import { DeleteIngredientUseCase } from '../../../server/contexts/ingredients/application/use-cases/delete-ingredient.use-case'
import { GetIngredientUseCase } from '../../../server/contexts/ingredients/application/use-cases/get-ingredient.use-case'
import { ListIngredientsUseCase } from '../../../server/contexts/ingredients/application/use-cases/list-ingredients.use-case'
import { RemoveProductUseCase } from '../../../server/contexts/ingredients/application/use-cases/remove-product.use-case'
import { ResolveByBarcodeUseCase } from '../../../server/contexts/ingredients/application/use-cases/resolve-by-barcode.use-case'
import { UpdateIngredientUseCase } from '../../../server/contexts/ingredients/application/use-cases/update-ingredient.use-case'
import { UpdateProductUseCase } from '../../../server/contexts/ingredients/application/use-cases/update-product.use-case'
import { CanonicalUnitLockedError } from '../../../server/contexts/ingredients/domain/errors/canonical-unit-locked.error'
import { DuplicateBarcodeError } from '../../../server/contexts/ingredients/domain/errors/duplicate-barcode.error'
import { DuplicateIngredientNameError } from '../../../server/contexts/ingredients/domain/errors/duplicate-ingredient-name.error'
import { IngredientNotFoundError } from '../../../server/contexts/ingredients/domain/errors/ingredient-not-found.error'
import { ProductNotFoundError } from '../../../server/contexts/ingredients/domain/errors/product-not-found.error'
import { InMemoryIngredientRepository } from './in-memory/in-memory-ingredient.repository'
import { InMemoryProductRepository } from './in-memory/in-memory-product.repository'

const HH = 'household-1'
const HH2 = 'household-2'

let ingCounter = 0
let prodCounter = 0
const ingId = () => `ing-${++ingCounter}`
const prodId = () => `prod-${++prodCounter}`

describe('ingredients use cases', () => {
  let ingredients: InMemoryIngredientRepository
  let products: InMemoryProductRepository
  let create: CreateIngredientUseCase
  let update: UpdateIngredientUseCase
  let remove: DeleteIngredientUseCase
  let list: ListIngredientsUseCase
  let get: GetIngredientUseCase
  let addProduct: AddProductUseCase
  let updateProduct: UpdateProductUseCase
  let removeProduct: RemoveProductUseCase
  let resolveByBarcode: ResolveByBarcodeUseCase

  beforeEach(() => {
    ingCounter = 0
    prodCounter = 0
    ingredients = new InMemoryIngredientRepository()
    products = new InMemoryProductRepository()
    create = new CreateIngredientUseCase(ingredients, ingId)
    update = new UpdateIngredientUseCase(ingredients, products)
    remove = new DeleteIngredientUseCase(ingredients)
    list = new ListIngredientsUseCase(ingredients)
    get = new GetIngredientUseCase(ingredients, products)
    addProduct = new AddProductUseCase(ingredients, products, prodId)
    updateProduct = new UpdateProductUseCase(products)
    removeProduct = new RemoveProductUseCase(products)
    resolveByBarcode = new ResolveByBarcodeUseCase(ingredients, products)
  })

  describe('CreateIngredientUseCase', () => {
    it('creates a minimal ingredient', async () => {
      const v = await create.execute({
        householdId: HH,
        name: 'Tomate cerise',
        storage: 'fridge',
        category: 'produce',
        canonicalUnit: 'g',
      })
      expect(v.id).toBe('ing-1')
      expect(v.name).toBe('Tomate cerise')
      expect(v.archived).toBe(false)
    })

    it('rejects a duplicate name (case-insensitive)', async () => {
      await create.execute({ householdId: HH, name: 'Tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g' })
      await expect(
        create.execute({ householdId: HH, name: 'tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g' }),
      ).rejects.toBeInstanceOf(DuplicateIngredientNameError)
    })

    it('allows the same name in another household', async () => {
      await create.execute({ householdId: HH, name: 'Tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g' })
      await expect(
        create.execute({ householdId: HH2, name: 'Tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g' }),
      ).resolves.toBeDefined()
    })

    it('deduplicates aliases', async () => {
      const v = await create.execute({
        householdId: HH,
        name: 'Tomate cerise',
        storage: 'fridge',
        category: 'produce',
        canonicalUnit: 'g',
        aliases: ['Cherry', 'cherry', 'tomates cerises'],
      })
      expect(v.aliases).toEqual(['Cherry', 'tomates cerises'])
    })
  })

  describe('UpdateIngredientUseCase', () => {
    it('updates the name', async () => {
      const c = await create.execute({ householdId: HH, name: 'Tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g' })
      const v = await update.execute({ householdId: HH, id: c.id, name: 'Tomate cerise' })
      expect(v.name).toBe('Tomate cerise')
    })

    it('rejects update when target name is taken by another active ingredient', async () => {
      const a = await create.execute({ householdId: HH, name: 'Tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g' })
      await create.execute({ householdId: HH, name: 'Carotte', storage: 'pantry', category: 'produce', canonicalUnit: 'g' })
      await expect(update.execute({ householdId: HH, id: a.id, name: 'Carotte' }))
        .rejects.toBeInstanceOf(DuplicateIngredientNameError)
    })

    it('locks canonicalUnit when at least one product is attached', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      await addProduct.execute({
        householdId: HH,
        ingredientId: c.id,
        packSize: 500,
        packUnit: 'g',
        barcodes: ['3038359002564'],
      })
      await expect(update.execute({ householdId: HH, id: c.id, canonicalUnit: 'ml' }))
        .rejects.toBeInstanceOf(CanonicalUnitLockedError)
    })

    it('allows canonicalUnit change when no products and no references', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      const v = await update.execute({ householdId: HH, id: c.id, canonicalUnit: 'ml' })
      expect(v.canonicalUnit).toBe('ml')
    })

    it('throws NotFound for an ingredient from another household', async () => {
      const c = await create.execute({ householdId: HH, name: 'Tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g' })
      await expect(update.execute({ householdId: HH2, id: c.id, name: 'X' }))
        .rejects.toBeInstanceOf(IngredientNotFoundError)
    })
  })

  describe('DeleteIngredientUseCase', () => {
    it('hard-deletes when not referenced', async () => {
      const c = await create.execute({ householdId: HH, name: 'Tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g' })
      const r = await remove.execute({ householdId: HH, id: c.id })
      expect(r.mode).toBe('hard')
      const items = await list.execute({ householdId: HH })
      expect(items).toEqual([])
    })

    it('soft-deletes when referenced', async () => {
      const c = await create.execute({ householdId: HH, name: 'Tomate', storage: 'fridge', category: 'produce', canonicalUnit: 'g' })
      ingredients.referenceSources.push({ isReferenced: (id) => id === c.id })

      const r = await remove.execute({ householdId: HH, id: c.id })
      expect(r.mode).toBe('soft')

      const active = await list.execute({ householdId: HH })
      expect(active).toEqual([])
      const archived = await list.execute({ householdId: HH, includeArchived: true })
      expect(archived[0]?.archived).toBe(true)
    })

    it('throws NotFound for an unknown ingredient', async () => {
      await expect(remove.execute({ householdId: HH, id: 'ing-x' }))
        .rejects.toBeInstanceOf(IngredientNotFoundError)
    })
  })

  describe('ListIngredientsUseCase', () => {
    beforeEach(async () => {
      await create.execute({ householdId: HH, name: 'Tomate cerise', storage: 'fridge', category: 'produce', canonicalUnit: 'g', aliases: ['cherry'] })
      await create.execute({ householdId: HH, name: 'Lait', storage: 'fridge', category: 'dairy', canonicalUnit: 'ml' })
      await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
    })

    it('returns active ingredients sorted by category then name', async () => {
      const items = await list.execute({ householdId: HH })
      expect(items.map((i) => i.name)).toEqual(['Tomate cerise', 'Lait', 'Pâtes'])
    })

    it('filters by storage', async () => {
      const items = await list.execute({ householdId: HH, storage: 'pantry' })
      expect(items.map((i) => i.name)).toEqual(['Pâtes'])
    })

    it('filters by category', async () => {
      const items = await list.execute({ householdId: HH, category: 'dairy' })
      expect(items.map((i) => i.name)).toEqual(['Lait'])
    })

    it('searches by alias', async () => {
      const items = await list.execute({ householdId: HH, q: 'cherry' })
      expect(items.map((i) => i.name)).toEqual(['Tomate cerise'])
    })

    it('searches by name substring (case-insensitive)', async () => {
      const items = await list.execute({ householdId: HH, q: 'PÂT' })
      expect(items.map((i) => i.name)).toEqual(['Pâtes'])
    })

    it('excludes archived by default', async () => {
      const c = await create.execute({ householdId: HH, name: 'Beurre', storage: 'fridge', category: 'dairy', canonicalUnit: 'g' })
      ingredients.referenceSources.push({ isReferenced: (id) => id === c.id })
      await remove.execute({ householdId: HH, id: c.id })

      const active = await list.execute({ householdId: HH })
      expect(active.find((i) => i.name === 'Beurre')).toBeUndefined()

      const all = await list.execute({ householdId: HH, includeArchived: true })
      expect(all.find((i) => i.name === 'Beurre')?.archived).toBe(true)
    })
  })

  describe('GetIngredientUseCase', () => {
    it('returns the ingredient + its products', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] })

      const v = await get.execute({ householdId: HH, id: c.id })
      expect(v.id).toBe(c.id)
      expect(v.products).toHaveLength(1)
      expect(v.products[0]?.barcodes).toEqual(['3038359002564'])
    })

    it('throws NotFound from another household', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      await expect(get.execute({ householdId: HH2, id: c.id })).rejects.toBeInstanceOf(IngredientNotFoundError)
    })
  })

  describe('AddProductUseCase', () => {
    it('adds a product to an existing ingredient', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      const p = await addProduct.execute({
        householdId: HH,
        ingredientId: c.id,
        brand: 'Panzani',
        packSize: 500,
        packUnit: 'g',
        barcodes: ['3038359002564'],
      })
      expect(p.brand).toBe('Panzani')
      expect(p.barcodes).toEqual(['3038359002564'])
    })

    it('rejects duplicate barcode within the same household', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] })
      await expect(
        addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 1000, packUnit: 'g', barcodes: ['3038359002564'] }),
      ).rejects.toBeInstanceOf(DuplicateBarcodeError)
    })

    it('allows the same barcode in another household', async () => {
      const c1 = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      const c2 = await create.execute({ householdId: HH2, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      await addProduct.execute({ householdId: HH, ingredientId: c1.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] })
      await expect(
        addProduct.execute({ householdId: HH2, ingredientId: c2.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] }),
      ).resolves.toBeDefined()
    })

    it('normalizes UPC-A to EAN-13', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      const p = await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['036000291452'] })
      expect(p.barcodes).toEqual(['0036000291452'])
    })

    it('throws NotFound for an ingredient from another household', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      await expect(
        addProduct.execute({ householdId: HH2, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] }),
      ).rejects.toBeInstanceOf(IngredientNotFoundError)
    })

    it('throws NotFound for an archived ingredient', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      ingredients.referenceSources.push({ isReferenced: (id) => id === c.id })
      await remove.execute({ householdId: HH, id: c.id })
      await expect(
        addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] }),
      ).rejects.toBeInstanceOf(IngredientNotFoundError)
    })
  })

  describe('UpdateProductUseCase', () => {
    it('replaces the barcode list atomically', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      const p = await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] })

      const updated = await updateProduct.execute({ householdId: HH, id: p.id, barcodes: ['73513537'] })
      expect(updated.barcodes).toEqual(['73513537'])
    })

    it('allows reusing the product own barcode without triggering a duplicate', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      const p = await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] })

      const updated = await updateProduct.execute({ householdId: HH, id: p.id, brand: 'Barilla', barcodes: ['3038359002564'] })
      expect(updated.brand).toBe('Barilla')
    })

    it('throws NotFound for an unknown product', async () => {
      await expect(updateProduct.execute({ householdId: HH, id: 'prod-x', brand: 'X' }))
        .rejects.toBeInstanceOf(ProductNotFoundError)
    })
  })

  describe('RemoveProductUseCase', () => {
    it('removes a product', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      const p = await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] })

      await removeProduct.execute({ householdId: HH, id: p.id })
      expect(await products.findById(p.id, HH)).toBeNull()
    })

    it('throws NotFound from another household', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      const p = await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] })
      await expect(removeProduct.execute({ householdId: HH2, id: p.id }))
        .rejects.toBeInstanceOf(ProductNotFoundError)
    })
  })

  describe('ResolveByBarcodeUseCase', () => {
    it('resolves a known barcode to its ingredient + product', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] })

      const r = await resolveByBarcode.execute({ householdId: HH, barcode: '3038359002564' })
      expect(r?.ingredient.name).toBe('Pâtes')
      expect(r?.product.packSize).toBe(500)
    })

    it('normalizes UPC-A before lookup', async () => {
      const c = await create.execute({ householdId: HH, name: 'Item', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 100, packUnit: 'g', barcodes: ['0036000291452'] })

      const r = await resolveByBarcode.execute({ householdId: HH, barcode: '036000291452' })
      expect(r?.product.barcodes).toContain('0036000291452')
    })

    it('returns null for an unknown barcode', async () => {
      const r = await resolveByBarcode.execute({ householdId: HH, barcode: '3038359002564' })
      expect(r).toBeNull()
    })

    it('does not leak across households', async () => {
      const c = await create.execute({ householdId: HH, name: 'Pâtes', storage: 'pantry', category: 'grocery', canonicalUnit: 'g' })
      await addProduct.execute({ householdId: HH, ingredientId: c.id, packSize: 500, packUnit: 'g', barcodes: ['3038359002564'] })

      const r = await resolveByBarcode.execute({ householdId: HH2, barcode: '3038359002564' })
      expect(r).toBeNull()
    })
  })
})
