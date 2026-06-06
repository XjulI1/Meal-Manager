## Context

Meal Manager suit une architecture hexagonale par bounded context. Le contexte `catalog` (recettes) déclare déjà deux ports d'extension non implémentés : `IRecipeImporter` (import depuis URL → `RecipeDraft`) et `IRecipeGenerator` (génération IA → `RecipeDraft[]`). Le transport MCP (`server/routes/mcp/`) est le précédent d'un adapter d'entrée qui réutilise les use cases via le container. Côté front, `RecipeForm` et `useApiRecipes` couvrent déjà la création de recette ; `CreateRecipeUseCase` valide les références d'ingrédients via `IIngredientLookup.findByIds()` et **rejette** tout `ingredientId` inconnu.

Contrainte clé : une recette stocke des `ingredientId` (UUID du catalogue), alors qu'une recette produite par l'IA ne connaît que des **noms**. Il faut donc une étape de résolution noms → IDs avant tout enregistrement.

Coût : l'API Anthropic (et surtout l'outil `web_search`, facturé à la requête) implique de **conditionner l'accès** pour éviter les consommations subies.

## Goals / Non-Goals

**Goals:**
- Un chat conversationnel streaming (SSE) qui propose/co-construit des recettes via Claude, avec recherche web et citation des sources.
- Un import de recette depuis une URL (JSON-LD `Recipe`, repli extraction Claude) produisant un `RecipeDraft`.
- L'IA produit toujours un `RecipeDraft` structuré qui **pré-remplit `RecipeForm`** ; l'enregistrement passe par le flux existant après validation humaine.
- Résolution d'ingrédients « proposer puis valider » contre le catalogue du foyer.
- Accès IA **désactivé par défaut**, activable par compte via un flag en base ; endpoints IA → 403 si désactivé.
- Isolation foyer + clé API serveur-only, conformément aux conventions du projet.

**Non-Goals:**
- Pas de persistance de l'historique de conversation en v1 (API stateless, historique côté client).
- Pas d'UI d'administration pour basculer le flag IA (bascule en base via seed/`db:studio`).
- Pas d'enregistrement automatique de recette par l'IA.
- Pas d'implémentation de `IRecipeGenerator.generateFromAvailableIngredients` (suggestions depuis l'inventaire) — hors périmètre, le chat couvre le besoin.
- Pas de tests réseau réels contre Anthropic (fakes en mémoire, cohérent avec la stratégie de test existante).

## Decisions

### D1 — Messages API + tool use (et non Managed Agents)
On utilise l'API Messages d'Anthropic avec tool use, **pas** les Managed Agents. Raison : on veut exécuter nos propres effets (résolution/création contre nos use cases) dans notre backend, héberger la compute, et garder la main sur le streaming et l'auth. Les Managed Agents (boucle + conteneur hébergés par Anthropic) seraient surdimensionnés.
- **Modèle** : `claude-sonnet-4-6`, thinking adaptatif (`thinking: {type: "adaptive"}`), **streaming** obligatoire. Sonnet suffit pour de la conversation + recherche web + extraction structurée (pas de raisonnement long-horizon justifiant Opus) ; ~40 % moins cher et plus rapide, même surface d'API. Opus reste un simple changement de chaîne de modèle si besoin.
- **Recherche web** : outil server-side `web_search` (dernier identifiant de version au moment de l'implémentation), qui retourne des citations.
- **Émission du brouillon** : un outil/structured-output `propose_recipe` dont le schéma JSON correspond au `RecipeDraft` ; Claude l'appelle quand la recette est prête. Le serveur valide la sortie via Zod (`RecipeDraftSchema`).
- *Alternative écartée* : extraction structurée en un seul appel post-conversation. Moins fluide et perd le contexte multi-tours.
- *Alternative écartée* : Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`). Évalué pour le scénario « foyer unique » : techniquement faisable à faible concurrence, et son auth par abonnement (token `CLAUDE_CODE_OAUTH_TOKEN` 1 an + crédits mensuels Pro/Max à partir du 15/06/2026) pourrait éviter la facturation au token. Écarté en v1 pour deux raisons : (1) zone grise des conditions d'utilisation — l'interdiction d'« offrir le login claude.ai » ne tranche pas explicitement le cas d'un outil perso auto-hébergé mono-foyer, et il faudrait le confirmer avec Anthropic ; (2) runtime plus lourd (binaire Claude Code embarqué + sous-processus, empreinte Docker accrue). On retient la clé API + API Messages : pas d'ambiguïté, runtime léger. Le port `IRecipeChatAssistant` garde le choix réversible (cf. D2) si on veut basculer plus tard.

### D2 — Un nouveau port `IRecipeChatAssistant`, et implémenter `IRecipeImporter`
Le domaine reste pur. On ajoute `catalog/domain/ports/recipe-chat-assistant.ts` (interface du chat : prend l'historique + le contexte foyer, renvoie un flux d'événements assistant et un `RecipeDraft` optionnel). On implémente le port existant `IRecipeImporter.importFromUrl`. Les adapters Anthropic vivent dans `catalog/infrastructure/` et sont les seuls à importer `@anthropic-ai/sdk`.
- *Alternative écartée* : réutiliser `IRecipeGenerator` pour le chat. Sa signature (`generateFromAvailableIngredients`) ne modélise pas un dialogue multi-tours ; un port dédié est plus honnête.

### D3 — Le chat n'a pas d'outil « save » ; il propose un brouillon
Conformément à la décision produit, l'IA n'écrit jamais. Le seul « outil métier » exposé à Claude est `propose_recipe` (émission de brouillon). La persistance reste 100 % côté flux existant (`CreateRecipeUseCase` + création d'ingrédient), déclenchée par l'utilisateur depuis `RecipeForm`.
- Bénéfice : human-in-the-loop, réutilisation de toute la validation Zod et du picker d'ingrédients ; résout le problème des `ingredientId` sans risque.

### D4 — Résolution d'ingrédients dans un use case pur
`ResolveRecipeDraftUseCase` prend un `RecipeDraft` + `householdId`, charge les ingrédients du foyer (port de lookup existant), normalise (trim + lowercase) et matche par nom. Pour chaque ligne : soit `{ matched: ingredientId }`, soit `{ proposedNew: { name, canonicalUnit } }` où `canonicalUnit` est dérivée de la dimension de la quantité du brouillon (masse→g, volume→ml, sinon unit) via `Quantity`. Logique pure ⇒ testable unitairement, sans réseau.
- Matching v1 : égalité sur nom normalisé (pas de fuzzy/Levenshtein). Simple et prévisible ; le fuzzy pourra venir plus tard.
- La **création** des ingrédients proposés n'a lieu qu'après confirmation, via le use case de création d'ingrédient existant, au moment de la soumission du formulaire.

### D5 — Gating IA par compte (contexte `platform`)
Ajout d'une colonne `ai_enabled` (boolean, défaut `false`) sur la table users. Un helper `requireAiEnabled()` dans `server/utils/`, composable avec `requireHousehold­Member()`, lit le flag depuis la session/le repository et lève `createError({ statusCode: 403 })` si désactivé — **avant** tout appel Anthropic. Le front expose le flag via la session et masque l'entrée chat si absent.
- *Alternative écartée* : gating par foyer. Le besoin exprimé est par **compte utilisateur** (consommation individuelle).
- Défaut `false` garanti côté schéma DB **et** côté création d'utilisateur (le mapper/insert ne dépend pas d'un défaut SQL, cohérent avec la convention « pas de défaut SQL »).

### D6 — Transport SSE et DI
- `POST /api/recipes/chat` : streaming SSE, `requireHouseholdMember()` + `requireAiEnabled()`, délègue à `ChatRecipeUseCase`.
- `POST /api/recipes/import` : `ImportRecipeFromUrlUseCase`.
- Endpoint de résolution de brouillon : `ResolveRecipeDraftUseCase` (peut être appelé avant pré-remplissage du formulaire).
- Tous les adapters/use cases sont instanciés dans `server/plugins/container.ts` et exposés sur `event.context.container` ; les routes n'instancient rien directement.
- DTO Zod partagés dans `shared/dto/` : `ChatMessageSchema`, `RecipeDraftSchema`, `DraftResolutionSchema`.

### D7 — Configuration
Tout passe par `runtimeConfig` (serveur uniquement, jamais `public`), avec valeurs par défaut dans `nuxt.config.ts` et override par variables d'env **préfixées `NUXT_`** (convention Nuxt, comme `NUXT_SESSION_PASSWORD` ; pas de lecture `process.env` directe) : `NUXT_ANTHROPIC_API_KEY`, `NUXT_ANTHROPIC_MODEL` (défaut `claude-sonnet-4-6`), `NUXT_ANTHROPIC_CHAT_EFFORT` (défaut `medium`), `NUXT_ANTHROPIC_IMPORT_EFFORT` (défaut `low`). Le composition root lit `useRuntimeConfig()` et injecte clé/model/effort dans les adapters (effort validé par `parseEffort`). Dépendance `@anthropic-ai/sdk` ajoutée à `package.json`. `pnpm test` reste sans réseau : les use cases sont testés avec des fakes des ports.

### D8 — Contrôle de coût (v1)
Facturation au token ⇒ deux garde-fous, au-delà du gating par compte (levier principal, défaut off) :
- **Plafond `max_tokens`** par appel (chat et import), pour éviter une réponse qui s'emballe. Valeur raisonnable de départ : ~2 000–4 000 tokens de sortie côté chat (streaming), ajustable.
- **`effort` explicite** : Sonnet 4.6 défaut à `high` ; on cadre à `medium` pour le chat et `low` pour l'extraction d'import (mécanique), pour équilibrer qualité/coût.
- **Prompt caching (version légère)** : concevoir le préfixe (`tools` + `system`) de façon **stable et déterministe** et poser un marqueur `cache_control` ephemeral dessus, pour que les tours répétés relisent le préfixe à ~0,1× au lieu du plein tarif. Gain modeste à l'échelle d'un foyer ; sur Sonnet 4.6 le minimum cacheable est de 2 048 tokens (aucune mise en cache silencieuse — vérifier `cache_read_input_tokens`). On le fait comme bonne pratique, sans surcoût.
- **Pas de quota par compte/jour en v1** : le flag d'activation par compte suffit ; un quota pourra venir en évolution.

## Risks / Trade-offs

- **Coût/abus de l'IA** → gating par compte (défaut off) + scoping foyer + auth obligatoire ; pas d'appel anonyme. Possibilité d'ajouter quotas/rate-limit plus tard.
- **Fuite de la clé API** → clé serveur-only via `runtimeConfig`, jamais exposée au client ; les appels Anthropic ne se font que dans les adapters d'infrastructure.
- **Matching d'ingrédients imparfait (exact-match)** → on assume des faux négatifs (proposera une création là où un quasi-doublon existe) ; l'utilisateur valide dans le formulaire, donc pas de doublon silencieux. Fuzzy matching en évolution.
- **Unités incompatibles dans le brouillon** → la dérivation d'unité canonique peut être ambiguë (ex. « 1 gousse d'ail ») ; on retombe sur `unit` et l'utilisateur ajuste dans le formulaire. `CreateRecipeUseCase` reste le garde-fou final (400 si incompatible).
- **Pages sans JSON-LD / contenu trompeur à l'import** → repli extraction Claude, puis revue humaine systématique avant enregistrement ; URL invalide → 400.
- **Hallucination de recette / sources** → le brouillon n'est jamais persisté sans validation humaine ; les sources web sont affichées pour vérification.
- **Streaming SSE derrière Nitro** → utiliser le helper de streaming d'h3/Nitro ; prévoir un fallback non-streaming si nécessaire pour les tests smoke.

## Migration Plan

1. Migration Drizzle : ajout de `ai_enabled` (bool, défaut `false`) sur users ; `pnpm db:generate` puis `pnpm db:migrate`. Backfill implicite à `false` pour les comptes existants (aucun n'a l'IA tant que non basculé).
2. Déploiement : ajouter `ANTHROPIC_API_KEY` à l'environnement. Sans la clé, les endpoints IA échouent proprement (et restent de toute façon 403 pour les comptes non activés).
3. Activation : basculer `ai_enabled = true` pour les comptes pilotes via `db:studio`/seed.
4. Rollback : la fonctionnalité étant désactivée par défaut, un rollback se fait en laissant tous les comptes à `false` ; la colonne et les routes peuvent rester en place sans effet.

## Open Questions

- Faut-il afficher les citations web comme liens cliquables dans le chat dès la v1 (recommandé) ou seulement le texte ?
- Persistance future de l'historique de conversation : souhaitable pour reprendre une session ? (hors v1.)
- (Résolu) Quotas par compte/jour : **non retenus en v1** (le gating par compte suffit) ; évolution possible. Plafond `max_tokens` + prompt caching léger retenus — voir D8.
