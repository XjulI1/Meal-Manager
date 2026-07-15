/** Raised when the AI enrichment of a wine fails (upstream API error, no usable
 *  structured output). Mapped to HTTP 502 at the transport layer. */
export class WineEnrichmentError extends Error {
  override readonly name = 'WineEnrichmentError'
}
