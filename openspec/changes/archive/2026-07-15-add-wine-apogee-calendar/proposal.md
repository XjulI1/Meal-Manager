## Why

Aujourd'hui les vins portent une fenêtre de garde (`gardeMin`/`gardeMax`, en années) mais rien n'aide à **planifier quand les boire**. Pour éviter de laisser passer l'apogée d'une cuvée, le foyer a besoin d'une vue dédiée qui répond à deux questions : « qu'est-ce que je devrais boire cette année ? » et « comment ma cave se répartit-elle dans le temps ? ».

## What Changes

- Ajout d'une **page « Calendrier d'apogée »** sous `/cave`, accessible depuis la navigation de la cave.
- La page combine **deux vues** sur les cuvées ayant au moins une bouteille `in_stock`, regroupées **par cuvée** (avec le nombre de bouteilles en stock) :
  - **Dashboard « à boire »** centré sur l'année courante, avec des *buckets* de statut : *à boire maintenant*, *fenêtre bientôt fermée*, *au sommet*, *à venir*, *dépassé*.
  - **Timeline année par année** (année courante → dernière année d'apogée présente en cave), où chaque année liste les cuvées à leur apogée cette année-là.
- Introduction d'une notion de **statut d'apogée** dérivée de `gardeMin`/`gardeMax` et de l'année courante, calculée dans le domaine `wine-cellar` (règles pures, réutilisables).
- Réutilisation de la logique existante `drinkableInYear` ; les cuvées sans fenêtre de garde renseignée sont regroupées à part (« garde non renseignée »).
- Depuis la page, un membre peut ouvrir le détail d'une cuvée / sortir (« boire ») une bouteille, en réutilisant les actions existantes.

## Capabilities

### New Capabilities
- `wine-apogee-calendar`: Vue de planification de consommation des vins basée sur la fenêtre d'apogée — classification par statut (dashboard année courante) et répartition chronologique (timeline par année), regroupée par cuvée avec stock.

### Modified Capabilities
<!-- Aucun changement de requirement sur les specs existantes : le filtre drinkableInYear et le modèle Wine (gardeMin/gardeMax) restent inchangés et sont réutilisés tels quels. -->

## Impact

- **Domaine `wine-cellar`** : nouveau service/VO pur de calcul de statut d'apogée (`domain/`), sans I/O.
- **Application** : nouveau use case d'agrégation « apogée par cuvée » réutilisant `IWineRepository` / `IBottleRepository` (comptage des bouteilles `in_stock` par cuvée + fenêtre de garde). Réutilise la logique `drinkableInYear`.
- **HTTP** : un endpoint de lecture sous `server/api/cave/` (ex. `apogee-calendar.get.ts`) exposant les cuvées groupées + leur statut ; câblé via le container DI.
- **DTO** : nouveau schéma de vue dans `shared/dto/wine-cellar.ts` (statut, cuvée, compteur de bouteilles, année de référence).
- **Front** : nouvelle page `app/pages/cave/calendrier.vue` (ou équivalent), extension du composable `useApiWineCellar` (méthode `getApogeeCalendar`), lien de navigation dans la cave.
- **Aucune migration DB** : les colonnes `garde_min` / `garde_max` / statut bouteille existent déjà.
