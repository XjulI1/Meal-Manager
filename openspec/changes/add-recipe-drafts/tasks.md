## 1. Préparation : lever la collision de nom

- [ ] 1.1 Renommer le type éphémère `RecipeDraft` → `RecipeDraftContent` dans `server/contexts/catalog/domain/ports/recipe-importer.ts` (et exporter `RecipeDraftContent`)
- [ ] 1.2 Propager le renommage à `recipe-photo-importer.ts`, `recipe-generator.ts`, `recipe-chat-assistant.ts` et aux adaptateurs Anthropic (`anthropic-recipe-importer.ts`, `anthropic-recipe-photo-importer.ts`, `anthropic-recipe-chat.service.ts`, `recipe-extract-tool.ts`)
- [ ] 1.3 Propager au use case `resolve-recipe-draft.use-case.ts` et vérifier que le DTO partagé public `RecipeDraftSchema` (contenu IA) reste inchangé
- [ ] 1.4 `pnpm typecheck` vert après renommage

## 2. Domaine `catalog` : entité, contenu, port, erreurs

- [ ] 2.1 Créer le value object `RecipeDraftContent` réutilisable (titre?, instructions?, servings?, ingrédients texte libre, sourceUrl?) ou réutiliser celui du port, selon ce qui est le plus propre
- [ ] 2.2 Créer l'entité `RecipeDraft` dans `domain/entities/recipe-draft.entity.ts` (`id`, `householdId`, `source`, contenu, `createdAt`, `updatedAt`) avec `create()`, `rehydrate()`, et des `withXxx()` immuables ; `source` immuable
- [ ] 2.3 Définir l'enum `RecipeDraftSource` (`manual | ai-chat | ai-url | ai-photo | mcp`) et les constantes de bornes (`RECIPE_DRAFTS_MAX_PER_HOUSEHOLD`, max ingrédients, tailles de champ alignées sur `Recipe`)
- [ ] 2.4 Créer le port `IRecipeDraftRepository` dans `domain/ports/recipe-draft-repository.port.ts` (`findById`, `listForHousehold`, `countForHousehold`, `create`, `update`, `delete`)
- [ ] 2.5 Créer les erreurs `RecipeDraftNotFoundError` et `RecipeDraftLimitReachedError` dans `domain/errors/`

## 3. Application : use cases

- [ ] 3.1 `SaveRecipeDraftUseCase` (vérifie le plafond via `countForHousehold` → `RecipeDraftLimitReachedError`, force `source`)
- [ ] 3.2 `ListRecipeDraftsUseCase` (résumés, tri `updatedAt` desc, scoped `householdId`)
- [ ] 3.3 `GetRecipeDraftByIdUseCase` (scoped `householdId` → `RecipeDraftNotFoundError`)
- [ ] 3.4 `UpdateRecipeDraftUseCase` (patch partiel, remplace les ingrédients si fournis, rafraîchit `updatedAt`, refuse de changer `source`)
- [ ] 3.5 `DeleteRecipeDraftUseCase` (scoped `householdId`, idempotent/404 si absent)

## 4. Infrastructure : persistance Drizzle

- [ ] 4.1 Schéma Drizzle `server/database/schema/recipe-drafts.ts` : table `recipe_drafts` (`id` char(36), `householdId` FK households cascade, `source` enum, `title` varchar(200) NULL, `instructions` text NULL, `servings` int unsigned NULL, `sourceUrl` varchar(2000) NULL, `createdAt`, `updatedAt`, index household)
- [ ] 4.2 Table `recipe_draft_ingredients` (`draftId` FK recipe_drafts cascade, `position` int unsigned, `name` varchar(200), `quantityValue` decimal(10,2) NULL, `quantityUnit` varchar(40) NULL, `raw` varchar(300) NULL, PK `(draftId, position)`)
- [ ] 4.3 `pnpm db:generate` pour produire la migration ; vérifier le SQL généré
- [ ] 4.4 Mapper `infrastructure/mappers/recipe-draft.mapper.ts` (rows ↔ entité)
- [ ] 4.5 Repository `infrastructure/repositories/drizzle-recipe-draft.repository.ts` implémentant `IRecipeDraftRepository`
- [ ] 4.6 Câbler repository + use cases dans `server/plugins/container.ts`

## 5. DTO partagés

- [ ] 5.1 Créer `shared/dto/recipe-drafts.ts` : `RecipeDraftSourceSchema`, `SaveRecipeDraftSchema` (réutilise `RecipeIngredientDraftSchema`), `UpdateRecipeDraftSchema` (= partial sans `source`), `RecipeDraftViewSchema`, `RecipeDraftSummarySchema`

## 6. Routes HTTP

- [ ] 6.1 `server/api/recipes/drafts/index.post.ts` (création, `requireHouseholdMember()`, 201, 400 invalide, 409 plafond)
- [ ] 6.2 `server/api/recipes/drafts/index.get.ts` (liste résumés)
- [ ] 6.3 `server/api/recipes/drafts/[id].get.ts` (lecture, 404 hors foyer)
- [ ] 6.4 `server/api/recipes/drafts/[id].patch.ts` (autosave, 404 hors foyer)
- [ ] 6.5 `server/api/recipes/drafts/[id].delete.ts` (suppression, 404 hors foyer)

## 7. Outils MCP

- [ ] 7.1 `server/routes/mcp/tools/recipe-drafts.ts` : enregistrer `mealmanager_save_recipe_draft` (write, `source` forcée `mcp`, pas de `householdId` ni `source` en entrée, plafond respecté), `mealmanager_list_recipe_drafts`, `mealmanager_get_recipe_draft`
- [ ] 7.2 Brancher dans `registerAllTools` (`server/routes/mcp/tools/index.ts`) — total 11 outils
- [ ] 7.3 Mettre à jour `/openapi-mcp.yaml` (11 `operationId`, `x-mcp-tool`, pas de `householdId`/`source` dans `save_recipe_draft`) et le linkset RFC 9727 si requis

## 8. Front (préparation autosave)

- [ ] 8.1 Composable `app/composables/useApiRecipeDrafts.ts` typé via les DTO
- [ ] 8.2 Persister un brouillon depuis le formulaire recette (manuel) et depuis les retours des 3 modes IA (bouton « Enregistrer le brouillon » avec la `source` adéquate)

## 9. Tests

- [ ] 9.1 Unit : entité `RecipeDraft` (création, `source` immuable, transitions `withXxx`), bornes/plafond
- [ ] 9.2 Intégration : use cases avec repository en mémoire (save/list/get/update/delete, isolation foyer, plafond → 409)
- [ ] 9.3 Smoke HTTP : `POST/GET/PATCH/DELETE /api/recipes/drafts` (statuts, isolation 404)
- [ ] 9.4 Smoke MCP : `tools/list` retourne 11 outils ; `save_recipe_draft` persiste avec `source=mcp` sous le foyer du PAT et ignore `householdId`/`source` fournis
- [ ] 9.5 `pnpm lint` + `pnpm typecheck` + `pnpm test` verts

## 10. Validation OpenSpec

- [ ] 10.1 `openspec validate add-recipe-drafts --strict` vert
- [ ] 10.2 Mettre à jour `docs/`/discoverability si le nombre d'outils MCP y est référencé
