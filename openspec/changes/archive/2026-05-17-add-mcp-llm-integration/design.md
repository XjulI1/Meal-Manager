# Design : Intégration MCP avec PAT

## Vision globale

Exposer Meal Manager comme un **outil agent-compatible** sans engager le projet sur un client LLM en particulier. Le standard cible est **MCP** (Model Context Protocol) en transport HTTP/SSE multi-tenant. Une seule infra côté serveur ; tous les clients (Claude Desktop, Cursor, Home Assistant, scripts Gemini API) consomment le même endpoint.

```
┌─────────────────┐        Bearer PAT        ┌──────────────────────────┐
│ Claude Desktop  │ ───────────────────────▶ │                          │
│ Cursor          │                          │  POST /mcp               │
│ Home Assistant  │ ◀───────────────────────│  (StreamableHTTPTransport) │
│ Script Gemini   │       JSON-RPC 2.0       │                          │
│ Bridge Nest     │                          │  ┌────────────────────┐  │
└─────────────────┘                          │  │ buildMcpServer()   │  │
                                             │  │  ├ list_inventory  │  │
                                             │  │  ├ list_recipes    │  │
                                             │  │  ├ get_menu        │  │
                                             │  │  └ ... (8 outils)  │  │
                                             │  └────────────────────┘  │
                                             │            │             │
                                             │            ▼             │
                                             │   container.<useCase>    │
                                             │            │             │
                                             │            ▼             │
                                             │     Drizzle / MariaDB    │
                                             └──────────────────────────┘
```

## Décisions structurantes

### D1. Transport MCP : StreamableHTTP stateless

**Choisi** : `StreamableHTTPServerTransport` avec `sessionIdGenerator: undefined` (mode stateless).

**Alternatives écartées** :
- **stdio** : oblige chaque utilisateur à installer un binaire local et à configurer Claude Desktop avec un PAT par instance. Ne marche pas pour Home Assistant ni pour un bridge serveur.
- **Stateful SSE classique** : nécessite un store de sessions distribué (Redis) dès qu'on a plus d'une instance du serveur. Overkill pour la v1.
- **Custom JSON-RPC sans SDK** : on perdrait la conformité MCP (capabilities, framing, futures évolutions de la spec).

Le mode stateless rend chaque POST autonome ; pas de continuité d'état entre appels, pas de Redis. Quand on aura besoin de sessions longues (souscriptions, streaming de progress), on bascule en stateful + Redis dans un change séparé.

### D2. Hash des PAT : SHA-256 (pas Argon2id)

Les PAT sont générés par `crypto.randomBytes(22).toString('base64url')` : **22 octets de hasard = 176 bits d'entropie**. Bien au-delà du seuil de brute-force réalisable, même avec un attaquant disposant du hash.

Argon2id existe pour défendre des secrets à **faible entropie** (mots de passe humains) contre la brute-force offline. Sur un secret 176-bit aléatoire, il n'apporte rien :
- Sécurité : équivalente à SHA-256 (le coût d'attaque est dominé par l'entropie, pas par le hash).
- Coût : Argon2id au profil OWASP (m=19456 KiB, t=2) coûte ~80ms/appel. À chaque requête MCP, c'est un vecteur de DoS trivial. SHA-256 coûte quelques microsecondes.

Décision : **SHA-256 hex** stocké en `varchar(64) UNIQUE`. Argon2id reste exclusivement pour `User.passwordHash`.

### D3. Format de token et préfixe

```
mm_pat_<22 chars base64url>
```

Exemple : `mm_pat_AbCdEfGhIjKlMnOpQrStUv` (~30 caractères au total).

- `mm_pat_` : identifie visuellement un PAT Meal Manager (utile dans les logs accidentels — on ne loggue pas le plaintext, mais si une fuite arrive, on identifie immédiatement la nature).
- `prefix char(8)` stocké en clair : les 8 premiers caractères du plaintext (après le préfixe). Permet à l'UI d'afficher `mm_pat_AbCdEfGh…` pour qu'un utilisateur reconnaisse ses tokens.

### D4. Scoping : PAT lié à un foyer précis

Un PAT est créé pour **le foyer actuel de l'utilisateur** au moment de la création. Si l'utilisateur quitte ce foyer puis en rejoint un autre, ses anciens PATs ne donnent pas accès au nouveau foyer (la table FK cascade sur `households` les supprime même).

Architecture conséquence : le use case `CreatePersonalAccessToken` a besoin de connaître le foyer courant de l'utilisateur. Plutôt que d'importer `family` depuis `platform` (interdit par la règle d'isolation domain), on définit dans `platform/domain/ports/` :

```ts
export interface IUserHouseholdResolver {
  resolveForUser(userId: string): Promise<{ householdId: string } | null>
}
```

Implémentation `family/infrastructure/family-user-household-resolver.adapter.ts` qui délègue à `IHouseholdRepository.findForUser`. Branchement dans le container — `platform` ne dépend de rien.

### D5. Authentification MCP : Bearer token, pas cookie

Le helper `requireHouseholdFromPAT(event)` :
1. Lit `Authorization: Bearer <plaintext>` depuis `getHeader(event, 'authorization')`.
2. Si absent ou malformé → 401 avec `WWW-Authenticate: Bearer realm="meal-manager-mcp"`. Ce header est crucial : il signale aux clients qu'une auth Bearer est attendue, et **prépare la migration OAuth 2.1 future** sans casser les PAT (les deux schémas Bearer coexistent).
3. Calcule SHA-256 du plaintext, lookup dans la table.
4. Si valide → met à jour `lastUsedAt` (fire-and-forget — l'échec d'update n'invalide pas la requête), renvoie `{ userId, householdId }`.

**Pourquoi pas réutiliser `requireHouseholdMember` ?** L'unification (« essaye cookie, sinon bearer ») élargirait par accident la surface d'auth de toutes les routes existantes. Garder les deux séparés : routes web cookie-only, route MCP bearer-only. Pas de risque de confusion.

### D6. Lazy-create de `GetMenuByWeekUseCase`

Le tool `mealmanager_get_menu_for_week` appelle `getMenuByWeek`, qui crée un menu vide si aucun n'existe pour la semaine demandée. Strictement, c'est une écriture dans un outil read-only.

Trois options :
- **(a)** Garder tel quel et le mentionner dans la description du tool. **Choisi** — l'effet de bord est idempotent (création d'une ligne vide réutilisable) et identique au comportement web. Diverger créerait du code dual.
- (b) Créer un `findMenuByWeek` pur lecture, et un tool d'écriture séparé. À reconsidérer si des audits remontent ce comportement.
- (c) Renommer le tool en `mealmanager_get_or_create_menu_for_week`. Trop verbeux pour la valeur ajoutée.

### D7. Aucun `householdId` en input des tools

Tous les schémas d'input des tools MCP **excluent strictement** `householdId`. La valeur vient du PAT, point. Cela empêche par construction qu'un client (malicieux ou buggué) tente de lire les données d'un autre foyer en passant un autre ID.

Conséquence côté code : les use cases prennent `householdId` en argument, mais le binding "PAT → householdId" se fait dans le handler MCP, jamais exposé au LLM.

### D8. Architecture du module MCP

```
server/
└── routes/
    └── mcp/
        ├── index.ts            # handler HTTP : auth + dispatch SDK
        └── tools/
            ├── index.ts        # exports registerAllTools(server, ctx)
            ├── inventory.ts    # 1 tool
            ├── recipes.ts      # 2 tools
            ├── menu.ts         # 1 tool
            ├── shopping.ts     # 1 tool
            ├── ingredients.ts  # 2 tools
            └── household.ts    # 1 tool
```

Chaque module tools expose une fonction `register(server, ctx)` où `ctx = { container, householdId, userId }`. Le handler MCP construit un `McpServer` par requête (stateless), appelle `registerAllTools(server, ctx)`, puis bridge la requête via `StreamableHTTPServerTransport`.

**Pourquoi un McpServer par requête plutôt que partagé ?** En mode stateless, le SDK consomme la requête et le repsonse une seule fois. Un serveur partagé poserait des problèmes de concurrence sur l'état interne du transport. Le coût d'instanciation est négligeable.

### D9. Format de retour des tools

Convention MCP : `{ content: [{ type: 'text', text: JSON.stringify(...) }] }`. On sérialise le résultat du use case en JSON pretty-printed (`JSON.stringify(value, null, 2)`) pour faciliter la lecture LLM.

Les dates `Date` → ISO 8601 par `JSON.stringify` (sérialisation native). Les enums et value objects sont déjà sérialisés par les views renvoyées par les use cases.

### D10. `llms.txt` vs `llms-full.txt`

- `llms.txt` : ~500 mots max, sommaire navigable, liens vers `/llms-full.txt` et `/mcp`.
- `llms-full.txt` : ~2000 mots, détail des 8 outils avec leurs paramètres et exemples, comment obtenir un PAT, snippet de config Claude Desktop, mention de Home Assistant comme pont vers la voix.

Servis statiquement depuis `public/`. Aucun code, aucune route — Nitro sert `public/` à la racine automatiquement.

Génération dynamique depuis OpenSpec spécifiquement écartée pour la v1 (coût > valeur ; à reconsidérer si le contenu drift).

### D11. Voix sur Google Home / Nest

Aucun chemin direct aujourd'hui (mai 2026) entre un Nest et un MCP server tiers. Les options réelles **documentées** dans le README :
1. **Home Assistant comme bridge** : HA supporte les serveurs MCP en client, et expose ses entités à Google Assistant via l'intégration officielle. Pratique pour « OK Google, qu'est-ce qu'il y a dans le frigo ? ».
2. **Client vocal custom** : webhook vocal utilisant Gemini API + MCP comme tool.
3. **Attendre Gemini Extensions** : Google a annoncé l'ouverture aux MCP servers tiers, calendrier flou.

Aucun code spécifique « Nest » dans Meal Manager. Le backend MCP est le bon investissement quoi qu'il en soit.

### D12. Futur OAuth 2.1

La spec MCP officielle pousse vers OAuth 2.1 avec Dynamic Client Registration. On le différe pour v2 sans rupture grâce à :
- Réponse `WWW-Authenticate: Bearer realm=...` : compatible OAuth (les deux schémas Bearer coexistent).
- Séparation des ports : `IPersonalAccessTokenRepository` reste, on ajoute `IAccessTokenRepository` (OAuth tokens à durée courte) en parallèle. Les tools n'ont pas à connaître la différence — ils consomment juste `{ userId, householdId }`.
- `requireHouseholdFromPAT` deviendra `requireHouseholdFromBearer` qui essaie OAuth d'abord, PAT en fallback.

## Risques et mitigations

| Risque | Mitigation v1 |
|---|---|
| Logging accidentel du Bearer token | Aucun logger structuré ajouté ici ; quand pino/winston arrivera, `redact: ['req.headers.authorization']`. Code review check sur tout `console.log` dans `server/routes/mcp/` et le helper PAT. |
| DoS sur `/mcp` | Best-effort en mémoire à ajouter dans un change suivant. Pour v1, accepter ce risque (déploiement personnel, pas de surface publique critique). |
| Plaintext renvoyé à la création accidentellement re-loggé | Renvoi un seul champ `plaintext`, ne pas le mettre dans le path/query. Frontend prévient l'utilisateur que le plaintext ne sera pas re-affiché. |
| PAT volé donne accès complet en lecture au foyer | Acceptable : c'est exactement ce qu'on veut (lecture seule, révocable depuis `/settings/tokens`). |
| `getMenuByWeek` effet de bord | Doc dans description tool ; comportement aligné avec le web. |
| Migration vers OAuth 2.1 plus tard | Voir D12. Headers et ports déjà préparés. |
