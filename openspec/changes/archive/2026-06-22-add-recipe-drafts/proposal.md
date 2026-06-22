## Why

Aujourd'hui une recette n'existe que sous deux états : inexistante, ou créée et complète (`POST /api/recipes` exige titre, instructions, ≥ 1 ingrédient résolu, portions). Les **brouillons** — recette commencée à la main, contenu produit par l'IA (chat / URL / photo), ou recette proposée par un agent via MCP — ne vivent que côté client (préremplissage de formulaire) et sont perdus dès qu'on quitte la page ou change d'appareil. On veut **persister ces brouillons côté serveur, par foyer**, pour qu'ils survivent, soient repris plus tard et partagés entre membres du foyer, quelle que soit leur origine.

## What Changes

- Nouveau concept **brouillon de recette persisté** (`RecipeDraft`) dans le contexte `catalog` : une recette incomplète, propre à un foyer, dont les ingrédients restent en **texte libre** (non encore résolus contre le catalogue) et dont tous les champs sont optionnels.
- Chaque brouillon porte une **origine** (`source`) : `manual`, `ai-chat`, `ai-url`, `ai-photo`, `mcp`.
- Nouvelles routes HTTP scoped-foyer : `POST/GET /api/recipes/drafts`, `GET/PATCH/DELETE /api/recipes/drafts/:id` (création, liste, lecture, autosave, suppression).
- Les 3 modes IA (chat, import URL, import photo) restent des **producteurs éphémères** ; le client peut désormais persister le contenu produit en l'enregistrant comme brouillon avec la `source` correspondante. **Aucun changement de comportement de l'assistant IA** (il ne persiste toujours rien lui-même).
- **MCP** : ajout des premiers outils **en écriture** — `mealmanager_save_recipe_draft` (un agent enregistre un brouillon pour le foyer du PAT), plus `mealmanager_list_recipe_drafts` et `mealmanager_get_recipe_draft` en lecture.
- **Promotion** d'un brouillon en recette : flux documenté réutilisant le résolveur d'ingrédients existant puis `POST /api/recipes`, suivi de la suppression du brouillon. Pas de nouvel endpoint dédié en v1.
- Garde-fous : plafond de brouillons par foyer, isolation stricte par `householdId`, normalisation des quantités libres à la promotion uniquement.
- Renommage mécanique du type éphémère `RecipeDraft` (port importer) en `RecipeDraftContent` pour lever la collision de nom avec la nouvelle entité persistée.

## Capabilities

### New Capabilities
- `recipe-drafts`: persistance par foyer de brouillons de recette (CRUD, origine `source`, ingrédients en texte libre, plafond par foyer, isolation foyer, relation avec la création de recette).

### Modified Capabilities
- `mcp`: le catalogue d'outils MCP gagne ses premiers outils en écriture/lecture sur les brouillons (`save_recipe_draft`, `list_recipe_drafts`, `get_recipe_draft`) ; le nombre d'outils annoncés (tools/list et OpenAPI `/openapi-mcp.yaml`) passe de 8 à 11, et l'endpoint accepte désormais une opération d'écriture scoped par le foyer du PAT.

## Impact

- **Domaine (`catalog`)** : nouvelle entité `RecipeDraft` + value object de contenu, nouveau port `IRecipeDraftRepository`, nouvelles erreurs (`RecipeDraftNotFoundError`, `RecipeDraftLimitReachedError`). Renommage `RecipeDraft` → `RecipeDraftContent` dans `recipe-importer.ts` et ses consommateurs.
- **Application** : use cases `SaveRecipeDraft`, `ListRecipeDrafts`, `GetRecipeDraftById`, `UpdateRecipeDraft`, `DeleteRecipeDraft`.
- **Infrastructure** : tables Drizzle `recipe_drafts` + `recipe_draft_ingredients` (migration), repository Drizzle + mapper, câblage dans `server/plugins/container.ts`.
- **HTTP** : routes sous `server/api/recipes/drafts/`.
- **MCP** : nouveaux outils sous `server/routes/mcp/tools/`, mise à jour de `/openapi-mcp.yaml` et du linkset RFC 9727 si nécessaire.
- **DTO partagés** : nouveau `shared/dto/recipe-drafts.ts` (réutilise `RecipeIngredientDraftSchema`).
- **Front** (hors v1 stricte mais préparé) : composable `useApiRecipeDrafts`, persistance d'autosave depuis le formulaire et les flux IA.
- **Tests** : unitaires (entité, plafond, transitions de contenu) et intégration (use cases avec repo en mémoire + smoke HTTP + smoke MCP write).
