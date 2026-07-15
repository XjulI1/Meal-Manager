## ADDED Requirements

### Requirement: Statut d'apogée d'une cuvée

Le système SHALL dériver, pour une cuvée dotée d'une fenêtre de garde et relativement à une **année de référence** `y` (par défaut l'année courante), un **statut d'apogée** parmi :

- `dépassé` — `gardeMax` est renseigné et `gardeMax < y`.
- `à venir` — `gardeMin` est renseigné et `gardeMin > y`.
- `début d'apogée` — la cuvée est buvable en `y`, **les deux bornes sont renseignées**, et `y` tombe dans les **premiers 20 %** de la fenêtre (`(y − gardeMin) × 100 ≤ 20 × span`, avec `span = gardeMax − gardeMin`).
- `fin d'apogée` — la cuvée est buvable en `y`, **les deux bornes sont renseignées**, et `y` tombe dans les **derniers 20 %** de la fenêtre (`(gardeMax − y) × 100 ≤ 20 × span`) — « à boire vite ».
- `au sommet` — la cuvée est buvable en `y` et n'est ni `début` ni `fin` : soit le cœur de la fenêtre (les 60 % centraux), soit une fenêtre dont **une borne est manquante**.
- `garde non renseignée` — ni `gardeMin` ni `gardeMax` ne sont renseignés.

Le calcul MUST être une fonction pure du domaine `wine-cellar` (aucune I/O) et MUST rester cohérent avec l'invariant `gardeMin ≤ gardeMax`. La logique « buvable en `y` » MUST être identique à celle du filtre `drinkableInYear` existant. Les fenêtres `début` / `fin` sont **proportionnelles** à la longueur de garde (≈1 an pour une garde de 4 ans, ≈2 ans pour 10 ans) et calculées en entiers (pas de flottant). Les nuances ne sont tracées **que si les deux bornes sont connues** ; sinon la cuvée buvable est `au sommet`. Lorsque la fenêtre est d'un an (`gardeMin === gardeMax`), le signal de fermeture l'emporte (`fin d'apogée`).

#### Scenario: Début d'apogée (premiers 20 %)
- **WHEN** on évalue une cuvée `{ gardeMin: 2020, gardeMax: 2030 }` pour l'année `2021`
- **THEN** le statut est `début d'apogée`

#### Scenario: Cuvée au sommet (cœur de fenêtre)
- **WHEN** on évalue une cuvée `{ gardeMin: 2020, gardeMax: 2030 }` pour l'année `2025`
- **THEN** le statut est `au sommet`

#### Scenario: Fin d'apogée (derniers 20 %)
- **WHEN** on évalue une cuvée `{ gardeMin: 2020, gardeMax: 2030 }` pour l'année `2029`
- **THEN** le statut est `fin d'apogée`

#### Scenario: Les bords proportionnels varient avec la longueur de garde
- **WHEN** on évalue une garde courte `{ gardeMin: 2024, gardeMax: 2028 }` pour l'année `2025`
- **THEN** le statut est `au sommet` (2025 n'est plus dans le début d'une fenêtre de 4 ans)
- **AND** la même position relative sur une garde de 10 ans `{ gardeMin: 2020, gardeMax: 2030 }` en `2022` donne `début d'apogée`

#### Scenario: Fenêtre d'un an — la fermeture l'emporte
- **WHEN** on évalue une cuvée `{ gardeMin: 2026, gardeMax: 2026 }` pour l'année `2026`
- **THEN** le statut est `fin d'apogée`

#### Scenario: Apogée dépassée
- **WHEN** on évalue une cuvée `{ gardeMin: 2015, gardeMax: 2022 }` pour l'année `2026`
- **THEN** le statut est `dépassé`

#### Scenario: Apogée à venir
- **WHEN** on évalue une cuvée `{ gardeMin: 2030, gardeMax: 2040 }` pour l'année `2026`
- **THEN** le statut est `à venir`

#### Scenario: Borne manquante — reste au sommet
- **WHEN** on évalue une cuvée `{ gardeMin: null, gardeMax: 2026 }` pour l'année `2026`
- **THEN** la cuvée est considérée buvable et le statut est `au sommet` (pas de nuance début/fin)

#### Scenario: Garde non renseignée
- **WHEN** on évalue une cuvée `{ gardeMin: null, gardeMax: null }` pour l'année `2026`
- **THEN** le statut est `garde non renseignée`

### Requirement: Agrégation du calendrier d'apogée

Le système SHALL fournir une lecture, scopée au foyer, agrégeant les cuvées ayant **au moins une bouteille `in_stock`**, regroupées **par cuvée**. Pour chaque cuvée, la lecture SHALL renseigner : identité (nom, domaine, robe, région, millésime), `gardeMin`/`gardeMax`, le **nombre de bouteilles `in_stock`**, et le **statut d'apogée** pour l'année de référence. Les cuvées sans bouteille en stock MUST être exclues. La lecture MUST passer par `requireHouseholdMember()` et ne renvoyer que les données du foyer courant.

#### Scenario: Regroupement par cuvée avec stock
- **GIVEN** une cuvée avec 3 bouteilles `in_stock` et 1 bouteille `consumed`
- **WHEN** un membre demande le calendrier d'apogée
- **THEN** la cuvée apparaît une seule fois avec un compteur de 3 bouteilles en stock

#### Scenario: Cuvée sans stock exclue
- **GIVEN** une cuvée dont toutes les bouteilles sont `consumed`
- **WHEN** un membre demande le calendrier d'apogée
- **THEN** la cuvée n'apparaît pas dans le résultat

#### Scenario: Isolation foyer
- **GIVEN** deux foyers possédant chacun des cuvées en stock
- **WHEN** un membre du foyer A demande le calendrier
- **THEN** seules les cuvées du foyer A sont renvoyées

### Requirement: Dashboard « à boire » sur l'année courante

Le système SHALL présenter, sous `/cave`, un dashboard groupant les cuvées en stock par statut d'apogée pour l'**année courante**, dans l'ordre de priorité : `fin d'apogée` (à boire vite), `au sommet`, `début d'apogée`, `à venir`, `dépassé`, puis `garde non renseignée`. Chaque cuvée affichée MUST montrer son nom, sa robe et son nombre de bouteilles en stock, et permettre d'ouvrir son détail. Un *bucket* vide MUST être masqué ou affiché comme vide de façon explicite.

#### Scenario: Cuvée urgente mise en avant
- **GIVEN** une cuvée en stock dont c'est la dernière année d'apogée
- **WHEN** un membre ouvre la page
- **THEN** la cuvée apparaît dans le bucket « fin d'apogée » en tête de page

#### Scenario: Accès au détail
- **WHEN** un membre clique sur une cuvée du dashboard
- **THEN** le détail de la cuvée s'ouvre, permettant les actions existantes (dont « boire » une bouteille)

### Requirement: Timeline par année

Le système SHALL présenter une timeline chronologique, de l'année courante jusqu'à la dernière année d'apogée présente en cave (`max(gardeMax)` des cuvées en stock). Chaque année SHALL lister les cuvées **buvables cette année-là** (règle `drinkableInYear`), avec leur nombre de bouteilles en stock. Une même cuvée MAY apparaître sous plusieurs années (fenêtre pluriannuelle). Les cuvées sans fenêtre de garde MUST être regroupées dans une section « garde non renseignée » distincte de la timeline.

#### Scenario: Cuvée listée sur plusieurs années
- **GIVEN** une cuvée en stock `{ gardeMin: 2026, gardeMax: 2028 }`
- **WHEN** un membre consulte la timeline pour l'année de référence 2026
- **THEN** la cuvée apparaît sous 2026, 2027 et 2028

#### Scenario: Section garde non renseignée
- **GIVEN** une cuvée en stock sans `gardeMin` ni `gardeMax`
- **WHEN** un membre consulte la timeline
- **THEN** la cuvée figure dans la section « garde non renseignée » et non sous une année
