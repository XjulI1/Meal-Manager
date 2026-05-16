# Proposal: Intégration LLM via serveur MCP

## Why

Aujourd'hui Meal Manager n'est utilisable que depuis le front Nuxt. Pour le piloter depuis un LLM (Claude, Gemini, futur bridge Google Home/Nest via Home Assistant, scripts), il manque deux briques :

1. **Une auth utilisable par un agent headless** — l'auth actuelle est uniquement par cookie de session, inadaptée aux clients non-navigateur.
2. **Un endpoint conforme à un protocole standard** que les clients LLM savent consommer sans intégration sur-mesure par client.

Le **Model Context Protocol** (MCP) est la lingua franca émergente : Claude Desktop, Cursor, Home Assistant, et progressivement la majorité des clients LLM le supportent nativement. Exposer un endpoint MCP HTTP/SSE multi-tenant authentifié par PAT permet de débloquer en une seule fois l'ensemble de ces usages, sans engager le projet sur un client en particulier.

Choix complémentaire : `llms.txt` et `llms-full.txt` servis à la racine pour la discoverabilité (équivalent `robots.txt` pour les LLM — coût quasi nul).

OAuth 2.1 (spec MCP officielle) est explicitement différé en v2 : il représente 3–4× le code d'auth pour un gain marginal sur l'usage cible (PAT scopé foyer, révocable, fonctionnel pour 100 % des clients).

## What Changes

### Nouveau bounded context : MCP transport

- **Endpoint MCP** : `server/routes/mcp/index.ts` — handle GET/POST/DELETE sur `/mcp`, conforme au transport `StreamableHTTP` (POST = requête, SSE optionnel sur GET, DELETE = session terminate). Mode **stateless** en v1 (chaque POST autonome, pas de session distribuée).
- **8 outils en lecture seule** mappés sur les use cases existants : `mealmanager_list_inventory`, `mealmanager_list_recipes`, `mealmanager_get_recipe`, `mealmanager_get_menu_for_week`, `mealmanager_get_shopping_list`, `mealmanager_list_ingredients`, `mealmanager_get_ingredient`, `mealmanager_get_household`.
- Le `householdId` n'est **jamais** accepté en input — il est injecté depuis le PAT. Sécurité garantie au niveau du transport, pas au niveau de l'outil.

### Nouveau dans `platform` : Personal Access Tokens

- **Entité** `PersonalAccessToken` : `(id, userId, householdId, name, tokenHash, prefix, createdAt, lastUsedAt, revokedAt)`.
- **Format plaintext** : `mm_pat_<22 chars base64url>` (~30 chars). Renvoyé une seule fois à la création.
- **Hash** : SHA-256 (et non argon2id — voir design.md §D2 pour la justification).
- **4 use cases** : `CreatePersonalAccessToken`, `RevokePersonalAccessToken`, `ListPersonalAccessTokens`, `AuthenticatePersonalAccessToken`.
- **Port** `IUserHouseholdResolver` (platform domain) — résout `userId → householdId` sans coupler platform à family ; adapter dans `family/infrastructure/`.

### Routes HTTP cookie-auth pour la gestion des tokens

- `GET /api/me/tokens` — liste les tokens du membre (sans hash, sans plaintext).
- `POST /api/me/tokens` — crée un token, renvoie plaintext **une seule fois**.
- `DELETE /api/me/tokens/:id` — révoque.

### Helper auth

- `requireHouseholdFromPAT(event)` ajouté à `server/utils/require-household.ts`. Lit `Authorization: Bearer`, appelle `authenticatePersonalAccessToken`, renvoie le même `HouseholdMembershipContext` que `requireHouseholdMember`. Réponse `WWW-Authenticate: Bearer realm="meal-manager-mcp"` en 401 — compatible OAuth 2.1 futur.

### Frontend `/settings/tokens`

- Page de gestion : liste tokens, créer (modal qui affiche plaintext copy-to-clipboard une seule fois), révoquer.
- Lien dans le menu utilisateur (AppHeader).

### Discoverabilité

- `public/llms.txt` (sommaire) et `public/llms-full.txt` (détail : liste des outils, schéma d'auth, exemple de config Claude Desktop / Home Assistant).

### Base de données

- Nouvelle table `personal_access_tokens` (FK cascade sur `users` et `households`).
- Migration manuscrite `0002_add_personal_access_tokens.sql` (convention du projet).

**Hors scope explicite v1** :
- Outils MCP d'écriture (création/modification/suppression).
- OAuth 2.1 / Dynamic Client Registration.
- PAT multi-foyers (un PAT = un foyer ; si l'utilisateur en a plusieurs, il crée plusieurs PATs).
- Rate-limiting distribué (un best-effort en mémoire pourra suivre dans un autre change).
- Génération dynamique de `llms-full.txt` depuis OpenSpec.
- MCP resources / prompts (uniquement des tools en v1).

## Capabilities

### New Capabilities

- `mcp` : endpoint Model Context Protocol HTTP/SSE multi-tenant exposant les opérations de lecture du foyer aux clients LLM, authentifié par Personal Access Token.

### Modified Capabilities

- `platform` : ajout du flux Personal Access Token (création, listing, révocation, authentification).

## Impact

**Code créé** :
- `server/contexts/platform/{domain,application,infrastructure}/` — entité PAT, 4 use cases, repo Drizzle, generator crypto, mappers.
- `server/contexts/family/infrastructure/family-user-household-resolver.adapter.ts` — adapter de l'`IUserHouseholdResolver` port.
- `server/routes/mcp/index.ts` — endpoint MCP.
- `server/api/me/tokens/{index.get,index.post,[id].delete}.ts` — CRUD cookie-auth.
- `shared/dto/personal-access-tokens.ts`.
- `app/pages/settings/{index,tokens}.vue` + `app/composables/useApiTokens.ts`.
- `public/llms.txt`, `public/llms-full.txt`.
- Tests : `tests/integration/platform/{create,list,authenticate,revoke}-personal-access-token.use-case.test.ts`, `tests/integration/http/{tokens,mcp}-routes.test.ts`, fakes en mémoire.

**Code modifié** :
- `server/plugins/container.ts` + `server/types/container.ts` : 4 nouveaux use cases + port resolver.
- `server/utils/require-household.ts` : ajout `requireHouseholdFromPAT`.
- `server/database/schema/index.ts` : export du nouveau schéma.
- `app/components/AppHeader.vue` : lien « Paramètres » dans le menu utilisateur.
- `tests/integration/http/nuxt-runtime-stubs.ts` : `makeEvent` étendu pour accepter `headers`.
- `README.md`, `CLAUDE.md` : encart « Intégration LLM (MCP) ».

**DB** : 1 nouvelle table. Aucune modification de table existante.

**API** : 4 nouvelles routes (`/api/me/tokens` × 3 + `/mcp`). Routes existantes inchangées.

**Dépendances npm** : ajout de `@modelcontextprotocol/sdk` (officiel Anthropic).

**Tests** : 4 tests unitaires use cases + 2 tests intégration routes HTTP (cookie tokens + MCP). Couvre auth, isolation foyer, révocation, payload validation.
