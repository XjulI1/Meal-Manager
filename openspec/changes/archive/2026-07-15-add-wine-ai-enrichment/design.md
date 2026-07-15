## Context

Le contexte `wine-cellar` gère les références de vin (`Wine`) et leurs bouteilles. Une intégration IA côté serveur existe déjà et sert de modèle : le scan d'étiquette (`AnthropicWineLabelExtractor`) implémente un port (`IWineLabelExtractor`), appelle l'API Anthropic en *forced tool-use* pour obtenir une sortie structurée, et est câblé dans `server/plugins/container.ts` à partir de `useRuntimeConfig()` (`anthropicApiKey`, `anthropicModel`, effort). Le même pattern (port → adapter → use case → route → front) est réutilisé ici.

L'entité `Wine` possède déjà `gardeMin`/`gardeMax`, documentés comme **années d'apogée** (boire de X à Y), bornés 1900–2200 et validés par `assertGardeWindow` (`IncoherentGardeWindowError` si `gardeMin > gardeMax`). Elle n'a **aucun** champ pour les arômes ou les accords ; le seul texte libre est `comment`.

## Goals / Non-Goals

**Goals:**
- Enrichir un vin à la demande (fenêtre de garde, arômes, accords) via l'API Anthropic avec recherche web.
- Persister le résultat sur le vin pour éviter tout ré-appel à la consultation ; permettre une relance explicite.
- Réutiliser fidèlement le pattern hexagonal du scan d'étiquette (isolation du domaine, DI via container).

**Non-Goals:**
- Pas d'enrichissement automatique/périodique ni au batch : uniquement sur clic (maîtrise du coût).
- Pas de données structurées interrogeables pour les arômes/accords en v1 (texte libre, comme `comment`).
- Pas de séparation « suggestion IA vs valeur manuelle » : écriture directe sur le vin.
- Pas d'exposition MCP de cette fonction en v1 (déclenchement in-app uniquement).

## Decisions

### 1. Réutiliser `gardeMin`/`gardeMax` pour la fenêtre de garde
Ces champs sont déjà des **années d'apogée** et couvrent exactement le besoin « période de garde min–max ». On les remplit via l'enrichissement plutôt que d'introduire une durée (`agingMinYears`) qui entrerait en conflit sémantique avec l'existant et sa validation. *Alternative écartée* : colonnes de durée séparées → duplication de concept, confusion à l'affichage.

### 2. Écriture directe sur le vin + nouvelles colonnes texte
Trois colonnes ajoutées à `wines` : `aromas` (text), `food_pairings` (text), `ai_enriched_at` (timestamp nullable). Simplicité et cohérence avec `comment`. *Alternative écartée* : bloc d'enrichissement séparé avec provenance / table enfant structurée → plus lourd, non requis par le besoin actuel (choix utilisateur assumé : la relance peut écraser une édition manuelle).

### 3. Port `IWineEnricher` + adapter `AnthropicWineEnricher`
Le domaine déclare `IWineEnricher.enrich(wineFacts) → WineEnrichmentResult` (tous champs optionnels). L'adapter infrastructure appelle l'API Anthropic. Le use case `EnrichWineUseCase` : charge le vin (scoped foyer), appelle le port avec les attributs connus, fusionne le résultat sur le vin via `withAttributes`, positionne `aiEnrichedAt`, persiste. Isolation du domaine préservée (aucune dépendance SDK dans `domain/`).

### 4. Recherche web + sortie structurée : boucle agentique
On ne peut pas simultanément **forcer** l'outil de sortie structurée et laisser Claude appeler `web_search` dans le même tour. L'adapter utilise donc : `tools = [web_search, enrich_wine]`, `tool_choice: auto`, et une **boucle** de tours (rebouclage sur les `tool_result` de recherche) jusqu'à ce que Claude émette l'outil `enrich_wine`, dont l'input est validé par un schéma Zod. Un plafond de tours et un `max_tokens` bornent le coût. La version exacte de l'outil `web_search` et les paramètres d'effort seront confirmés à l'implémentation contre la version du SDK `@anthropic-ai/sdk` présente.

### 5. Anti-hallucination
Le prompt fournit les attributs connus du vin et **interdit d'inventer** : tout champ non trouvé de façon fiable est omis (et laisse la valeur existante inchangée côté use case). L'objectif de la recherche web est précisément de réduire les réponses génériques/fausses sur une cuvée + millésime précis.

### 6. Route et front
`POST /api/cave/wines/[id]/enrich` (session cookie, `requireHouseholdMember`), renvoyant la `WineView` enrichie. Front : bouton « Rechercher via l'IA » / « Relancer » dans la modale détail, spinner pendant l'appel, badge « Recherché le … » d'après `aiEnrichedAt`. Composable `useApiWineCellar.enrichWine(id)`.

## Risks / Trade-offs

- **Coût & latence** (recherche web = plusieurs appels par enrichissement) → borné par le déclenchement manuel uniquement, `max_tokens` et un plafond de tours ; effort réglable via env.
- **Hallucination** (fenêtre de garde / profil inventés) → recherche web + consigne stricte d'omission ; les champs restent éditables/écrasables par l'utilisateur.
- **Relance écrase les éditions manuelles** (choix assumé « écriture directe ») → mitigé par le fait que la relance est explicite ; documenté dans l'UI.
- **Cohérence garde** : un résultat `gardeMin > gardeMax` doit être neutralisé avant persistance → l'adapter/use case ne persiste pas une fenêtre incohérente (garde l'invariant existant, pas de 500).
- **Clé API absente en environnement** (tests, self-host sans clé) → l'endpoint échoue proprement (erreur métier → HTTP 4xx/5xx maîtrisé) ; les use cases restent testables avec un `IWineEnricher` en mémoire.

## Migration Plan

1. Migration SQL manuelle (cf. contrainte projet : `db:generate` non fiable) ajoutant `aromas`, `food_pairings`, `ai_enriched_at` à `wines`, + entrée de journal Drizzle.
2. Déploiement backend (port/adapter/use case/route/DI) puis front. Champs nullables → rétrocompatible, aucun backfill.
3. Rollback : les colonnes ajoutées sont nullables et inertes sans le bouton front ; retrait de la route/adapter suffit.

## Open Questions

- Version exacte de l'outil `web_search` supportée par le SDK installé et paramètre d'effort par défaut pour cette tâche (à trancher à l'implémentation).
- Faut-il un garde-fou anti-abus (throttle par vin / par foyer) au-delà du déclenchement manuel ? (Reporté hors v1 sauf besoin.)
