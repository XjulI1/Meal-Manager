/** Raised when a wine cannot be extracted from label photos (unreadable image,
 *  no parsable content, extraction failed). Mapped to HTTP 400 at the transport
 *  layer. */
export class WineLabelScanError extends Error {
  override readonly name = 'WineLabelScanError'
}
