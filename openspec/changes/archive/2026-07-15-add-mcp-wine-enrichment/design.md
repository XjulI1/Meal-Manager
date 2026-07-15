## Context

L'enrichissement in-app (change `add-wine-ai-enrichment`) fonctionne ainsi : `EnrichWineUseCase` charge le vin, appelle le port `IWineEnricher` (adapter Anthropic + recherche web), puis construit les nouveaux attributs (neutralisation garde incohérente, champ omis = inchangé, `aiEnrichedAt` daté) et persiste. Le transport MCP (`server/routes/mcp/`) authentifie par PAT (`requireHouseholdFromPAT`) et expose des outils via des registrars par domaine ; aucun outil vin n'existe encore. Le pattern mutant de référence est `mealmanager_save_recipe_draft` (`householdId` forcé depuis le PAT, erreurs métier renvoyées en `isError`, jamais en 500).

En MCP, c'est **Claude Desktop** qui fait la recherche web ; le serveur ne doit donc **pas** rappeler l'IA — il enregistre des valeurs déjà obtenues.

## Goals / Non-Goals

**Goals:**
- Exposer en MCP : lister les vins (avec filtre enrichi/non enrichi), lire un vin, enregistrer un enrichissement fourni par l'agent.
- Garantir des règles de persistance **strictement identiques** entre app et MCP (une seule implémentation).
- Réutiliser le pattern MCP existant (scoping PAT, erreurs en `isError`).

**Non-Goals:**
- Pas d'appel à l'API Anthropic côté serveur pour le chemin MCP.
- Pas de gating `ai_enabled` sur les outils vin MCP (l'IA est celle du client).
- Pas de nouvelle route HTTP ni de migration DB (colonnes déjà présentes).
- Pas d'outils MCP d'écriture des attributs « métier » du vin (nom, robe…) : seul l'enrichissement est en écriture.

## Decisions

### 1. Extraire `applyWineEnrichment(wine, result, now)` partagé
Fonction pure de la couche application prenant un `WineEnrichmentResult` et renvoyant un `Wine` mis à jour (neutralisation garde, `?? existant`, `aiEnrichedAt = now`). `EnrichWineUseCase` l'utilise après l'appel à l'IA ; `SaveWineEnrichmentUseCase` l'utilise directement. Une seule source de vérité pour les règles. *Alternative écartée* : dupliquer la logique dans les deux use cases → risque de divergence.

### 2. Nouveau `SaveWineEnrichmentUseCase(wines, bottles)`
`execute({ householdId, id, enrichment })` : `findById` (→ `WineNotFoundError` si absent/cross-foyer) → `applyWineEnrichment` → `wines.update` → renvoie la `WineView` (avec `bottleCount`). Aucun `IWineEnricher` injecté : pas d'IA serveur.

### 3. Réutiliser `ListWinesUseCase` et `GetWineUseCase`
Déjà câblés et scoped foyer. Le filtre `enriched` et le champ `isEnriched` sont dérivés dans le **handler MCP** à partir de `WineView.aiEnrichedAt` (pas de modification des use cases). `list_wines` renvoie une projection compacte ; `get_wine` renvoie la vue complète.

### 4. Consigne de recherche partagée
Le cœur de la consigne (rôle sommelier, quoi chercher, « ne rien inventer ») est extrait dans un module d'application. L'adapter Anthropic y ajoute « utilise web_search puis appelle enrich_wine » ; la description de `mealmanager_save_wine_enrichment` y ajoute « recherche sur le web puis appelle cet outil ». Le fond est partagé, la phrase d'appel d'outil diffère par nature.

### 5. Validation de l'entrée du write tool
`WineEnrichmentSchema` (déjà défini dans `shared/dto/wine-cellar.ts`) valide `gardeMin?/gardeMax?/aromas?/foodPairings?` ; le tool ajoute `wineId` (UUID). `householdId` n'est jamais accepté en entrée.

## Risks / Trade-offs

- **Divergence app/MCP des règles** → éliminée par `applyWineEnrichment` partagé (testé sur les deux chemins).
- **Agent qui écrase par erreur un vin déjà enrichi** → ré-enrichissement volontairement autorisé (cohérent avec « Relancer » de l'app) ; l'action est explicite côté agent.
- **Fuite inter-foyer** → `findById(id, householdId)` du PAT ; un `wineId` d'un autre foyer renvoie une erreur `isError`, jamais de données ni de 500.
- **Hallucination de l'agent** → consigne « ne rien inventer / omettre si incertain » portée par la description du tool ; les champs restent éditables dans l'app.
- **Catalogue MCP à garder exact** → la spec `mcp` (compte + table) est mise à jour ; un test de catalogue vérifie la présence/kind des nouveaux outils.

## Migration Plan

1. Refactor `applyWineEnrichment` + `EnrichWineUseCase` (comportement inchangé, couvert par les tests existants).
2. Ajout `SaveWineEnrichmentUseCase` + câblage container/type.
3. Ajout `server/routes/mcp/tools/wine.ts` + enregistrement dans `tools/index.ts`.
4. Rétrocompatible : nouveaux outils uniquement ; aucun schéma DB modifié.

## Open Questions

Aucune — périmètre et règles confirmés (PAT seul, ré-enrichissement autorisé, list_wines + get_wine + save_wine_enrichment, consigne portée par la description du tool).
