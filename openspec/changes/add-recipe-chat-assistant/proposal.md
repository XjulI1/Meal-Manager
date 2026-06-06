## Why

Créer une recette à la main est fastidieux : il faut tout saisir, et l'utilisateur n'a pas d'aide pour trouver de l'inspiration ou structurer une recette glanée sur internet. On veut un assistant conversationnel (Claude) qui propose des recettes — soit trouvées sur le web, soit co-construites avec l'utilisateur, soit importées depuis une URL — et qui les prépare pour enregistrement dans l'application.

Comme l'usage de l'IA a un coût (notamment la recherche web facturée à la requête), l'accès doit être **désactivé par défaut** et activé explicitement par compte, pour éviter toute consommation non souhaitée.

## What Changes

- **Assistant conversationnel de recettes** : un chat streaming (SSE) où l'utilisateur dialogue avec Claude pour trouver ou construire une recette. Claude peut chercher sur le web (outil server-side `web_search`) et cite ses sources.
- **Import depuis une URL** : l'utilisateur colle l'URL d'une recette ; le système la parse (JSON-LD / schema.org `Recipe`, avec repli sur extraction par Claude) et produit un brouillon.
- **Brouillon → formulaire existant** : l'IA ne persiste **jamais** elle-même. Elle converge vers un `RecipeDraft` structuré qui **pré-remplit le formulaire `RecipeForm` existant** ; l'utilisateur valide/corrige avant l'enregistrement réel (réutilise `CreateRecipeUseCase` et la validation Zod déjà en place).
- **Résolution d'ingrédients « proposer puis valider »** : les noms d'ingrédients du brouillon sont matchés sur le catalogue du foyer ; les non-matchés sont renvoyés comme **propositions de création** (avec unité canonique) que l'utilisateur confirme dans le formulaire.
- **Gating IA par compte** : un flag `aiEnabled` (défaut `false`) sur le compte utilisateur conditionne l'accès. Les routes IA renvoient **HTTP 403** si le flag est désactivé ; le front masque/désactive l'entrée chat. Bascule via base de données (seed / `db:studio`) en v1 — pas d'UI d'auto-activation.
- **Dépendance** : ajout de `@anthropic-ai/sdk` et de la variable d'environnement `ANTHROPIC_API_KEY` (clé serveur uniquement).

## Capabilities

### New Capabilities
- `recipe-chat-assistant`: assistant IA conversationnel pour les recettes — chat streaming avec recherche web, import depuis une URL, génération d'un `RecipeDraft` structuré, et résolution des ingrédients du brouillon contre le catalogue du foyer. Toutes ces fonctions sont scoped-foyer et gated par l'accès IA du compte.

### Modified Capabilities
- `platform`: ajout d'une exigence de **contrôle d'accès aux fonctionnalités IA** — un compte porte un flag `aiEnabled` (défaut `false`) ; un helper d'autorisation refuse (403) l'accès aux endpoints IA quand le flag est désactivé.

## Impact

- **Nouveau contexte/transport** : use cases dans `server/contexts/catalog/application/` (chat, import, résolution de brouillon) ; adapters Anthropic dans `catalog/infrastructure/` derrière les ports `IRecipeChatAssistant` (nouveau) et `IRecipeImporter` (existant, à implémenter). Routes `POST /api/recipes/chat` (SSE), `POST /api/recipes/import`, et résolution de brouillon — toutes via `requireHouseholdMember()` + nouveau `requireAiEnabled()`.
- **Base de données** : nouvelle colonne `ai_enabled` (bool, défaut `false`) sur la table users (contexte `platform`) + migration Drizzle.
- **DI** : enregistrement des nouveaux adapters/use cases dans `server/plugins/container.ts`.
- **DTO partagés** : nouveaux schémas Zod (`shared/dto/`) pour messages de chat, `RecipeDraft`, résultat de résolution.
- **Front** : composable `useApiRecipeChat` (streaming), UI de chat, pré-remplissage de `RecipeForm`, garde client sur le flag IA.
- **Config** : `ANTHROPIC_API_KEY` dans `.env.example` et `runtimeConfig` ; `@anthropic-ai/sdk` dans `package.json`.
- **Réutilisation sans modification** : `CreateRecipeUseCase`, la création d'ingrédients, et `RecipeForm` restent inchangés sur le plan des exigences.
