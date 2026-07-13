/** Raised when a label photo cannot be persisted (unsupported media type,
 *  oversized image, write failure). Mapped to HTTP 400 at the transport layer. */
export class LabelPhotoStorageError extends Error {
  override readonly name = 'LabelPhotoStorageError'
}
