## Context

L'assistant de recettes IA (change `add-recipe-chat-assistant`, archivé) offre déjà un import depuis une URL : la route `POST /api/recipes/import` délègue à `ImportRecipeFromUrlUseCase`, qui appelle le port `IRecipeImporter`. L'adapter `AnthropicRecipeImporter` produit un `RecipeDraft` (tente JSON-LD, sinon extraction Claude via l'outil `extract_recipe`). Le brouillon est ensuite résolu contre le catalogue (`ResolveRecipeDraftUseCase`) puis pré-remplit `RecipeForm`. Tout est scoped-foyer (`requireHouseholdMember()`) et gated IA (`requireAiEnabled()` → 403 si `ai_enabled` désactivé).

On veut le **même parcours** mais avec des **photos** en entrée : l'utilisateur photographie une recette papier (1 à N images d'une même recette) et Claude vision l'interprète. Le SDK `@anthropic-ai/sdk` (déjà présent, `^0.101.0`) supporte les blocs `image` dans l'API Messages.

Contraintes du projet : architecture hexagonale (`infrastructure → application → domain`, le domaine n'importe rien d'externe) ; validation Zod à la frontière HTTP ; DI via `server/plugins/container.ts` ; pas de persistance par l'IA (human-in-the-loop) ; locale `fr-FR`.

## Goals / Non-Goals

**Goals:**
- Importer une recette depuis **1 à N photos d'une même recette**, interprétées **ensemble** par Claude vision, vers un `RecipeDraft`.
- Réutiliser **tel quel** le reste du parcours : résolution d'ingrédients, `toPrefill`, handoff vers `/recipes/new`, `RecipeForm`, `CreateRecipeUseCase`.
- Garder le **gating IA** et le **scoping foyer** identiques à l'import URL.
- Valider strictement les entrées (nombre, taille, type MIME) avant tout appel API.

**Non-Goals:**
- Pas de reconnaissance multi-recettes sur une seule image (les images fournies décrivent **une** recette).
- Pas de stockage des photos uploadées (elles servent uniquement à l'extraction, jamais persistées).
- Pas de nouvelle UI de gestion ; on ajoute seulement une carte sur `/recipes/chat`.
- Pas de modification du flux de résolution ni du formulaire.

## Decisions

### D1 — Nouveau port `IRecipePhotoImporter` (pas d'extension de `IRecipeImporter`)
On introduit un port dédié dans `catalog/domain/ports/recipe-photo-importer.ts` :

```ts
export interface RecipeImageInput {
  /** MIME type, restreint côté transport à image/jpeg|png|webp. */
  mediaType: string
  /** Données de l'image encodées en base64 (sans préfixe data:). */
  data: string
}

export interface IRecipePhotoImporter {
  importFromPhotos(images: ReadonlyArray<RecipeImageInput>): Promise<RecipeDraft>
}
```

On réutilise le type `RecipeDraft` (réexporté depuis `recipe-importer.ts`) — pas de duplication. **Alternative écartée** : ajouter une méthode `importFromPhotos` à `IRecipeImporter`. Rejeté car ça mélange deux sources hétérogènes (URL vs binaire) dans un même port et forcerait l'adapter URL à implémenter une méthode hors de son rôle. Un port par capacité reste plus fidèle au pattern (cf. `IRecipeImporter` vs `IRecipeChatAssistant`).

### D2 — Transport : JSON base64 validé par Zod (pas de multipart)
La route `POST /api/recipes/import-photo` reçoit un corps **JSON** `{ images: [{ mediaType, data }] }` où `data` est l'image en base64. Le front lit les `File` via `FileReader.readAsDataURL` et envoie le base64.

Rationale : cohérent avec le reste du code (tout passe par `readValidatedBody` + Zod), trivial à brancher dans `useApiRecipeChat` avec `$fetch`, et testable sans multipart. **Alternative écartée** : `multipart/form-data` + `readMultipartFormData`. Plus standard pour des fichiers et ~33 % de payload en moins, mais introduit un chemin de parsing distinct du reste de l'app et complique la validation Zod. Le surcoût base64 est acceptable vu les bornes de taille (voir D5).

### D3 — Adapter `AnthropicRecipePhotoImporter` (vision + outil `extract_recipe`)
`catalog/infrastructure/adapters/anthropic-recipe-photo-importer.ts` implémente `IRecipePhotoImporter`. Il construit **un** message `user` contenant N blocs `image` (`source: { type: 'base64', media_type, data }`) suivis d'un bloc `text` d'instruction, et force `tool_choice: { type: 'tool', name: 'extract_recipe' }` avec le **même** schéma d'outil que l'adapter URL (on factorise `EXTRACT_RECIPE_TOOL` dans un module partagé `recipe-extract-tool.ts` pour éviter la divergence). La sortie est `safeParse`-ée contre `RecipeDraftSchema` ; échec → `RecipePhotoImportError`.

Pas de `sourceUrl` (recette papier). `max_tokens` borné comme l'URL ; effort **medium** par défaut (l'OCR/interprétation visuelle profite d'un effort supérieur au `low` de l'extraction texte mécanique).

### D4 — Erreur métier dédiée `RecipePhotoImportError`
`catalog/domain/errors/recipe-photo-import.error.ts`, calquée sur `RecipeImportError`, mappée en **HTTP 400** au transport (image illisible, aucune recette exploitable, réponse Claude inexploitable).

### D5 — Bornes de validation à la frontière
DTO `ImportRecipePhotosSchema` dans `shared/dto/recipe-chat.ts` :
- `images` : tableau `min(1).max(MAX_IMAGES)` (MAX_IMAGES = **5**).
- `mediaType` : `enum(['image/jpeg','image/png','image/webp'])`.
- `data` : base64 non vide, longueur max correspondant à ~**5 Mo** par image décodée (borne sur la longueur de la chaîne base64).

La route rejette en 400 si le `safeParse` échoue (zéro image, trop d'images, type non supporté, image trop lourde) — **aucun appel Anthropic** dans ce cas. Le gating IA (`requireAiEnabled`) s'applique avant la validation du corps, comme pour l'URL.

### D6 — Use case mince + DI
`ImportRecipeFromPhotosUseCase` (calqué sur `ImportRecipeFromUrlUseCase`) délègue au port. Enregistrement dans `server/plugins/container.ts` (`recipePhotoImporter` adapter + `importRecipeFromPhotos` use case) et type dans `server/types/container.ts`. Nouvelle config `anthropicPhotoEffort` (défaut `medium`) dans `nuxt.config.ts` runtimeConfig + `parseEffort`.

### D7 — Front : carte d'upload sur `/recipes/chat`
Nouvelle carte « Importer depuis une photo » à côté de la carte URL : un input `file` (`accept="image/jpeg,image/png,image/webp"`, `multiple`, `capture` autorisant la caméra sur mobile), un aperçu des vignettes sélectionnées, et un bouton « Interpréter ». `useApiRecipeChat` gagne `importPhotos(files: File[]): Promise<RecipeDraftDto>` qui encode en base64 et POST. Le résultat passe par `resolveDraft` puis `continueToForm` — **réutilisation totale** du chemin existant. La carte est masquée si `aiEnabled` est faux (comme l'URL et le chat).

## Risks / Trade-offs

- **Coût/tokens des images** (la vision consomme beaucoup de tokens) → bornes strictes (max 5 images, ~5 Mo chacune), `max_tokens` cap, effort `medium` (pas `high`/`max`).
- **Qualité OCR sur écriture manuscrite/photo floue** → l'utilisateur **revoit et corrige** le brouillon dans `RecipeForm` avant enregistrement (human-in-the-loop déjà en place) ; un toast invite à vérifier.
- **Surcoût base64 (~33 %) du transport JSON** → acceptable vu les bornes ; documenté, multipart reste une évolution possible si besoin.
- **Hallucination d'ingrédients/quantités** → même garde-fou : résolution contre le catalogue (ingrédients inconnus = propositions à confirmer) + validation finale par l'utilisateur.
- **Images non persistées** → pas de fuite de stockage ni de RGPD additionnel ; l'image ne sort que vers l'API Anthropic (clé serveur, jamais exposée au client).

## Migration Plan

Changement purement additif : nouveau port, adapter, use case, route, DTO, et UI. Aucune migration de base de données (réutilise le flag `ai_enabled` existant). Rollback = retirer la route/carte ; aucun impact sur les données. Déploiement : ajouter `NUXT_ANTHROPIC_PHOTO_EFFORT` à `.env.example` (optionnel, défaut `medium`).

## Open Questions

- Faut-il un effort plus élevé (`high`) si la qualité d'extraction s'avère insuffisante sur du manuscrit ? À ajuster après tests réels (config-driven, sans changement de code).
