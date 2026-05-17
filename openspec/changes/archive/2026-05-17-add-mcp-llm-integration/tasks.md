# Tasks

Checklist d'implémentation du change `add-mcp-llm-integration`. Ordonnée pour permettre une livraison incrémentale : à la fin de chaque section, l'application doit rester exécutable (`pnpm test` vert, `pnpm typecheck` OK).

## 1. Dépendance npm

- [x] 1.1 `pnpm add @modelcontextprotocol/sdk`

## 2. Shared — DTO

- [x] 2.1 Créer `shared/dto/personal-access-tokens.ts` : `CreatePersonalAccessTokenSchema`, `PersonalAccessTokenViewSchema`, `CreatedPersonalAccessTokenSchema` (avec `plaintext` renvoyé une seule fois)

## 3. Database — schéma et migration

- [x] 3.1 Créer `server/database/schema/personal-access-tokens.ts` (table `personal_access_tokens`, FK cascade users + households, index composite, unique sur `token_hash`)
- [x] 3.2 Ajouter l'export dans `server/database/schema/index.ts`
- [x] 3.3 Écrire à la main `server/database/migrations/0003_add_personal_access_tokens.sql` (cohérent avec la convention 0001 ; 0002 est occupé par `add_freezer_storage` mergé entre-temps) et mettre à jour `_journal.json`

## 4. Domain — platform PAT

- [x] 4.1 Créer `server/contexts/platform/domain/entities/personal-access-token.entity.ts` — invariants, méthodes `revoke(now)`, `markUsed(now)`, getter `isActive`
- [x] 4.2 Créer `server/contexts/platform/domain/ports/personal-access-token-repository.port.ts` (`findActiveByHash`, `findById`, `listForUser`, `save`)
- [x] 4.3 Créer `server/contexts/platform/domain/ports/token-generator.port.ts` (`generate() => { plaintext, hash, prefix }`)
- [x] 4.4 Créer `server/contexts/platform/domain/ports/user-household-resolver.port.ts` (`resolveForUser(userId)`)
- [x] 4.5 Créer les erreurs : `invalid-token.error.ts`, `token-not-found.error.ts`, `user-not-in-household.error.ts`
- [x] 4.6 Invariants de l'entité (revoke idempotent, markUsed, isActive) couverts par les tests des use cases

## 5. Application — 4 use cases

- [x] 5.1 `CreatePersonalAccessTokenUseCase` — vérifie l'utilisateur a un foyer, génère, persiste, renvoie `{ plaintext, view }`
- [x] 5.2 `ListPersonalAccessTokensUseCase` — renvoie views (sans hash)
- [x] 5.3 `RevokePersonalAccessTokenUseCase` — vérifie ownership, persiste `revokedAt`
- [x] 5.4 `AuthenticatePersonalAccessTokenUseCase` — hash plaintext, lookup actif, update `lastUsedAt`, retourne `{ userId, householdId }`
- [x] 5.5 Tests d'intégration avec fakes en mémoire (3 fichiers de test couvrant les 4 use cases)

## 6. Infrastructure

- [x] 6.1 Créer `server/contexts/platform/infrastructure/mappers/personal-access-token.mapper.ts`
- [x] 6.2 Créer `server/contexts/platform/infrastructure/repositories/drizzle-personal-access-token.repository.ts`
- [x] 6.3 Créer `server/contexts/platform/infrastructure/crypto-token-generator.ts` (`randomBytes(22).base64url` + SHA-256)
- [x] 6.4 Créer `server/contexts/family/infrastructure/family-user-household-resolver.adapter.ts` qui implémente `IUserHouseholdResolver` (cross-context — n'importe que l'interface platform)

## 7. Composition root

- [x] 7.1 Mettre à jour `server/plugins/container.ts` : instancier les 4 use cases + repos + generator + adapter
- [x] 7.2 Mettre à jour `server/types/container.ts` : exposer les 4 use cases
- [x] 7.3 `pnpm typecheck` vert

## 8. HTTP cookie-auth — gestion tokens

- [x] 8.1 Créer `server/api/me/tokens/index.get.ts` (list)
- [x] 8.2 Créer `server/api/me/tokens/index.post.ts` (create — renvoie plaintext une fois)
- [x] 8.3 Créer `server/api/me/tokens/[id].delete.ts` (revoke)
- [x] 8.4 Tests intégration `tests/integration/http/tokens-routes.test.ts`

## 9. Helper PAT

- [x] 9.1 Ajouter `requireHouseholdFromPAT(event)` à `server/utils/require-household.ts` (lit Bearer, retourne `HouseholdMembershipContext`, 401 + `WWW-Authenticate` via `setResponseHeader`)

## 10. Endpoint MCP

- [x] 10.1 Créer `server/routes/mcp/tools/inventory.ts` (1 tool : `mealmanager_list_inventory`)
- [x] 10.2 Créer `server/routes/mcp/tools/recipes.ts` (2 tools : `mealmanager_list_recipes`, `mealmanager_get_recipe`)
- [x] 10.3 Créer `server/routes/mcp/tools/menu.ts` (1 tool : `mealmanager_get_menu_for_week`)
- [x] 10.4 Créer `server/routes/mcp/tools/shopping.ts` (1 tool : `mealmanager_get_shopping_list`)
- [x] 10.5 Créer `server/routes/mcp/tools/ingredients.ts` (2 tools : `mealmanager_list_ingredients`, `mealmanager_get_ingredient`)
- [x] 10.6 Créer `server/routes/mcp/tools/household.ts` (1 tool : `mealmanager_get_household`)
- [x] 10.7 Créer `server/routes/mcp/tools/index.ts` qui exporte `registerAllTools(server, ctx)`
- [x] 10.8 Créer `server/routes/mcp/index.ts` : auth via `requireHouseholdFromPAT`, construit `McpServer`, attache `StreamableHTTPServerTransport`, dispatche
- [x] 10.9 Tests intégration `tests/integration/http/mcp-route.test.ts` — auth (401 sans bearer/avec bearer révoqué/avec scheme non-Bearer), tools (8 enregistrés, injection du `householdId` depuis le PAT, aucun input ne déclare `householdId`, dispatch correct)

## 11. Frontend

- [x] 11.1 Créer `app/composables/useApiTokens.ts`
- [x] 11.2 Créer `app/pages/settings/index.vue` (hub paramètres, redirige vers tokens)
- [x] 11.3 Créer `app/pages/settings/tokens.vue` — tableau, UModal create avec plaintext copy-once
- [x] 11.4 Ajouter lien « Paramètres » dans `app/components/AppHeader.vue`

## 12. Discoverabilité

- [x] 12.1 Créer `public/llms.txt`
- [x] 12.2 Créer `public/llms-full.txt`

## 13. Documentation

- [x] 13.1 Mettre à jour `README.md` avec section « Intégration LLM (MCP) »
- [x] 13.2 Mettre à jour `CLAUDE.md` avec courte mention du contexte PAT et de l'endpoint MCP

## 14. Test stubs

- [x] 14.1 Étendre `tests/integration/http/nuxt-runtime-stubs.ts` : `makeEvent` accepte `headers`, ajout des stubs `getHeader` et `setResponseHeader`

## 15. Vérification finale

- [x] 15.1 `pnpm lint` vert (0 erreurs, 0 warnings)
- [x] 15.2 `pnpm typecheck` vert
- [x] 15.3 `pnpm test` vert (283/283)
- [x] 15.4 `npx -y -p @fission-ai/openspec@latest openspec validate add-mcp-llm-integration` vert

## Vérification manuelle (déploiement staging)

- [x] `pnpm db:migrate` applique sans erreur la migration `0003` contre la base staging (validé sur `meal-stag.xju.fr` après reset du `__drizzle_migrations` qui contenait un état transitoire)
- [x] Création + copie d'un PAT depuis `/settings/tokens` OK ; appel `curl` à `/mcp` (avec `Accept: application/json, text/event-stream`) renvoie bien les 8 outils via `tools/list` ; `tools/call` retourne les données du foyer du PAT
- [x] Branchement Claude Desktop sur `/mcp` avec PAT en header — les 8 outils apparaissent et fonctionnent
- [x] `llms.txt` et `llms-full.txt` servis correctement à la racine
