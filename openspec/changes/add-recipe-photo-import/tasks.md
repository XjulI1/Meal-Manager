## 1. Configuration

- [x] 1.1 Ajouter `anthropicPhotoEffort` (défaut `medium`) au `runtimeConfig` serveur dans `nuxt.config.ts` (jamais sous `public`)
- [x] 1.2 Documenter `NUXT_ANTHROPIC_PHOTO_EFFORT` (optionnel) dans `.env.example`

## 2. DTO partagés (shared/dto/recipe-chat.ts)

- [x] 2.1 `ImportRecipePhotosSchema` + type : `{ images: [{ mediaType, data }] }` avec `mediaType` ∈ `enum(['image/jpeg','image/png','image/webp'])`, `data` base64 non vide borné (~5 Mo/image), `images` `min(1).max(5)`
- [x] 2.2 Réutiliser `RecipeDraftSchema` existant pour la réponse (pas de duplication ; `sourceUrl` reste optionnel/absent)

## 3. Domaine (catalog)

- [x] 3.1 Créer le port `catalog/domain/ports/recipe-photo-importer.ts` : `RecipeImageInput { mediaType, data }`, `IRecipePhotoImporter.importFromPhotos(images): Promise<RecipeDraft>` (réutilise le type `RecipeDraft` de `recipe-importer.ts`)
- [x] 3.2 Créer l'erreur métier `catalog/domain/errors/recipe-photo-import.error.ts` (`RecipePhotoImportError`, calquée sur `RecipeImportError`)

## 4. Infrastructure (adapter Anthropic)

- [x] 4.1 Factoriser `EXTRACT_RECIPE_TOOL` dans un module partagé (`catalog/infrastructure/adapters/recipe-extract-tool.ts`) et le réutiliser dans `AnthropicRecipeImporter`
- [x] 4.2 `AnthropicRecipePhotoImporter` (implémente `IRecipePhotoImporter`) : construit un message `user` avec N blocs `image` (source base64) + un bloc `text` d'instruction, `tool_choice` forcé sur `extract_recipe`, `safeParse` via `RecipeDraftSchema`, `max_tokens` borné, effort depuis la config
- [x] 4.3 Lever `RecipePhotoImportError` quand aucune recette exploitable n'est extraite ; confiner l'import `@anthropic-ai/sdk` à l'infrastructure (aucune fuite domain/application)

## 5. Application (use case catalog)

- [x] 5.1 `ImportRecipeFromPhotosUseCase` (calqué sur `ImportRecipeFromUrlUseCase`) : délègue à `IRecipePhotoImporter`, renvoie un `RecipeDraft` ; ne persiste rien
- [x] 5.2 Réutiliser tel quel `ResolveRecipeDraftUseCase` et `CreateRecipeUseCase` pour la suite du parcours (aucune modification)

## 6. Composition root & transport

- [x] 6.1 Instancier `AnthropicRecipePhotoImporter` + `ImportRecipeFromPhotosUseCase` dans `server/plugins/container.ts` (config via `parseEffort(aiConfig.anthropicPhotoEffort, 'medium')`)
- [x] 6.2 Ajouter `importRecipeFromPhotos: ImportRecipeFromPhotosUseCase` à l'interface `Container` (`server/types/container.ts`)
- [x] 6.3 `POST /api/recipes/import-photo` : `requireAiEnabled()` puis `readValidatedBody` avec `ImportRecipePhotosSchema` (400 si invalide), délègue au use case, mappe `RecipePhotoImportError` → 400

## 7. Front (app)

- [x] 7.1 Étendre `useApiRecipeChat` avec `importPhotos(files: File[]): Promise<RecipeDraftDto>` : lit les `File` en base64 (`FileReader`), POST `/api/recipes/import-photo`
- [x] 7.2 Ajouter sur `/recipes/chat` une carte « Importer depuis une photo » : input `file` (`accept` jpeg/png/webp, `multiple`, `capture` pour la caméra mobile), aperçu des vignettes, bouton « Interpréter », garde de nombre/taille côté client
- [x] 7.3 Brancher le résultat sur `resolveDraft` + `continueToForm` existants (réutilisation du parcours URL) ; toast invitant à vérifier le brouillon
- [x] 7.4 Masquer la carte photo quand `aiEnabled` est `false` (comme l'URL et le chat)
- [x] 7.5 Support HEIC/HEIF : conversion client en JPEG via `heic-to` (import dynamique, détection par octets magiques `isHeic`) dans `toApiImage`, avant base64 ; `accept` de l'input élargi à `.heic`/`.heif` ; erreur de conversion affichée en toast

## 8. Tests

- [x] 8.1 Intégration : `ImportRecipeFromPhotosUseCase` avec un fake en mémoire du port `IRecipePhotoImporter` (pas de réseau)
- [x] 8.2 Smoke HTTP `POST /api/recipes/import-photo` : 401 sans session, 403 si `aiEnabled=false`, 400 si payload invalide (0 image / trop d'images / type non supporté), 200 + forme `RecipeDraft` sur cas valide (port fake)
- [x] 8.3 Unitaire (si pertinent) : validation `ImportRecipePhotosSchema` (bornes nombre/taille/type MIME)

## 9. Validation & finalisation

- [x] 9.1 `pnpm lint` (règle d'isolation domain), `pnpm typecheck`, `pnpm test` — tous verts
- [x] 9.2 `openspec validate add-recipe-photo-import --strict`
- [x] 9.3 Mettre à jour la doc si nécessaire (`.env.example`, README — mention de l'import photo dans la section IA)
