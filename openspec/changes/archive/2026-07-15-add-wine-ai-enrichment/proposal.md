## Why

Chaque référence de vin gagne à être documentée (fenêtre de garde, profil aromatique, accords mets/vin), mais ces informations sont fastidieuses à saisir à la main et faciles à obtenir via une recherche assistée par IA. Interroger l'IA à chaque consultation coûterait cher ; il faut donc un enrichissement **à la demande** dont le résultat est **persisté** sur le vin et **re-déclenchable** ponctuellement.

## What Changes

- Ajout d'un bouton « Rechercher via l'IA » dans la modale détail d'un vin (contexte `wine-cellar`).
- Nouvel endpoint `POST /api/cave/wines/[id]/enrich` (scoped foyer via `requireHouseholdMember`) qui interroge l'API Anthropic **avec recherche web** pour trouver, à propos de la cuvée : la fenêtre de garde (années d'apogée), le profil aromatique et les accords mets/vin.
- Le résultat est **écrit directement sur le vin** : réutilisation des champs existants `gardeMin`/`gardeMax` (années d'apogée) + trois nouvelles colonnes sur la table `wines` : `aromas` (text), `food_pairings` (text), `ai_enriched_at` (timestamp).
- Affichage front du profil aromatique et des accords, avec un badge « Recherché le … » (d'après `aiEnrichedAt`) et un bouton « Relancer ».
- Réutilisation du pattern IA existant (scan d'étiquette) : nouveau port `IWineEnricher` dans le domaine + adapter `AnthropicWineEnricher` en infrastructure, câblé dans le container avec la config Anthropic partagée (`anthropicApiKey`, `anthropicModel`).

## Capabilities

### New Capabilities
- `wine-ai-enrichment`: enrichissement à la demande d'une référence de vin via l'API Anthropic (recherche web), persistance du résultat (garde, arômes, accords, horodatage) sur le vin, et re-déclenchement ponctuel.

### Modified Capabilities
<!-- Aucune : les champs enrichis sont écrits par l'IA, pas par l'édition manuelle du vin ; wine-collection reste inchangé. -->

## Impact

- **DB** : migration écrite à la main ajoutant `aromas`, `food_pairings`, `ai_enriched_at` à la table `wines` (le champ `garde_min`/`garde_max` existe déjà).
- **Contexte `wine-cellar`** :
  - Domaine : `Wine` entity (`WineProps`/`WineAttributes`), nouveau port `IWineEnricher`.
  - Application : nouveau `EnrichWineUseCase`, mise à jour du merge `wine-attributes.ts`.
  - Infrastructure : adapter `AnthropicWineEnricher`, mapper `wine.mapper.ts`, repository `drizzle-wine.repository.ts` (`update().set()`).
- **DTO** : `shared/dto/wine-cellar.ts` — vues (`WineViewSchema`) exposant `aromas`, `foodPairings`, `aiEnrichedAt`.
- **HTTP** : nouvelle route `server/api/cave/wines/[id]/enrich.post.ts`.
- **DI** : `server/plugins/container.ts` + `server/types/container.ts` (nouveau use case + adapter).
- **Front** : `app/pages/cave/[id].vue` (ou composant modale détail), `app/composables/useApiWineCellar.ts` (méthode `enrichWine`).
- **Dépendances** : aucune nouvelle (SDK `@anthropic-ai/sdk` déjà présent) ; consommation API Anthropic supplémentaire, uniquement au clic.
