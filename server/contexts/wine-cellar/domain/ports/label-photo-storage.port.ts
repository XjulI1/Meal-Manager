/**
 * Port for persisting a wine label photo and returning a served URL. The v1
 * implementation writes to a configured filesystem directory under an opaque,
 * unguessable key scoped to the owning household. Kept in the wine-cellar
 * domain for now; could graduate to a shared platform capability if a second
 * consumer (ingredient/product images) appears.
 */
export interface StoredPhotoInput {
  householdId: string
  /** MIME type — restricted to image/jpeg|png|webp. */
  mediaType: string
  /** Image bytes encoded as base64 (no `data:` prefix). */
  data: string
}

export interface ILabelPhotoStorage {
  /** Persists the photo and returns the URL to store in `Wine.photoUrl`. */
  store(input: StoredPhotoInput): Promise<{ url: string }>
}
