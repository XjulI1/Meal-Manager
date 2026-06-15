## Context

Le contexte `catalog` connaît aujourd'hui deux niveaux d'objet recette :

1. **`Recipe`** (entité persistée, agrégat racine) : titre obligatoire (1–200), instructions obligatoires (≤ 10 000), `servings` entier 1–50, **≥ 1 ingrédient résolu** (`ingredientId` + `Quantity` en unité canonique `g`/`ml`/`unit`). Tables `recipes` + `recipe_ingredients` (clé `(recipeId, position)`).
2. **`RecipeDraft`** (type **éphémère**, non persisté) défini dans `domain/ports/recipe-importer.ts` : `{ title, instructions, servings?, ingredients: { name, quantity?, raw? }[], sourceUrl? }`. Produit par les 3 modes IA (chat SSE `POST /api/recipes/chat`, import URL `POST /api/recipes/import`, import photo `POST /api/recipes/import-photo`), résolu contre le catalogue par `ResolveRecipeDraftUseCase`, puis utilisé pour **préremplir le formulaire**. Rien n'est sauvegardé tant que l'utilisateur ne valide pas via `POST /api/recipes`.

Le besoin : **persister un brouillon côté serveur, par foyer**, quelle que soit son origine (saisie manuelle, IA, agent MCP), pour qu'il survive aux changements de page/appareil et soit repris plus tard.

Contraintes du projet (rappel) : architecture hexagonale `infrastructure → application → domain` ; domaine sans dépendance externe ; isolation foyer via `householdId` explicite ; HTTP via `requireHouseholdMember()`, MCP via `requireHouseholdFromPAT()` ; DI par `server/plugins/container.ts` ; quantités canoniques via le VO `Quantity`.

## Goals / Non-Goals

**Goals:**
- Persister des brouillons de recette par foyer, avec CRUD complet, partagés entre membres du foyer.
- Tracer l'**origine** de chaque brouillon (`manual`, `ai-chat`, `ai-url`, `ai-photo`, `mcp`).
- Permettre aux 3 modes IA et à un agent MCP d'alimenter le store de brouillons **sans** modifier le comportement de l'assistant IA existant.
- Garder un brouillon volontairement **permissif** : champs optionnels, ingrédients en texte libre (pré-résolution), pour pouvoir sauvegarder un travail en cours.
- Réutiliser le flux de promotion existant (résolution d'ingrédients + `POST /api/recipes`).

**Non-Goals:**
- Pas de versioning/historique des brouillons (un brouillon = un état mutable courant).
- Pas de collaboration temps réel ni de verrou d'édition concurrent (last-write-wins).
- Pas d'endpoint de promotion transactionnel dédié en v1 (la promotion = résolution + create-recipe + delete draft, orchestrée côté client).
- Pas de génération automatique de brouillons par l'IA sans action explicite (l'assistant reste éphémère).
- Pas de partage inter-foyers ni de brouillons « publics ».

## Decisions

### D1 — Le brouillon est une entité persistée distincte de `Recipe`
Nouvelle entité `RecipeDraft` (agrégat racine, contexte `catalog`) plutôt que des colonnes nullables ajoutées à `recipes`. Un brouillon a des invariants différents (tout optionnel, ingrédients non résolus) ; le mélanger avec `Recipe` polluerait les invariants stricts de la recette publiée.
- **Alternative écartée** : un flag `status: draft|published` sur `recipes`. Rejeté : forcerait à relâcher les contraintes NOT NULL et `ingredientId` de `recipes`, et les requêtes de menu/courses devraient partout filtrer les brouillons.

### D2 — Ingrédients de brouillon en **texte libre**, hors unité canonique
Les ingrédients d'un brouillon sont stockés tels que `RecipeIngredientDraftSchema` : `{ name (1–200), quantity?: { value, unit (texte libre ≤ 40) }, raw? (≤ 300) }`. **Dérogation assumée** à la règle « toujours en unité canonique » : un brouillon est par nature pré-résolution (l'IA renvoie « 2 gousses d'ail », « une pincée de sel »). La conversion vers `Quantity`/unités canoniques se fait **uniquement à la promotion**, via le `ResolveRecipeDraftUseCase` puis `CreateRecipeUseCase` déjà en place.
- Stockage : table `recipe_draft_ingredients(draftId, position, name, quantity_value DECIMAL(10,2) NULL, quantity_unit VARCHAR(40) NULL, raw VARCHAR(300) NULL)`, PK `(draftId, position)`.
- **Alternative écartée** : réutiliser `recipe_ingredients` (canonique). Rejeté : impossible de stocker un ingrédient non encore rattaché au catalogue.

### D3 — Levée de la collision de nom : `RecipeDraft` (éphémère) → `RecipeDraftContent`
La nouvelle **entité persistée** prend le nom `RecipeDraft`. Le type **éphémère** actuel de `recipe-importer.ts` est renommé `RecipeDraftContent` (et `RecipeIngredientDraft` reste `RecipeIngredientDraft`). L'entité `RecipeDraft` **contient** un `RecipeDraftContent` (value object) + métadonnées (`id`, `householdId`, `source`, `createdAt`, `updatedAt`). Renommage mécanique propagé à `recipe-photo-importer.ts`, `recipe-generator.ts`, `recipe-chat-assistant.ts`, `resolve-recipe-draft.use-case.ts` et adaptateurs Anthropic. Le DTO partagé `RecipeDraftSchema` (contenu IA) reste inchangé pour ne pas casser le client ; les schémas de persistance vivent dans un nouveau fichier.
- **Alternative écartée** : nommer l'entité `SavedRecipeDraft`/`StoredRecipeDraft`. Rejeté : nom de domaine peu naturel ; `RecipeDraft` est le bon nom pour le concept persisté.

### D4 — `source` est un enum porté par le brouillon, fixé à la création et immuable
Valeurs : `manual | ai-chat | ai-url | ai-photo | mcp`. Stocké en `mysqlEnum`. Renseigné par la frontière (route HTTP ou outil MCP), jamais déduit. Un `PATCH` ne peut pas changer la `source`.

### D5 — Les 3 modes IA restent éphémères ; la persistance est un appel explicite
On **ne modifie pas** `/api/recipes/chat|import|import-photo`. Le client, après réception du contenu produit, peut appeler `POST /api/recipes/drafts` avec ce contenu et la `source` adéquate (`ai-chat`/`ai-url`/`ai-photo`). Cela découple génération et persistance, n'introduit pas d'écriture cachée dans le flux SSE, et laisse l'utilisateur décider de sauvegarder.
- **Alternative écartée** : auto-persister à la fin de chaque flux IA. Rejeté : créerait des brouillons non désirés et complexifierait le streaming.

### D6 — MCP gagne ses premiers outils, dont une **écriture**
- `mealmanager_save_recipe_draft` (**write**) : un agent enregistre un brouillon pour le foyer du PAT, `source = mcp` forcée côté serveur. Entrée = contenu de brouillon (titre, instructions, servings?, ingrédients texte libre, sourceUrl?). Pas de champ `householdId` dans le schéma d'entrée (injecté du PAT, comme les autres outils).
- `mealmanager_list_recipe_drafts` et `mealmanager_get_recipe_draft` (read) pour qu'un agent retrouve/relise ses brouillons.
- Le catalogue passe de **8 → 11 outils** ; `tools/list`, le `/openapi-mcp.yaml` et les scénarios associés sont mis à jour. L'endpoint `/mcp` reste **stateless** et scoped-PAT.
- **Sécurité** : première opération mutante via MCP. Mitigée par l'isolation foyer (PAT → `householdId`), le plafond par foyer (D7), et l'absence d'effet de bord destructeur (un brouillon est review-then-promote, jamais publié directement).

### D7 — Plafond de brouillons par foyer
Limite dure (proposé : **50** brouillons actifs par foyer) pour borner la croissance, surtout via agents MCP. Dépassement → `RecipeDraftLimitReachedError` → HTTP 409 (et erreur MCP équivalente). Valeur exposée en constante de domaine `RECIPE_DRAFTS_MAX_PER_HOUSEHOLD`.

### D8 — Promotion = flux composé côté client (pas d'endpoint dédié)
Promouvoir : (1) `GET draft` → (2) `POST /api/recipes/draft/resolve` (résolveur existant) → (3) confirmation/création d'ingrédients manquants → (4) `POST /api/recipes` → (5) `DELETE /api/recipes/drafts/:id`. Aucune logique nouvelle côté serveur, réutilisation maximale.

## Risks / Trade-offs

- **Dérogation à l'unité canonique** (D2) → cantonnée aux brouillons ; documentée ; conversion garantie à la promotion par le résolveur existant. Aucun brouillon n'entre jamais dans menu/courses (qui ne lisent que `recipes`).
- **Première écriture MCP** (D6) → surface d'abus par agent. Mitigation : isolation foyer stricte, plafond par foyer, opération non destructive et soumise à review humaine avant publication.
- **Last-write-wins** sur `PATCH` concurrent entre membres → perte silencieuse d'édition. Mitigation v1 : `updatedAt` renvoyé ; conflit acceptable vu l'usage familial. ETag/If-Match laissé en évolution future.
- **Collision de nom `RecipeDraft`** (D3) → renommage mécanique large. Mitigation : couvert par `pnpm typecheck` ; le DTO partagé public est laissé intact.
- **Croissance des brouillons orphelins** (jamais promus) → plafond + suppression manuelle ; pas d'expiration auto en v1 (évolution possible : TTL).

## Migration Plan

1. Renommage `RecipeDraft` → `RecipeDraftContent` (domaine + adaptateurs + use case de résolution), validé par `pnpm typecheck`.
2. Ajout entité/port/erreurs domaine `catalog`.
3. Migration Drizzle : `pnpm db:generate` pour `recipe_drafts` + `recipe_draft_ingredients` (FK `household` cascade, FK `draftId` cascade). Migration purement additive → rollback = `DROP TABLE` des deux tables, aucun impact sur l'existant.
4. Use cases + repository Drizzle + mapper + câblage container.
5. Routes HTTP `server/api/recipes/drafts/`.
6. Outils MCP + mise à jour `/openapi-mcp.yaml` et linkset si nécessaire.
7. DTO `shared/dto/recipe-drafts.ts` + composable front `useApiRecipeDrafts`.
8. Tests unit + intégration + smoke HTTP + smoke MCP write.

**Rollback** : feature additive ; retirer routes + outils MCP + tables. Aucune donnée existante touchée.

## Open Questions

- Valeur exacte du plafond par foyer (50 proposé) — à confirmer.
- Faut-il un `name`/label libre distinct du `title` pour retrouver un brouillon sans titre ? (proposé : non, on liste par `updatedAt` + extrait de titre).
- Faut-il borner le nombre d'ingrédients d'un brouillon (proposé : 100, aligné sur `Recipe`) et la taille des champs (titre 200, instructions 10 000, aligné sur `Recipe`) ?
- Exposer aussi `delete_recipe_draft` via MCP, ou réserver la suppression à l'UI ? (proposé : pas de suppression MCP en v1).
