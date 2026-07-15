## Why

L'enrichissement des vins (fenêtre de garde, arômes, accords) existe dans l'app via l'API Anthropic serveur. On veut pouvoir piloter ce flux depuis **Claude Desktop** (MCP) : c'est alors l'agent qui fait la recherche web, et le serveur se contente d'**enregistrer** le résultat — sans coût d'API côté serveur. Aujourd'hui aucun outil MCP n'expose les vins.

## What Changes

- Ajout de **trois outils MCP** (préfixe `mealmanager_`), auth par PAT uniquement (`requireHouseholdFromPAT`, pas de gating `ai_enabled`) :
  - `mealmanager_list_wines` (lecture) — liste les vins du foyer, filtre optionnel `enriched?: boolean`, chaque entrée porte un `isEnriched`.
  - `mealmanager_get_wine` (lecture) — détails complets d'un vin par `wineId`.
  - `mealmanager_save_wine_enrichment` (**write**) — enregistre les valeurs d'enrichissement fournies par l'agent (`gardeMin?`, `gardeMax?`, `aromas?`, `foodPairings?`) pour un `wineId`. `householdId` forcé depuis le PAT ; ré-enrichissement autorisé (écrase les champs fournis, rafraîchit `aiEnrichedAt`). Sa **description** porte la consigne de recherche (rôle sommelier, quoi chercher, ne rien inventer).
- **Refactor DRY** : extraction depuis `EnrichWineUseCase` d'une fonction partagée `applyWineEnrichment(wine, result, now)` (neutralisation d'une fenêtre de garde incohérente, champ omis = inchangé, `aiEnrichedAt` daté). Nouveau `SaveWineEnrichmentUseCase` qui persiste des valeurs déjà obtenues, **sans appeler l'IA serveur**.
- Extraction du cœur de la consigne de recherche (aujourd'hui `SYSTEM` de `anthropic-wine-enricher.ts`) dans un module partagé, réutilisé par l'adapter (app) et la description de l'outil MCP.

## Capabilities

### New Capabilities
<!-- Aucune : on étend deux capacités existantes. -->

### Modified Capabilities
- `mcp`: le catalogue d'outils gagne trois outils vin (dont un write, `save_wine_enrichment`) ; le nombre total d'outils et les règles de scoping/erreur s'appliquent aux nouveaux outils.
- `wine-ai-enrichment`: les valeurs d'enrichissement peuvent aussi provenir d'une source externe (agent MCP) et sont persistées avec des règles **identiques** au flux applicatif (via `applyWineEnrichment`), sans appel IA côté serveur.

## Impact

- **Transport MCP** : nouveau `server/routes/mcp/tools/wine.ts` (`registerWineTools`) + une ligne dans `server/routes/mcp/tools/index.ts`.
- **Contexte `wine-cellar`** :
  - Application : `applyWineEnrichment(...)` partagé, refactor de `EnrichWineUseCase` pour l'utiliser, nouveau `SaveWineEnrichmentUseCase`.
  - Consigne de recherche partagée (nouveau module d'application), consommée par `anthropic-wine-enricher.ts`.
- **DI** : `SaveWineEnrichmentUseCase` dans `server/plugins/container.ts` + interface `Container` (`server/types/container.ts`).
- **DTO** : réutilisation de `WineEnrichmentSchema` (existant) pour valider l'entrée du write tool.
- **Dépendances** : aucune. Pas de nouvelle route HTTP ni de migration DB (colonnes déjà présentes).
- **Tests** : `SaveWineEnrichmentUseCase` (succès, 404, ré-enrichissement, garde neutralisée, champ omis inchangé) + smoke MCP des trois outils (scoping PAT, isolation foyer).
