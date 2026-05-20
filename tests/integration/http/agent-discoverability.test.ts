import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import apiCatalogHandler from '../../../server/routes/.well-known/api-catalog.get'
import linkHeadersMiddleware from '../../../server/middleware/link-headers'
import { makeEvent } from './nuxt-runtime-stubs'

const publicDir = resolve(__dirname, '../../../public')

describe('robots.txt — Bot Access Control', () => {
  const body = readFileSync(resolve(publicDir, 'robots.txt'), 'utf8')

  it('declares an explicit Disallow: / for each known AI crawler', () => {
    const required = [
      'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
      'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
      'PerplexityBot', 'Perplexity-User',
      'Google-Extended', 'Meta-ExternalAgent', 'Meta-ExternalFetcher',
      'Bytespider', 'Applebot-Extended', 'CCBot', 'cohere-ai',
      'Diffbot', 'ImagesiftBot',
    ]
    for (const ua of required) {
      const block = new RegExp(`User-agent:\\s*${ua}\\s*\\nDisallow:\\s*/`, 'i')
      expect(body, `missing block for ${ua}`).toMatch(block)
    }
  })

  it('declares a wildcard Disallow: / for any other user-agent', () => {
    expect(body).toMatch(/User-agent:\s*\*\s*\nDisallow:\s*\//)
  })
})

describe('GET /.well-known/api-catalog — RFC 9727 linkset', () => {
  it('responds with application/linkset+json and a cacheable body', async () => {
    const event = makeEvent({})
    const body = await (apiCatalogHandler as any)(event)

    expect(event._responseHeaders?.['content-type']).toBe('application/linkset+json')
    expect(event._responseHeaders?.['cache-control']).toMatch(/max-age=\d+/)
    expect(Array.isArray(body.linkset)).toBe(true)
    expect(body.linkset.length).toBeGreaterThanOrEqual(1)
  })

  it('advertises /mcp as an item with an MCP-transport profile', async () => {
    const event = makeEvent({})
    const body = await (apiCatalogHandler as any)(event)

    const items = body.linkset[0].item as Array<{ href: string, profile?: string }>
    const mcpItem = items.find((i) => i.href === '/mcp')
    expect(mcpItem).toBeDefined()
    expect(mcpItem!.profile).toContain('mcp')
  })

  it('advertises /openapi-mcp.yaml as a service-desc and the llms docs as related', async () => {
    const event = makeEvent({})
    const body = await (apiCatalogHandler as any)(event)

    const serviceDesc = body.linkset[0]['service-desc'] as Array<{ href: string, type?: string }>
    expect(serviceDesc.some((s) => s.href === '/openapi-mcp.yaml' && s.type === 'application/yaml')).toBe(true)

    const related = body.linkset[0].related as Array<{ href: string }>
    expect(related.some((r) => r.href === '/llms.txt')).toBe(true)
    expect(related.some((r) => r.href === '/llms-full.txt')).toBe(true)
  })
})

describe('OpenAPI of /mcp — public/openapi-mcp.yaml', () => {
  const raw = readFileSync(resolve(publicDir, 'openapi-mcp.yaml'), 'utf8')

  it('declares OpenAPI 3.1', () => {
    expect(raw).toMatch(/^openapi:\s*3\.1\./m)
  })

  it('declares HTTP Bearer auth as the bearerAuth security scheme', () => {
    // Match the bearerAuth block: name, then type: http, then scheme: bearer.
    expect(raw).toMatch(/bearerAuth:\s*\n\s+type:\s*http\s*\n\s+scheme:\s*bearer/)
  })

  it('lists exactly the 8 mealmanager_* operationIds', () => {
    const matches = raw.match(/operationId:\s*(mealmanager_\w+)/g) ?? []
    const opIds = matches.map((m) => m.replace(/^operationId:\s*/, '')).sort()
    expect(opIds).toEqual([
      'mealmanager_get_household',
      'mealmanager_get_ingredient',
      'mealmanager_get_menu_for_week',
      'mealmanager_get_recipe',
      'mealmanager_get_shopping_list',
      'mealmanager_list_ingredients',
      'mealmanager_list_inventory',
      'mealmanager_list_recipes',
    ])
  })

  it('does not declare a householdId field anywhere (injected from PAT)', () => {
    expect(raw).not.toMatch(/^\s*householdId:/m)
  })
})

describe('link-headers middleware — discoverability', () => {
  it('sets the Link header with the three discovery values on a normal request', () => {
    const event = makeEvent({ path: '/' })

    ;(linkHeadersMiddleware as any)(event)

    const link = event._responseHeaders?.link
    expect(link).toContain('rel="api-catalog"')
    expect(link).toContain('rel="llms-txt"')
    expect(link).toContain('rel="service-desc"')
    expect(link).toContain('</.well-known/api-catalog>')
    expect(link).toContain('</llms.txt>')
    expect(link).toContain('</openapi-mcp.yaml>')
  })

  it('short-circuits for /mcp so the SDK transport is not polluted', () => {
    const event = makeEvent({ path: '/mcp' })

    ;(linkHeadersMiddleware as any)(event)

    expect(event._responseHeaders?.link).toBeUndefined()
  })

  it('short-circuits for any /mcp sub-path', () => {
    const event = makeEvent({ path: '/mcp/anything' })

    ;(linkHeadersMiddleware as any)(event)

    expect(event._responseHeaders?.link).toBeUndefined()
  })

  it('merges with an existing Link header rather than overwriting it', () => {
    const event = makeEvent({
      path: '/',
      responseHeaders: { link: '<https://example/x>; rel="alternate"' },
    })

    ;(linkHeadersMiddleware as any)(event)

    const link = event._responseHeaders?.link
    expect(link).toContain('rel="alternate"')
    expect(link).toContain('rel="api-catalog"')
  })
})
