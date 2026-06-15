import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { registerAllTools } from './tools'
import { requireHouseholdFromPAT } from '../../utils/require-household'

/**
 * MCP HTTP endpoint at `/mcp`. Authenticated by Personal Access Token in the
 * `Authorization: Bearer` header. Stateless mode — each request is autonomous.
 * 11 tools mapped on existing use cases (read-only, plus the mutating
 * `mealmanager_save_recipe_draft`). The `householdId` comes from the PAT, never
 * from tool input.
 *
 * See openspec/changes/add-mcp-llm-integration/design.md for rationale (D1, D7, D8).
 */
export default defineEventHandler(async (event) => {
  // Auth first — throws 401 + WWW-Authenticate on failure.
  const { userId, householdId } = await requireHouseholdFromPAT(event)

  const mcpServer = new McpServer({
    name: 'meal-manager',
    version: '0.1.0',
  })

  registerAllTools(mcpServer, {
    container: event.context.container,
    userId,
    householdId,
  })

  const transport = new StreamableHTTPServerTransport({
    // Stateless: no session id, each POST autonomous.
    sessionIdGenerator: undefined,
  })

  await mcpServer.connect(transport)

  // Pre-parse the body for POST requests (h3 buffers the raw body for us).
  const body = event.method === 'POST' ? await readBody(event).catch(() => undefined) : undefined

  await transport.handleRequest(event.node.req, event.node.res, body)

  // The transport writes to event.node.res directly. Returning undefined tells
  // h3 not to attempt its own response serialization.
  return
})
