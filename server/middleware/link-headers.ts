/**
 * Advertises the agent-facing discovery resources via an HTTP `Link` header
 * (RFC 8288), as recommended by RFC 9727 §3.
 *
 * Three values are added on every response:
 *   - /.well-known/api-catalog   rel=api-catalog       (RFC 9727)
 *   - /llms.txt                  rel=llms-txt          (LLM-oriented summary)
 *   - /openapi-mcp.yaml          rel=service-desc      (OpenAPI of /mcp)
 *
 * `/mcp` is excluded: the MCP SDK writes directly to the underlying
 * ServerResponse (see server/routes/mcp/index.ts:39), and injecting headers
 * after the SDK has begun writing produces undefined behavior.
 *
 * If a downstream handler already set a `Link` header, the new values are
 * merged (comma-separated per RFC 8288) rather than overwriting it.
 */
const DISCOVERY_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</llms.txt>; rel="llms-txt"; type="text/plain"',
  '</openapi-mcp.yaml>; rel="service-desc"; type="application/yaml"',
].join(', ')

export default defineEventHandler((event) => {
  if (event.path?.startsWith('/mcp')) return

  const existing = getResponseHeader(event, 'link')
  const merged = existing ? `${existing}, ${DISCOVERY_LINKS}` : DISCOVERY_LINKS
  setResponseHeader(event, 'link', merged)
})
