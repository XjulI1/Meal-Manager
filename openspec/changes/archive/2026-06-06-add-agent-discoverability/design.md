# Design : Discoverability « agent-ready »

## Vision globale

Annoncer de manière standard et machine-lisible que Meal Manager expose un endpoint MCP. Aucune logique métier touchée : on opère uniquement au niveau **transport** (fichiers statiques sous `public/` et routes/middleware Nitro sous `server/`). Le canal agent légitime reste **`POST /mcp` avec PAT** ; les ressources de découverte ajoutées ici ne déverrouillent pas de nouvelles capacités, elles rendent l'existant trouvable.

```
┌──────────────────────────────────────────────────────────────────┐
│ Agent / scanner agent-readiness (isitagentready.com, GPT-search) │
└──────────────────────────────────────────────────────────────────┘
        │
        │   1. GET /robots.txt          → Disallow: / pour tous bots IA + *
        │                                  (politique « tout bloquer », app privée)
        │
        │   2. GET /                    → Header HTTP `Link: …; rel="api-catalog"`
        │
        │   3. GET /.well-known/api-catalog
        │                              → application/linkset+json
        │                                  ├─ item     /mcp     (profile MCP)
        │                                  ├─ service-desc /openapi-mcp.yaml
        │                                  └─ related  /llms.txt /llms-full.txt
        │
        │   4. GET /openapi-mcp.yaml    → OpenAPI 3.1, securityScheme bearerAuth,
        │                                  8 operationId mealmanager_*
        ▼
   POST /mcp avec Authorization: Bearer mm_pat_...  (déjà en place)
```

## Décisions structurantes

### D1. Politique robots.txt : « tout bloquer » plutôt que « training/search split »

**Choisi** : Disallow `/` pour tous les bots IA listés + `User-agent: *`.

**Alternatives écartées** :
- **Bloquer training, autoriser search** (`GPTBot` bloqué mais `OAI-SearchBot` autorisé). Pertinent pour un site marketing public — pas pour Meal Manager qui est **entièrement derrière auth**. Aucune page HTML n'a de valeur indexable.
- **Allow `/` partout, laisser auth gérer**. Acceptable techniquement, mais c'est une mauvaise hygiène : on consomme du quota crawl, on multiplie les logs 401, et on laisse penser que l'app accueille des bots.

Le canal agent légitime — `POST /mcp` avec PAT — n'est pas affecté par `robots.txt` (les agents MCP ne consultent pas robots.txt avant d'appeler un endpoint pour lequel un utilisateur leur a fourni un PAT).

### D2. RFC 9727 (`/.well-known/api-catalog`) plutôt qu'OpenAPI seul

**Choisi** : exposer un linkset RFC 9727 **en plus** de l'OpenAPI.

**Pourquoi** : RFC 9727 est conçu pour la **discovery** (« où sont les APIs de ce domaine ? ») ; OpenAPI est conçu pour la **description** d'une API (« quels sont les paths et schemas ? »). Les deux sont complémentaires :
- Un agent générique scanne `/.well-known/api-catalog` pour découvrir qu'il existe un endpoint MCP à `/mcp` et qu'une description OpenAPI est servie à `/openapi-mcp.yaml`.
- Un client MCP utilise directement `/mcp` (il connaît déjà le protocole).
- Un outil de génération de code ou de documentation lit l'OpenAPI.

**Format** : `application/linkset+json` (RFC 9264), c'est le seul format obligatoire de RFC 9727.

### D3. Link header global plutôt que sur la racine seule

**Choisi** : middleware Nitro qui pose le header `Link` sur **toutes** les réponses, avec un court-circuit explicite pour les requêtes commençant par `/mcp`.

**Alternatives écartées** :
- **Header sur `/` seul** : un crawler qui débarque sur `/api/...` ou `/login` ne verra pas l'annonce. Coût marginal du global = 1 string concat par requête.
- **Pas de header, juste `/.well-known/api-catalog`** : RFC 9727 §3 *recommande* explicitement le header `Link; rel="api-catalog"` pour les réponses qui ne sont pas le catalogue lui-même.

**Pourquoi le court-circuit `/mcp`** : `server/routes/mcp/index.ts` utilise le SDK MCP qui écrit directement sur `event.node.res` (cf. ligne 39 du fichier). Injecter un header après que le SDK a déjà commencé à écrire crée un comportement indéfini. Plus simple : `if (event.path.startsWith('/mcp')) return`.

### D4. OpenAPI statique plutôt que généré

**Choisi** : fichier YAML écrit à la main dans `public/openapi-mcp.yaml`.

**Alternatives écartées** :
- **Génération depuis les schémas Zod via `zod-to-openapi`** : ajoute une dépendance, un step de build, et un risque de divergence si les schémas Zod changent sans régénération. Pour 8 tools très stables, ROI faible.
- **Génération à la volée par un endpoint Nitro** : même problème de couplage, plus une latence ajoutée au moment du serve.

Le fichier statique sera révisé à la main si un tool MCP change — c'est le même cycle de vie que `llms-full.txt`. Test d'intégration vérifie qu'il contient les 8 `operationId` `mealmanager_*` et le `securityScheme bearerAuth`, ce qui détecte une dérive grossière.

### D5. OAuth 2.1 / RFC 8414 : toujours différé

**Conservé du design MCP initial (D5)** : pas de `/.well-known/oauth-authorization-server`. Cohérent avec la décision initiale de différer OAuth 2.1 en v2. Le `securityScheme` OpenAPI est `bearerAuth` (HTTP Bearer), sans flow OAuth.

### D6. Profile MCP dans le linkset

Le linkset utilise `profile: "urn:ietf:params:mcp:transport:streamable-http"` pour qualifier le lien vers `/mcp`. Ce n'est pas (encore) un URN enregistré IANA ; c'est une convention interne lisible par un humain et par un agent qui sait que `urn:…:mcp:transport:streamable-http` signifie « Streamable HTTP MCP endpoint ». Quand un URN officiel sera publié par le groupe MCP, on l'adoptera dans un patch.

## Risques

- **Crawlers IA non conformes** (Bytespider en tête, ~50% du trafic agent ignore robots.txt en 2026). robots.txt reste un signal légitime ; pour bloquer effectivement il faudrait un middleware d'application qui filtre les User-Agents. Hors scope ici — l'authentification rend ces accès stériles de toute façon.
- **OpenAPI drift** : si un tool MCP évolue sans qu'on mette à jour `openapi-mcp.yaml`, les agents reçoivent une description périmée. Mitigation : test d'intégration vérifie la présence des 8 `mealmanager_*`. Une dérive de schéma fin (ex: nouveau filtre optionnel) ne sera pas détectée — accepté pour v1.
- **Conflit Link header / SDK MCP** : court-circuit explicite, mais on garde un test qui vérifie que `POST /mcp` n'a pas de header `Link` parasitaire.
