import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerAllTools } from '../../../server/routes/mcp/tools'
import type { McpToolContext } from '../../../server/routes/mcp/tools'
import { requireHouseholdFromPAT } from '../../../server/utils/require-household'
import { InvalidTokenError } from '../../../server/contexts/platform/domain/errors/invalid-token.error'
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
      } as any,
    }
  })

  it('registers exactly the 11 tools (8 read-only + 3 draft tools)', () => {
    const { server, tools } = makeRecordingServer()

    registerAllTools(server, ctx)

    expect(tools.map((t) => t.name).sort()).toEqual([
      'mealmanager_get_household',
      'mealmanager_get_ingredient',
      'mealmanager_get_menu_for_week',
      'mealmanager_get_recipe',
      'mealmanager_get_recipe_draft',
      'mealmanager_get_shopping_list',
      'mealmanager_list_ingredients',
      'mealmanager_list_inventory',
      'mealmanager_list_recipe_drafts',
      'mealmanager_list_recipes',
      'mealmanager_save_recipe_draft',
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

  it('input schemas never declare a householdId field', () => {
    const { server, tools } = makeRecordingServer()
    registerAllTools(server, ctx)

    for (const tool of tools) {
      const inputSchema = tool.config.inputSchema ?? {}
      expect(Object.keys(inputSchema)).not.toContain('householdId')
    }
  })
})
