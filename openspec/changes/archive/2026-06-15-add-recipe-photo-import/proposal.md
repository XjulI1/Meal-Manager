## Why

L'import IA de recettes ne fonctionne aujourd'hui qu'à partir d'une URL. Or beaucoup de recettes vivent sur papier : livres de cuisine, fiches manuscrites, magazines. L'utilisateur n'a aucun moyen de les faire entrer dans l'application sans tout retaper. On veut lui permettre de **photographier** une recette et laisser l'IA (Claude vision) l'interpréter pour pré-remplir le formulaire, exactement comme l'import URL.

## What Changes

- **Import depuis une ou plusieurs photos** : sur la page `/recipes/chat`, à côté de la carte « Importer depuis une URL », une nouvelle carte « Importer depuis une photo » permet de joindre **1 à N images** d'une même recette (recto/verso d'une fiche, double page de livre, photo des ingrédients + photo des étapes). Claude vision les interprète **ensemble** comme une seule recette et produit un `RecipeDraft`.
- **Même parcours one-shot que l'URL** : le brouillon passe par la **résolution d'ingrédients** existante puis **pré-remplit le `RecipeForm`** ; l'utilisateur valide/corrige avant l'enregistrement réel. Aucune persistance par l'IA (réutilise `CreateRecipeUseCase`, la création d'ingrédients et la résolution déjà en place).
- **Mirroir du pattern existant** : nouveau port `IRecipePhotoImporter` (analogue à `IRecipeImporter`), adapter Anthropic vision, use case dédié, route `POST /api/recipes/import-photo`, le tout derrière `requireHouseholdMember()` + `requireAiEnabled()`.
- **Gating IA identique** : l'endpoint renvoie **HTTP 403** quand le flag `aiEnabled` du compte est désactivé ; le front masque/désactive la carte comme pour le chat et l'URL.
- **Garde-fous d'entrée** : nombre maximal d'images, taille et types MIME acceptés (JPEG/PNG/WebP) validés à la frontière ; rejet en **HTTP 400** sinon.

## Capabilities

### New Capabilities
<!-- Aucune nouvelle capability : l'import photo enrichit l'assistant de recettes existant. -->

### Modified Capabilities
- `recipe-chat-assistant`: ajout d'une exigence **« Import a Recipe from Photos »** — un membre du foyer avec IA activée envoie une ou plusieurs images d'une recette ; le système les interprète via Claude vision et renvoie un `RecipeDraft` (même forme que l'import URL, sans `sourceUrl`), gated par l'accès IA et scoped-foyer.

## Impact

- **Domaine** : nouveau port `IRecipePhotoImporter` dans `server/contexts/catalog/domain/ports/` ; nouvelle erreur métier `RecipePhotoImportError` (analogue à `RecipeImportError`).
- **Infrastructure** : adapter `AnthropicRecipePhotoImporter` dans `catalog/infrastructure/adapters/` (blocs `image` de l'API Messages, outil `extract_recipe` déjà utilisé pour l'URL). Réutilise `anthropic-config.ts` (modèle, effort).
- **Application** : `ImportRecipeFromPhotosUseCase` (analogue à `ImportRecipeFromUrlUseCase`).
- **Transport HTTP** : route `POST /api/recipes/import-photo` (upload multipart ou base64), via `requireHouseholdMember()` + `requireAiEnabled()`.
- **DI** : enregistrement de l'adapter et du use case dans `server/plugins/container.ts` + type dans `server/types/container.ts`.
- **DTO partagés** : schéma Zod de la requête d'import photo (`shared/dto/recipe-chat.ts`) ; réutilise `RecipeDraftSchema` et `DraftResolutionSchema` existants pour la réponse.
- **Front** : extension de `useApiRecipeChat` (`importPhotos(files)`), nouvelle carte d'upload sur `/recipes/chat`, réutilisation de la résolution + `toPrefill` + handoff vers `/recipes/new`.
- **Config** : aucune nouvelle variable d'environnement (réutilise `NUXT_ANTHROPIC_API_KEY` / `NUXT_ANTHROPIC_MODEL`). Éventuel ajout d'un effort dédié `NUXT_ANTHROPIC_PHOTO_EFFORT` (défaut `medium`) côté `runtimeConfig`.
- **Réutilisation sans modification** : `CreateRecipeUseCase`, la création d'ingrédients, `RecipeForm`, `ResolveRecipeDraftUseCase` et le flux de résolution restent inchangés.
