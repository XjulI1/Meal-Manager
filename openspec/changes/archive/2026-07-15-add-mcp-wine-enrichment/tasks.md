## 1. Refactor partagé (application)

- [x] 1.1 Extraire la logique de persistance d'enrichissement de `EnrichWineUseCase` dans une fonction partagée `applyWineEnrichment(wine, result, now)` (neutralisation garde incohérente, champ omis = inchangé, `aiEnrichedAt = now`) — nouveau fichier `server/contexts/wine-cellar/application/apply-wine-enrichment.ts`
- [x] 1.2 Faire consommer `applyWineEnrichment` par `EnrichWineUseCase` (comportement identique, tests existants toujours verts)
- [x] 1.3 Extraire le cœur de la consigne de recherche (actuellement `SYSTEM` de `anthropic-wine-enricher.ts`) dans un module partagé `server/contexts/wine-cellar/application/wine-enrichment-brief.ts` et l'utiliser dans l'adapter

## 2. Use case d'enregistrement

- [x] 2.1 Créer `server/contexts/wine-cellar/application/use-cases/save-wine-enrichment.use-case.ts` : `SaveWineEnrichmentUseCase(wines, bottles, clock?)`, `execute({ householdId, id, enrichment })` → `findById` (404), `applyWineEnrichment`, `wines.update`, renvoie `WineView`
- [x] 2.2 Câbler `SaveWineEnrichmentUseCase` dans `server/plugins/container.ts` + ajouter `saveWineEnrichment` à l'interface `Container` (`server/types/container.ts`)

## 3. Outils MCP

- [x] 3.1 Créer `server/routes/mcp/tools/wine.ts` avec `registerWineTools(server, ctx)`
- [x] 3.2 Outil `mealmanager_list_wines` (lecture) : input `{ enriched?: boolean }`, appelle `ctx.container.listWines`, filtre sur `aiEnrichedAt`, renvoie `{ id, name, domain, region, vintage, color, isEnriched }[]`
- [x] 3.3 Outil `mealmanager_get_wine` (lecture) : input `{ wineId: uuid }`, appelle `ctx.container.getWine`, renvoie la vue du vin ; `WineNotFoundError` → `isError`
- [x] 3.4 Outil `mealmanager_save_wine_enrichment` (write) : input `wineId` + `WineEnrichmentSchema`, `householdId` depuis le PAT, description portant la consigne de recherche partagée ; `WineNotFoundError` → `isError` ; renvoie la vue mise à jour
- [x] 3.5 Enregistrer `registerWineTools` dans `server/routes/mcp/tools/index.ts`

## 4. Tests

- [x] 4.1 Test d'intégration `SaveWineEnrichmentUseCase` (in-memory) : succès + `aiEnrichedAt` daté, vin d'un autre foyer (404), ré-enrichissement (écrase + rafraîchit), champ omis inchangé, garde incohérente neutralisée
- [x] 4.2 Test partagé `applyWineEnrichment` : mêmes valeurs → état identique quel que soit l'appelant (garantie DRY)
- [x] 4.3 Smoke test MCP des trois outils : scoping PAT (`householdId` du PAT), `list_wines` filtre `enriched`, `save_wine_enrichment` persiste et ignore un `householdId` fourni, `wineId` cross-foyer → `isError`
- [x] 4.4 Vérifier/mettre à jour le test de catalogue MCP (nombre d'outils + présence des 3 outils vin avec le bon `kind`)

## 5. Vérification

- [x] 5.1 `pnpm lint`, `pnpm typecheck`, `pnpm test`
- [x] 5.2 `openspec validate add-mcp-wine-enrichment --all`
