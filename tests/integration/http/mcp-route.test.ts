import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAllTools } from '../../../server/routes/mcp/tools'
import type { McpToolContext } from '../../../server/routes/mcp/tools'
import { requireHouseholdFromPAT } from '../../../server/utils/require-household'
import { InvalidTokenError } from '../../../server/contexts/platform/domain/errors/invalid-token.error'
import { DuplicateIngredientNameError } from '../../../server/contexts/ingredients/domain/errors/duplicate-ingredient-name.error'
import { InvalidIngredientReferenceError } from '../../../server/contexts/inventory/domain/errors/invalid-ingredient-reference.error'
import { WineNotFoundError } from '../../../server/contexts/wine-cellar/domain/errors/wine-not-found.error'
import { makeEvent } from './nuxt-runtime-stubs'

/**
 * Records every call to `registerTool` so we can inspect what was registered
 * and invoke each handler in isolation. We intentionally bypass the SDK's
 * protocol layer here — the JSON-RPC framing is the SDK's responsibility.
 */
function makeRecordingServer() {
  const tools: Array<{ name: string, config: any, handler: (...args: any[]) => any }> = []
  return {
    tools,
    server: {
      registerTool: (name: string, config: any, handler: (...args: any[]) => any) => {
        tools.push({ name, config, handler })
      },
    } as any,
  }
}

describe('requireHouseholdFromPAT', () => {
  it('returns the (userId, householdId) bound to a valid Bearer token', async () => {
    const authenticatePersonalAccessToken = {
      execute: vi.fn().mockResolvedValue({ userId: 'u-1', householdId: 'hh-1' }),
    }
    const event = makeEvent({
      headers: { authorization: 'Bearer mm_pat_valid' },
      container: { authenticatePersonalAccessToken },
    })

    const ctx = await requireHouseholdFromPAT(event as any)

    expect(ctx).toEqual({ userId: 'u-1', householdId: 'hh-1' })
    expect(authenticatePersonalAccessToken.execute).toHaveBeenCalledWith({
      plaintext: 'mm_pat_valid',
    })
  })

  it('throws 401 with WWW-Authenticate header when no Authorization header', async () => {
    const event = makeEvent({ container: {} })
    let caught: any
    try {
      await requireHouseholdFromPAT(event as any)
    }
    catch (err) {
      caught = err
    }
    expect(caught?.statusCode).toBe(401)
    expect(event._responseHeaders?.['WWW-Authenticate']).toBe('Bearer realm="meal-manager-mcp"')
  })

  it('throws 401 when the scheme is not Bearer', async () => {
    const event = makeEvent({
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
      container: {},
    })
    await expect(requireHouseholdFromPAT(event as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 401 when the token is unknown or revoked', async () => {
    const authenticatePersonalAccessToken = {
      execute: vi.fn().mockRejectedValue(new InvalidTokenError()),
    }
    const event = makeEvent({
      headers: { authorization: 'Bearer mm_pat_revoked' },
      container: { authenticatePersonalAccessToken },
    })
    await expect(requireHouseholdFromPAT(event as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('accepts case-insensitive scheme', async () => {
    const authenticatePersonalAccessToken = {
      execute: vi.fn().mockResolvedValue({ userId: 'u-1', householdId: 'hh-1' }),
    }
    const event = makeEvent({
      headers: { authorization: 'bearer mm_pat_valid' },
      container: { authenticatePersonalAccessToken },
    })
    await expect(requireHouseholdFromPAT(event as any)).resolves.toEqual({
      userId: 'u-1',
      householdId: 'hh-1',
    })
  })
})

describe('registerAllTools', () => {
  let ctx: McpToolContext

  beforeEach(() => {
    ctx = {
      userId: 'u-1',
      householdId: 'hh-1',
      container: {
        listInventoryItems: { execute: vi.fn().mockResolvedValue([]) },
        listRecipes: { execute: vi.fn().mockResolvedValue([]) },
        getRecipeById: { execute: vi.fn().mockResolvedValue({}) },
        getMenuByWeek: { execute: vi.fn().mockResolvedValue({}) },
        getShoppingListByMenu: { execute: vi.fn().mockResolvedValue({}) },
        listIngredients: { execute: vi.fn().mockResolvedValue([]) },
        getIngredient: { execute: vi.fn().mockResolvedValue({}) },
        getCurrentHousehold: { execute: vi.fn().mockResolvedValue({}) },
        saveRecipeDraft: { execute: vi.fn().mockResolvedValue({ id: 'draft-1' }) },
        listRecipeDrafts: { execute: vi.fn().mockResolvedValue([]) },
        getRecipeDraftById: { execute: vi.fn().mockResolvedValue({}) },
        createIngredient: { execute: vi.fn().mockResolvedValue({ id: 'ing-1' }) },
        addInventoryItem: { execute: vi.fn().mockResolvedValue({ item: { id: 'inv-1' }, created: true }) },
        listWines: { execute: vi.fn().mockResolvedValue([]) },
        getWine: { execute: vi.fn().mockResolvedValue({ wine: { id: 'wine-1' }, bottles: [] }) },
        saveWineEnrichment: { execute: vi.fn().mockResolvedValue({ id: 'wine-1', aiEnrichedAt: '2026-07-15T10:00:00.000Z' }) },
      } as any,
    }
  })

  it('registers exactly the 16 tools (read-only + 4 write tools)', () => {
    const { server, tools } = makeRecordingServer()

    registerAllTools(server, ctx)

    expect(tools.map((t) => t.name).sort()).toEqual([
      'mealmanager_add_inventory_item',
      'mealmanager_create_ingredient',
      'mealmanager_get_household',
      'mealmanager_get_ingredient',
      'mealmanager_get_menu_for_week',
      'mealmanager_get_recipe',
      'mealmanager_get_recipe_draft',
      'mealmanager_get_shopping_list',
      'mealmanager_get_wine',
      'mealmanager_list_ingredients',
      'mealmanager_list_inventory',
      'mealmanager_list_recipe_drafts',
      'mealmanager_list_recipes',
      'mealmanager_list_wines',
      'mealmanager_save_recipe_draft',
      'mealmanager_save_wine_enrichment',
    ])
  })

  it('save_recipe_draft persists under the PAT household with source forced to mcp', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_save_recipe_draft')!

    await tool.handler({ title: 'Soupe de courge', ingredients: [{ name: 'courge' }] })

    expect(ctx.container.saveRecipeDraft.execute).toHaveBeenCalledWith({
      householdId: 'hh-1',
      source: 'mcp',
      content: {
        title: 'Soupe de courge',
        instructions: undefined,
        servings: undefined,
        ingredients: [{ name: 'courge' }],
        sourceUrl: undefined,
      },
    })
  })

  it('save_recipe_draft input schema declares neither householdId nor source', () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_save_recipe_draft')!

    const keys = Object.keys(tool.config.inputSchema ?? {})
    expect(keys).not.toContain('householdId')
    expect(keys).not.toContain('source')
  })

  it('injects the PAT householdId into list_inventory, never accepting it from input', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_list_inventory')!

    await tool.handler({})

    expect(ctx.container.listInventoryItems.execute).toHaveBeenCalledWith({
      householdId: 'hh-1',
      location: undefined,
    })
  })

  it('passes the location filter through to list_inventory', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_list_inventory')!

    await tool.handler({ location: 'fridge' })

    expect(ctx.container.listInventoryItems.execute).toHaveBeenCalledWith({
      householdId: 'hh-1',
      location: 'fridge',
    })
  })

  it('get_recipe forwards recipeId as id, scoped to the PAT householdId', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_get_recipe')!

    await tool.handler({ recipeId: 'rec-1' })

    expect(ctx.container.getRecipeById.execute).toHaveBeenCalledWith({
      householdId: 'hh-1',
      id: 'rec-1',
    })
  })

  it('get_household uses userId, not householdId', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_get_household')!

    await tool.handler({})

    expect(ctx.container.getCurrentHousehold.execute).toHaveBeenCalledWith({ userId: 'u-1' })
  })

  it('returns JSON-stringified content blocks', async () => {
    const { server, tools } = makeRecordingServer()
    ;(ctx.container as any).listInventoryItems.execute = vi.fn().mockResolvedValue([
      { id: 'i-1', name: 'Tomate' },
    ])
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_list_inventory')!

    const result = await tool.handler({})

    expect(result).toMatchObject({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('"name": "Tomate"'),
        },
      ],
    })
  })

  it('create_ingredient persists under the PAT household with the minimal fields', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_create_ingredient')!

    const result = await tool.handler({
      name: 'Courgette',
      category: 'produce',
      canonicalUnit: 'unit',
      storage: 'fridge',
    })

    expect(ctx.container.createIngredient.execute).toHaveBeenCalledWith({
      householdId: 'hh-1',
      name: 'Courgette',
      category: 'produce',
      canonicalUnit: 'unit',
      storage: 'fridge',
    })
    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain('"id": "ing-1"')
  })

  it('create_ingredient returns an error result on a duplicate name', async () => {
    const { server, tools } = makeRecordingServer()
    ;(ctx.container as any).createIngredient.execute = vi
      .fn()
      .mockRejectedValue(new DuplicateIngredientNameError('Courgette'))
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_create_ingredient')!

    const result = await tool.handler({
      name: 'Courgette',
      category: 'produce',
      canonicalUnit: 'unit',
      storage: 'fridge',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Courgette')
  })

  it('create_ingredient input schema declares neither householdId nor advanced fields', () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_create_ingredient')!

    const keys = Object.keys(tool.config.inputSchema ?? {})
    expect(keys.sort()).toEqual(['canonicalUnit', 'category', 'name', 'storage'])
  })

  it('add_inventory_item upserts under the PAT household and reports created=true', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_add_inventory_item')!

    const result = await tool.handler({
      ingredientId: 'ing-1',
      quantity: { value: 500, unit: 'g' },
      location: 'pantry',
    })

    expect(ctx.container.addInventoryItem.execute).toHaveBeenCalledWith({
      householdId: 'hh-1',
      ingredientId: 'ing-1',
      quantity: { value: 500, unit: 'g' },
      location: 'pantry',
    })
    expect(result.isError).toBeUndefined()
    expect(result.content[0].text).toContain('"created": true')
  })

  it('add_inventory_item reports created=false when an existing line is incremented', async () => {
    const { server, tools } = makeRecordingServer()
    ;(ctx.container as any).addInventoryItem.execute = vi
      .fn()
      .mockResolvedValue({ item: { id: 'inv-1' }, created: false })
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_add_inventory_item')!

    const result = await tool.handler({ ingredientId: 'ing-1', quantity: { value: 2, unit: 'unit' } })

    expect(result.content[0].text).toContain('"created": false')
  })

  it('add_inventory_item supports the freezer location', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_add_inventory_item')!

    await tool.handler({ ingredientId: 'ing-1', quantity: { value: 2, unit: 'unit' }, location: 'freezer' })

    expect(ctx.container.addInventoryItem.execute).toHaveBeenCalledWith({
      householdId: 'hh-1',
      ingredientId: 'ing-1',
      quantity: { value: 2, unit: 'unit' },
      location: 'freezer',
    })
  })

  it('add_inventory_item returns an error result for an unknown/cross-household ingredient', async () => {
    const { server, tools } = makeRecordingServer()
    ;(ctx.container as any).addInventoryItem.execute = vi
      .fn()
      .mockRejectedValue(new InvalidIngredientReferenceError('ing-x', 'not-found'))
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_add_inventory_item')!

    const result = await tool.handler({ ingredientId: 'ing-x', quantity: { value: 1, unit: 'unit' } })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('ing-x')
  })

  it('list_wines filters to not-yet-enriched wines and derives isEnriched', async () => {
    const { server, tools } = makeRecordingServer()
    ;(ctx.container as any).listWines.execute = vi.fn().mockResolvedValue([
      { id: 'w-1', name: 'Enrichi', domain: null, region: null, vintage: 2020, color: 'rouge', aiEnrichedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'w-2', name: 'Vierge', domain: null, region: null, vintage: 2021, color: 'blanc', aiEnrichedAt: null },
    ])
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_list_wines')!

    const result = await tool.handler({ enriched: false })

    expect(ctx.container.listWines.execute).toHaveBeenCalledWith({ householdId: 'hh-1' })
    const payload = JSON.parse(result.content[0].text)
    expect(payload).toEqual([{ id: 'w-2', name: 'Vierge', domain: null, region: null, vintage: 2021, color: 'blanc', isEnriched: false }])
  })

  it('get_wine forwards wineId as id, scoped to the PAT householdId', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_get_wine')!

    await tool.handler({ wineId: 'wine-1' })

    expect(ctx.container.getWine.execute).toHaveBeenCalledWith({ householdId: 'hh-1', id: 'wine-1' })
  })

  it('get_wine returns an error result for a cross-household id', async () => {
    const { server, tools } = makeRecordingServer()
    ;(ctx.container as any).getWine.execute = vi.fn().mockRejectedValue(new WineNotFoundError('wine-2'))
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_get_wine')!

    const result = await tool.handler({ wineId: 'wine-2' })

    expect(result.isError).toBe(true)
  })

  it('save_wine_enrichment persists under the PAT household without a householdId field in the schema', async () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_save_wine_enrichment')!

    const result = await tool.handler({ wineId: 'wine-1', gardeMin: 2025, gardeMax: 2032, aromas: 'fruits rouges' })

    expect(ctx.container.saveWineEnrichment.execute).toHaveBeenCalledWith({
      householdId: 'hh-1',
      id: 'wine-1',
      enrichment: { gardeMin: 2025, gardeMax: 2032, aromas: 'fruits rouges', foodPairings: undefined },
    })
    expect(result.isError).toBeUndefined()
    expect(Object.keys(tool.config.inputSchema ?? {})).not.toContain('householdId')
  })

  it('save_wine_enrichment returns an error result for a cross-household wine', async () => {
    const { server, tools } = makeRecordingServer()
    ;(ctx.container as any).saveWineEnrichment.execute = vi.fn().mockRejectedValue(new WineNotFoundError('wine-2'))
    registerAllTools(server, ctx)
    const tool = tools.find((t) => t.name === 'mealmanager_save_wine_enrichment')!

    const result = await tool.handler({ wineId: 'wine-2', aromas: 'x' })

    expect(result.isError).toBe(true)
  })

  it('input schemas never declare a householdId field', () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)

    for (const tool of tools) {
      const inputSchema = tool.config.inputSchema ?? {}
      expect(Object.keys(inputSchema)).not.toContain('householdId')
    }
  })
})
