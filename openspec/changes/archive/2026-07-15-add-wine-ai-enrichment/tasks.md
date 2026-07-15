## 1. Base de données

- [x] 1.1 Ajouter les colonnes `aromas` (text), `food_pairings` (text), `ai_enriched_at` (timestamp nullable) au schéma Drizzle `server/database/schema/wine-cellar.ts` (table `wines`)
- [x] 1.2 Écrire la migration SQL à la main dans `server/database/migrations/` + entrée dans le journal Drizzle (ne pas utiliser `db:generate`)

## 2. Domaine (wine-cellar)

- [x] 2.1 Étendre `WineProps`/`WineAttributes` avec `aromas: string | null`, `foodPairings: string | null`, `aiEnrichedAt: Date | null` dans `domain/entities/wine.entity.ts` (constructeur, `create`, `rehydrate`, `withAttributes`)
- [x] 2.2 Créer le port `domain/ports/wine-enricher.port.ts` : `IWineEnricher` avec `enrich(facts) → WineEnrichmentResult` (tous champs optionnels : `gardeMin?`, `gardeMax?`, `aromas?`, `foodPairings?`), + types `WineFacts`/`WineEnrichmentResult`
- [x] 2.3 Vérifier que `assertGardeWindow` reste appliqué lors de l'enrichissement (fenêtre incohérente non persistée)

## 3. Application

- [x] 3.1 Mettre à jour `application/wine-attributes.ts` (`WineInput`/`WinePatch`, `createWineAttributes`, `mergeWineAttributes`) pour les nouveaux champs, avec sémantique `undefined` = inchangé
- [x] 3.2 Créer `application/use-cases/enrich-wine.use-case.ts` : charge le vin (scoped foyer, 404 sinon), appelle `IWineEnricher`, neutralise une fenêtre de garde incohérente, applique le résultat via `withAttributes`, positionne `aiEnrichedAt = now`, persiste via `wineRepo.update`, renvoie la vue

## 4. Infrastructure

- [x] 4.1 Mettre à jour `infrastructure/mappers/wine.mapper.ts` (`toDomain`/`toPersistence`) pour les 3 nouveaux champs
- [x] 4.2 Mettre à jour `infrastructure/repositories/drizzle-wine.repository.ts` (`update().set({...})`) avec les nouvelles colonnes
- [x] 4.3 Créer l'adapter `infrastructure/adapters/anthropic-wine-enricher.ts` (calqué sur `anthropic-wine-label-extractor.ts`) : boucle agentique `tools = [web_search, enrich_wine]`, `tool_choice: auto`, jusqu'à l'émission de `enrich_wine` ; plafond de tours + `max_tokens` ; prompt interdisant l'invention ; validation Zod du payload
- [x] 4.4 Ajouter la config effort dédiée si besoin (réutiliser `anthropic-config.ts`) et le tool schema `enrich_wine`

## 5. DTO et vues

- [x] 5.1 Exposer `aromas`, `foodPairings`, `aiEnrichedAt` dans `WineViewSchema` (`shared/dto/wine-cellar.ts`)
- [x] 5.2 Définir le schéma Zod de sortie de l'enrichisseur (validation du tool `enrich_wine`)

## 6. Transport HTTP + DI

- [x] 6.1 Créer la route `server/api/cave/wines/[id]/enrich.post.ts` avec `requireHouseholdMember`, appelant `container.enrichWine.execute({ householdId, wineId })`, mappant l'erreur « vin introuvable » en 404
- [x] 6.2 Instancier `AnthropicWineEnricher` et `EnrichWineUseCase` dans `server/plugins/container.ts` (config Anthropic partagée)
- [x] 6.3 Ajouter `enrichWine` à l'interface `Container` (`server/types/container.ts`)

## 7. Front

- [x] 7.1 Ajouter `enrichWine(id)` au composable `app/composables/useApiWineCellar.ts`
- [x] 7.2 Ajouter dans la modale détail du vin (`app/pages/cave/[id].vue` / composant) : bouton « Rechercher via l'IA » / « Relancer », spinner pendant l'appel, affichage des arômes et accords, badge « Recherché le … » d'après `aiEnrichedAt`

## 8. Tests

- [x] 8.1 Test unitaire entité `Wine` : nouveaux champs + invariant garde inchangé
- [x] 8.2 Test d'intégration `EnrichWineUseCase` avec un `IWineEnricher` en mémoire : succès, vin d'un autre foyer (404), champ non trouvé laissé inchangé, relance, fenêtre incohérente neutralisée
- [x] 8.3 Smoke test HTTP de la route `enrich`

## 9. Vérification

- [x] 9.1 `pnpm lint` (dont règle d'isolation domaine), `pnpm typecheck`, `pnpm test`
- [x] 9.2 `openspec validate add-wine-ai-enrichment --all`
