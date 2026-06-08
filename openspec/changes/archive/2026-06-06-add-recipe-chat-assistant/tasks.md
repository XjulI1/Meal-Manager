## 1. Dépendances & configuration

- [x] 1.1 Ajouter `@anthropic-ai/sdk` à `package.json` et installer (`pnpm install`)
- [x] 1.2 Ajouter `ANTHROPIC_API_KEY` à `.env.example` (clé serveur, non documentée comme publique)
- [x] 1.3 Exposer `anthropicApiKey` dans `runtimeConfig` (serveur uniquement, jamais sous `public`) dans `nuxt.config.ts`

## 2. Gating IA (contexte platform)

- [x] 2.1 Ajouter la colonne `ai_enabled` (boolean, défaut `false`) au schéma Drizzle users (`server/database/schema/`)
- [x] 2.2 Générer et appliquer la migration (`pnpm db:generate` puis `pnpm db:migrate`) — migration 0005 + journal écrits ; `db:migrate` à lancer en env avec MariaDB
- [x] 2.3 Propager `aiEnabled` dans l'entité/value object utilisateur du contexte `platform` (mapper row ↔ domaine) en garantissant le défaut `false` à la création (pas de dépendance au défaut SQL)
- [x] 2.4 Exposer `aiEnabled` dans la session (données de session côté serveur) pour lecture par le front
- [x] 2.5 Implémenter `requireAiEnabled()` dans `server/utils/` — composable avec `requireHouseholdMember()`, lève `createError({ statusCode: 403 })` si le flag est `false`, avant tout appel Anthropic
- [x] 2.6 Ajouter une entrée de seed / documenter la bascule via `db:studio` pour activer un compte (README : section « Assistant recettes (IA) » + snippet SQL)

## 3. DTO partagés (shared/dto)

- [x] 3.1 `ChatMessageSchema` + type (rôle user/assistant, contenu) et schéma de requête du chat (historique de messages)
- [x] 3.2 `RecipeDraftSchema` + type alignés sur `RecipeDraft` / `RecipeIngredientDraft` du domaine (title, instructions, servings?, ingredients[{name, quantity?, raw?}], sourceUrl?)
- [x] 3.3 `DraftResolutionSchema` + type (par ligne : `{ matched: ingredientId }` ou `{ proposedNew: { name, canonicalUnit } }`)

## 4. Domaine (catalog)

- [x] 4.1 Créer le port `catalog/domain/ports/recipe-chat-assistant.ts` (`IRecipeChatAssistant`) : prend l'historique + le contexte foyer, renvoie un flux d'événements assistant et un `RecipeDraft` optionnel
- [x] 4.2 Vérifier/ajuster le type `RecipeDraft` existant (`recipe-importer.ts`) pour couvrir le besoin (sourceUrl, quantité optionnelle) sans casser l'existant — déjà conforme ; extension du port `IIngredientLookup` (`findActiveByNameInHousehold`) pour la résolution

## 5. Infrastructure (adapters Anthropic)

- [x] 5.1 `AnthropicRecipeChatService` (implémente `IRecipeChatAssistant`) : SDK `@anthropic-ai/sdk`, modèle `claude-opus-4-8`, thinking adaptatif, streaming ; outil server-side `web_search` ; outil/structured-output `propose_recipe` validé via `RecipeDraftSchema`
- [x] 5.2 `AnthropicRecipeImporter` (implémente `IRecipeImporter.importFromUrl`) : fetch URL → parse JSON-LD/schema.org `Recipe` → `RecipeDraft` ; repli extraction Claude si pas de structured data ; 400 sur URL invalide/inaccessible
- [x] 5.3 Confiner l'import de `@anthropic-ai/sdk` aux adapters d'infrastructure uniquement (aucune fuite vers domain/application)
- [x] 5.4 Plafonner `max_tokens` dans les adapters chat et import (valeur de départ ~2 000–4 000 pour le chat), pour borner le coût par appel
- [x] 5.5 Prompt caching léger : préfixe `tools` + `system` stable/déterministe avec marqueur `cache_control` ephemeral ; vérifier `cache_read_input_tokens` (sachant le minimum de 4 096 tokens sur Opus 4.8)

## 6. Application (use cases catalog)

- [x] 6.1 `ChatRecipeUseCase` : orchestre un tour de chat via `IRecipeChatAssistant`, expose le flux (streaming) et le `RecipeDraft` éventuel ; ne persiste rien
- [x] 6.2 `ImportRecipeFromUrlUseCase` : délègue à `IRecipeImporter`, renvoie un `RecipeDraft`
- [x] 6.3 `ResolveRecipeDraftUseCase` (logique pure) : charge les ingrédients du foyer via le lookup existant, normalise (trim/lowercase), matche par nom ; pour les non-matchés produit une proposition `{ name, canonicalUnit }` (canonicalUnit dérivée de la dimension de quantité via `Quantity`) ; ne crée aucun ingrédient
- [x] 6.4 S'assurer que le save final réutilise `CreateRecipeUseCase` et la création d'ingrédient existante sans modification

## 7. Composition root & transport

- [x] 7.1 Instancier adapters + use cases dans `server/plugins/container.ts` et les exposer sur `event.context.container`
- [x] 7.2 `POST /api/recipes/chat` : streaming SSE, `requireHouseholdMember()` + `requireAiEnabled()`, `safeParse` de la requête, délègue à `ChatRecipeUseCase`
- [x] 7.3 `POST /api/recipes/import` : `requireHouseholdMember()` + `requireAiEnabled()`, valide l'URL, délègue à `ImportRecipeFromUrlUseCase`
- [x] 7.4 Endpoint de résolution de brouillon (`POST /api/recipes/draft/resolve`) : mêmes gardes, délègue à `ResolveRecipeDraftUseCase`

## 8. Front (app)

- [x] 8.1 Composable `useApiRecipeChat` : envoi de l'historique + consommation du flux SSE, exposition du `RecipeDraft` produit
- [x] 8.2 UI de chat (page `/recipes/chat` ou panneau sur `/recipes/new`) : conversation streaming + champ d'import par URL + affichage des sources web
- [x] 8.3 Pré-remplir `RecipeForm` à partir du draft résolu (ingrédients matchés sélectionnés, manquants signalés pour création)
- [x] 8.4 Masquer/désactiver l'entrée chat quand `aiEnabled` est `false` (lecture du flag de session ; bouton Assistant masqué + garde côté page)

## 9. Tests

- [x] 9.1 Unitaires : `ResolveRecipeDraftUseCase` (match exact, proposition de création, dérivation d'unité canonique, normalisation)
- [x] 9.2 Unitaires : parsing JSON-LD `Recipe` → `RecipeDraft` (cas avec/sans structured data)
- [x] 9.3 Intégration : `ChatRecipeUseCase` / `ImportRecipeFromUrlUseCase` avec fakes en mémoire des ports (pas de réseau)
- [x] 9.4 Intégration : gating — 403 quand `aiEnabled=false`, succès quand `true` ; 401 sans session
- [x] 9.5 Smoke HTTP : `POST /api/recipes/import`, `/draft/resolve` (auth + gating + forme de réponse) ; `/chat` (gating 401/403 — le 200 SSE est validé manuellement, `createEventStream` non stubbable hors runtime)

## 10. Validation & finalisation

- [x] 10.1 `pnpm lint` (incluant la règle d'isolation domain), `pnpm typecheck` — verts ; `pnpm test` : 362 tests OK
- [x] 10.2 `openspec validate add-recipe-chat-assistant --strict`
- [x] 10.3 Mettre à jour la doc si nécessaire (`.env.example`, README scripts, mention du flag IA)
