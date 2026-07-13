# wine-collection Specification

## Purpose
TBD - created by archiving change add-wine-cellar. Update Purpose after archive.
## Requirements
### Requirement: Référentiel de vins

Le système SHALL permettre à un membre du foyer de créer et modifier des références de vin (`Wine`). Une référence appartient à un foyer et porte :
- `name` (nom du vin) — **requis**, non vide.
- `domain` (domaine/producteur) — optionnel.
- `country` (pays) — optionnel, défaut « France ».
- `region` — optionnel, valeur d'une liste fermée de régions viticoles françaises (`bourgogne`, `bordeaux`, `beaujolais`, `vallee-du-rhone`, `vallee-de-la-loire`, `alsace`, `champagne`, `languedoc`, `provence`, `sud-ouest`, `jura`, `savoie`) ou `autre`.
- `appellation` — optionnel, texte libre.
- `vintage` (millésime) — optionnel, entier année (ex. 2022) ou « sans année ».
- `color` (robe) — **requis**, l'une de `rouge`, `blanc`, `rose`, `effervescent`.
- `gardeMin` / `gardeMax` — optionnels, entiers **année** ; si les deux sont fournis, `gardeMin ≤ gardeMax` (HTTP 400 sinon).
- `comment` — optionnel, texte libre.
- `photoUrl` — optionnel (référence d'image ; l'upload n'est pas fourni en v1).
- `rating` — optionnel, entier 0–5.

#### Scenario: Créer une référence de vin
- **GIVEN** un membre authentifié d'un foyer
- **WHEN** il soumet `POST /api/cave/wines` avec `{ name: "Saint-Amour", color: "rouge", region: "beaujolais", vintage: 2023 }`
- **THEN** une référence de vin est créée dans son foyer
- **AND** `country` vaut « France » par défaut
- **AND** le système renvoie HTTP 201

#### Scenario: Robe manquante refusée
- **WHEN** un membre soumet un vin sans `color`
- **THEN** le système renvoie HTTP 400

#### Scenario: Fenêtre de garde incohérente refusée
- **WHEN** un membre soumet un vin avec `{ gardeMin: 2030, gardeMax: 2025 }`
- **THEN** le système renvoie HTTP 400

#### Scenario: Région hors liste refusée
- **WHEN** un membre soumet un vin avec `region: "toscane"`
- **THEN** le système renvoie HTTP 400

### Requirement: Bouteilles rattachées à un vin

Le système SHALL permettre d'ajouter une ou plusieurs bouteilles (`Bottle`) à une référence de vin. Une bouteille porte :
- `wineId` — **requis**, référence un vin du même foyer.
- `size` (contenance) — quantité de dimension volume, normalisée en `ml` via le VO `Quantity` ; défaut `750 ml` (75 cl). Contenances usuelles supportées : 375 ml, 500 ml, 750 ml, 1500 ml (magnum), 3000 ml (jéroboam).
- `buyingPrice` — **prix d'achat** optionnel, montant positif en euros (2 décimales) ; un montant négatif MUST être refusé (HTTP 400). Chaque bouteille porte son propre prix (des bouteilles d'une même référence achetées à des prix différents sont possibles).
- `addedDate` — optionnel, date d'entrée en cave.
- `position` — optionnel ; `null` place la bouteille dans le **pool « à ranger »**.
- `status` — `in_stock` à la création.

Ajouter N bouteilles identiques MUST créer N instances distinctes (chacune plaçable et consommable indépendamment).

#### Scenario: Ajouter 4 bouteilles non placées
- **GIVEN** une référence de vin `wine-1` du foyer
- **WHEN** un membre soumet `POST /api/cave/wines/wine-1/bottles` avec `{ quantity: 4, size: { value: 75, unit: "cl" } }`
- **THEN** 4 bouteilles `in_stock` sont créées, chacune avec `size = 750 ml` et `position = null`
- **AND** elles apparaissent dans le pool « à ranger »

#### Scenario: Contenance convertie en ml
- **WHEN** un membre ajoute une bouteille avec `size: { value: 1.5, unit: "L" }`
- **THEN** la bouteille est stockée avec `size = 1500 ml`

#### Scenario: Ajouter une bouteille avec prix d'achat
- **GIVEN** une référence de vin `wine-1` du foyer
- **WHEN** un membre soumet `POST /api/cave/wines/wine-1/bottles` avec `{ quantity: 2, size: { value: 75, unit: "cl" }, buyingPrice: 24.00 }`
- **THEN** 2 bouteilles sont créées, chacune avec `buyingPrice = 24.00`
- **AND** le prix d'achat est ensuite modifiable par bouteille via `PATCH /api/cave/bottles/{id}`

#### Scenario: Prix d'achat négatif refusé
- **WHEN** un membre ajoute une bouteille avec `buyingPrice: -5`
- **THEN** le système renvoie HTTP 400

### Requirement: Placement et déplacement d'une bouteille

Le système SHALL permettre de placer une bouteille `in_stock` dans un slot libre `(rowId, depth, index)`, et de la déplacer vers un autre slot libre. Placer une bouteille dans un slot déjà occupé MUST être refusé (HTTP 409). Retirer une bouteille de son slot (`position = null`) la renvoie au pool « à ranger ».

#### Scenario: Placer une bouteille dans un slot libre
- **GIVEN** une bouteille `b-1` dans le pool « à ranger » et un slot libre `(row-3, back, 2)`
- **WHEN** un membre soumet `PATCH /api/cave/bottles/b-1/position` avec `{ rowId: "row-3", depth: "back", index: 2 }`
- **THEN** la bouteille occupe désormais ce slot
- **AND** le système renvoie HTTP 200

#### Scenario: Placer dans un slot occupé refusé
- **GIVEN** un slot `(row-3, back, 2)` déjà occupé par `b-1`
- **WHEN** un membre place `b-2` dans `(row-3, back, 2)`
- **THEN** le système renvoie HTTP 409
- **AND** `b-1` reste en place

#### Scenario: Déplacer une bouteille vers un autre slot
- **GIVEN** `b-1` en `(row-3, back, 2)` et `(row-1, front, 5)` libre
- **WHEN** un membre déplace `b-1` vers `(row-1, front, 5)`
- **THEN** `b-1` occupe `(row-1, front, 5)` et l'ancien slot est libéré

#### Scenario: Renvoyer une bouteille au pool
- **WHEN** un membre soumet `PATCH /api/cave/bottles/b-1/position` avec `{ position: null }`
- **THEN** `b-1` a `position = null` et son ancien slot est libéré

### Requirement: Sortie d'une bouteille et journal

Le système SHALL permettre de sortir une bouteille du stock via un motif : `consumed` (bue), `gifted` (offerte) ou `broken` (cassée). La sortie MUST fixer `status = consumed`, libérer le slot occupé, et enregistrer une entrée de **journal** conservant `bottleId`, `wineId`, `reason`, `exitDate` (défaut : date du jour) et une `tastingNote` optionnelle. Une bouteille déjà sortie ne peut pas être sortie de nouveau (HTTP 409).

#### Scenario: Boire une bouteille avec note de dégustation
- **GIVEN** une bouteille `b-1` `in_stock` placée en `(row-3, back, 2)`
- **WHEN** un membre soumet `POST /api/cave/bottles/b-1/exit` avec `{ reason: "consumed", tastingNote: "Excellent, tanins fondus" }`
- **THEN** `b-1` passe en `status = consumed`
- **AND** le slot `(row-3, back, 2)` est libéré
- **AND** une entrée de journal est créée avec la note et la date du jour

#### Scenario: Sortir une bouteille offerte
- **WHEN** un membre soumet une sortie avec `{ reason: "gifted" }`
- **THEN** la bouteille passe `consumed` et le journal enregistre `reason = gifted`

#### Scenario: Consulter le journal des sorties
- **GIVEN** plusieurs bouteilles sorties dans le foyer
- **WHEN** un membre soumet `GET /api/cave/journal`
- **THEN** le système renvoie les entrées du foyer triées par `exitDate` décroissante

#### Scenario: Double sortie refusée
- **GIVEN** une bouteille `b-1` déjà `consumed`
- **WHEN** un membre soumet à nouveau une sortie sur `b-1`
- **THEN** le système renvoie HTTP 409

