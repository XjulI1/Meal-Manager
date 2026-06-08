import type { IRecipeImporter, RecipeDraft } from '../../../../server/contexts/catalog/domain/ports/recipe-importer'

/** In-memory fake importer: returns a fixed draft or throws a fixed error. */
export class FakeRecipeImporter implements IRecipeImporter {
  lastUrl?: string

  constructor(private readonly result: RecipeDraft | Error) {}

  async importFromUrl(url: string): Promise<RecipeDraft> {
    this.lastUrl = url
    if (this.result instanceof Error) throw this.result
    return this.result
  }
}
