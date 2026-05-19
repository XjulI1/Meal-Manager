/**
 * RFC 9727 API Catalog — advertises the discoverable APIs of this domain.
 * https://www.rfc-editor.org/rfc/rfc9727.html
 *
 * Format is RFC 9264 Linkset JSON (application/linkset+json). For Meal Manager
 * the only public-facing programmatic surface is `/mcp` (Model Context
 * Protocol, Streamable HTTP transport). The OpenAPI description of `/mcp` is
 * advertised as a `service-desc` link; the LLM-oriented prose docs are
 * advertised as `related` links.
 */
export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'application/linkset+json')
  setResponseHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    linkset: [
      {
        anchor: '/',
        item: [
          {
            href: '/mcp',
            type: 'application/json',
            profile: 'urn:ietf:params:mcp:transport:streamable-http',
            title: 'Model Context Protocol endpoint (Bearer Personal Access Token required)',
          },
        ],
        'service-desc': [
          {
            href: '/openapi-mcp.yaml',
            type: 'application/yaml',
            title: 'OpenAPI 3.1 description of the MCP endpoint',
          },
        ],
        related: [
          {
            href: '/llms.txt',
            type: 'text/plain',
            title: 'LLM-oriented summary',
          },
          {
            href: '/llms-full.txt',
            type: 'text/plain',
            title: 'LLM-oriented detailed guide',
          },
        ],
      },
    ],
  }
})
