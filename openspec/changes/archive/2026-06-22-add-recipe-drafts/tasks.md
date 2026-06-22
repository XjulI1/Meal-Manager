## 1. Préparation : lever la collision de nom

- [x] 1.1 Renommer le type éphémère `RecipeDraft` → `RecipeDraftContent` dans `server/contexts/catalog/domain/ports/recipe-importer.ts` (et exporter `RecipeDraftContent`)
- [x] 1.2 Propager le renommage à `recipe-photo-importer.ts`, `recipe-generator.ts`, `recipe-chat-assistant.ts` et aux adaptateurs Anthropic (`anthropic-recipe-importer.ts`, `anthropic-recipe-photo-importer.ts`, `anthropic-recipe-chat.service.ts`, `recipe-extract-tool.ts`)
- [x] 1.3 Propager au use case `resolve-recipe-draft.use-case.ts` et vérifier que le DTO partagé public `RecipeDraftSchema` (contenu IA) reste inchangé
- [x] 1.4 `pnpm typecheck` vert après renommage

## 2. Domaine `catalog` : entité, contenu, port, erreurs

- [x] 2.1 Créer le value object `RecipeDraftContent` réutilisable (titre?, instructions?, servings?, ingrédients texte libre, sourceUrl?) ou réutiliser celui du port, selon ce qui est le plus propre
- [x] 2.2 Créer l'entité `RecipeDraft` dans `domain/entities/recipe-draft.entity.ts` (`id`, `householdId`, `source`, contenu, `createdAt`, `updatedAt`) avec `create()`, `rehydrate()`, et des `withXxx()` immuables ; `source` immuable
- [x] 2.3 Définir l'enum `RecipeDraftSource` (`manual | ai-chat | ai-url | ai-photo | mcp`) et les constantes de bornes (`RECIPE_DRAFTS_MAX_PER_HOUSEHOLD`, max ingrédients, tailles de champ alignées sur `Recipe`)
- [x] 2.4 Créer le port `IRecipeDraftRepository` dans `domain/ports/recipe-draft-repository.port.ts` (`findById`, `listForHousehold`, `countForHousehold`, `create`, `update`, `delete`)
- [x] 2.5 Créer les erreurs `RecipeDraftNotFoundError` et `RecipeDraftLimitReachedError` dans `domain/errors/`

## 3. Application : use cases

- [x] 3.1 `SaveRecipeDraftUseCase` (vérifie le plafond via `countForHousehold` → `RecipeDraftLimitReachedError`, force `source`)
- [x] 3.2 `ListRecipeDraftsUseCase` (résumés, tri `updatedAt` desc, scoped `householdId`)
- [x] 3.3 `GetRecipeDraftByIdUseCase` (scoped `householdId` → `RecipeDraftNotFoundError`)
- [x] 3.4 `UpdateRecipeDraftUseCase` (patch partiel, remplace les ingrédients si fournis, rafraîchit `updatedAt`, refuse de changer `source`)
- [x] 3.5 `DeleteRecipeDraftUseCase` (scoped `householdId`, idempotent/404 si absent)

## 4. Infrastructure : persistance Drizzle

- [x] 4.1 Schéma Drizzle `server/database/schema/recipe-drafts.ts` : table `recipe_drafts` (`id` char(36), `householdId` FK households cascade, `source` enum, `title` varchar(200) NULL, `instructions` text NULL, `servings` int unsigned NULL, `sourceUrl` varchar(2000) NULL, `createdAt`, `updatedAt`, index household)
- [x] 4.2 Table `recipe_draft_ingredients` (`draftId` FK recipe_drafts cascade, `position` int unsigned, `name` varchar(200), `quantityValue` decimal(10,2) NULL, `quantityUnit` varchar(40) NULL, `raw` varchar(300) NULL, PK `(draftId, position)`)
- [x] 4.3 Migration `0006_add_recipe_drafts.sql` + entrée journal (écrite à la main : `db:generate` est bloqué en interactif par un drift de snapshot préexistant sur `inventory_items`, sans rapport avec ce change)
- [x] 4.4 Mapper `infrastructure/mappers/recipe-draft.mapper.ts` (rows ↔ entité)
- [x] 4.5 Repository `infrastructure/repositories/drizzle-recipe-draft.repository.ts` implémentant `IRecipeDraftRepository`
- [x] 4.6 Câbler repository + use cases dans `server/plugins/container.ts`

## 5. DTO partagés

- [x] 5.1 Créer `shared/dto/recipe-drafts.ts` : `RecipeDraftSourceSchema`, `SaveRecipeDraftSchema` (réutilise `RecipeIngredientDraftSchema`), `UpdateRecipeDraftSchema` (= partial sans `source`), `RecipeDraftViewSchema`, `RecipeDraftSummarySchema`

## 6. Routes HTTP

- [x] 6.1 `server/api/recipes/drafts/index.post.ts` (création, `requireHouseholdMember()`, 201, 400 invalide, 409 plafond)
- [x] 6.2 `server/api/recipes/drafts/index.get.ts` (liste résumés)
- [x] 6.3 `server/api/recipes/drafts/[id].get.ts` (lecture, 404 hors foyer)
- [x] 6.4 `server/api/recipes/drafts/[id].patch.ts` (autosave, 404 hors foyer)
- [x] 6.5 `server/api/recipes/drafts/[id].delete.ts` (suppression, 404 hors foyer)

## 7. Outils MCP

- [x] 7.1 `server/routes/mcp/tools/recipe-drafts.ts` : enregistrer `mealmanager_save_recipe_draft` (write, `source` forcée `mcp`, pas de `householdId` ni `source` en entrée, plafond respecté), `mealmanager_list_recipe_drafts`, `mealmanager_get_recipe_draft`
- [x] 7.2 Brancher dans `registerAllTools` (`server/routes/mcp/tools/index.ts`) — total 11 outils
- [x] 7.3 Mettre à jour `/openapi-mcp.yaml` (11 `operationId`, `x-mcp-tool`, pas de `householdId`/`source` dans `save_recipe_draft`) et le linkset RFC 9727 si requis

## 8. Front (préparation autosave)

- [x] 8.1 Composable `app/composables/useApiRecipeDrafts.ts` typé via les DTO
- [x] 8.2 Autosave sans bouton : `useRecipeDraftSync` (create au 1er changement, patch debounce/coalescé), `RecipeForm` émet `change`/`discard`, `/recipes/new` câble autosave + reprise (`?draft=`) + promotion à la création ; bouton « Ne pas garder » ; les 3 modes IA taguent la `source` ; liste des brouillons sur `/recipes`

## 9. Tests

- [x] 9.1 Unit : entité `RecipeDraft` (création, `source` immuable, transitions `withXxx`), bornes/plafond
- [x] 9.2 Intégration : use cases avec repository en mémoire (save/list/get/update/delete, isolation foyer, plafond → 409)
- [x] 9.3 Smoke HTTP : `POST/GET/PATCH/DELETE /api/recipes/drafts` (statuts, isolation 404)
- [x] 9.4 Smoke MCP : `tools/list` retourne 11 outils ; `save_recipe_draft` persiste avec `source=mcp` sous le foyer du PAT et ignore `householdId`/`source` fournis
- [x] 9.5 `pnpm lint` + `pnpm typecheck` + `pnpm test` verts

## 10. Validation OpenSpec

- [x] 10.1 `openspec validate add-recipe-drafts --strict` vert
- [x] 10.2 Mettre à jour `docs/`/discoverability si le nombre d'outils MCP y est référencé
