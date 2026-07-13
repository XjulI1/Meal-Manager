# wine-cellar-structure Specification

## Purpose
TBD - created by archiving change add-wine-cellar. Update Purpose after archive.
## Requirements
### Requirement: Déclaration d'une cave

Le système SHALL permettre à un membre du foyer de déclarer une ou plusieurs caves. Une cave appartient à un seul foyer et porte un `name` non vide (≤ 120 caractères). Toutes les opérations sur une cave MUST être isolées par `householdId` (une cave d'un autre foyer renvoie HTTP 404).

#### Scenario: Créer une première cave
- **GIVEN** un membre authentifié d'un foyer sans cave
- **WHEN** il soumet `POST /api/cave/cellars` avec `{ name: "Cave J.R" }`
- **THEN** une cave est créée dans son foyer
- **AND** le système renvoie HTTP 201 avec la cave (id, name, householdId)

#### Scenario: Nom de cave vide refusé
- **WHEN** un membre soumet `POST /api/cave/cellars` avec `{ name: "" }`
- **THEN** le système renvoie HTTP 400

#### Scenario: Cave d'un autre foyer inaccessible
- **GIVEN** une cave `cel-x` appartenant à un autre foyer
- **WHEN** un membre soumet `GET /api/cave/cellars/cel-x`
- **THEN** le système renvoie HTTP 404

### Requirement: Clayettes d'une cave

Le système SHALL permettre d'ajouter 1..n clayettes à une cave. Une clayette porte un `label` (optionnel) et une `position` (entier ≥ 1) déterminant son ordre d'affichage dans la cave. La suppression d'une clayette contenant des bouteilles placées MUST être refusée (HTTP 409) tant que les bouteilles n'ont pas été retirées ou déplacées.

#### Scenario: Ajouter une clayette
- **GIVEN** une cave `cel-1` du foyer
- **WHEN** un membre soumet `POST /api/cave/cellars/cel-1/shelves` avec `{ label: "Clayette haute", position: 1 }`
- **THEN** une clayette est créée et rattachée à `cel-1`
- **AND** le système renvoie HTTP 201

#### Scenario: Supprimer une clayette non vide refusé
- **GIVEN** une clayette contenant au moins une bouteille placée
- **WHEN** un membre soumet `DELETE` sur cette clayette
- **THEN** le système renvoie HTTP 409
- **AND** la clayette et ses bouteilles sont inchangées

### Requirement: Étages et capacités avant/arrière

Le système SHALL permettre d'ajouter 1..n étages à une clayette. Un étage porte une `position` (entier ≥ 1, ordre dans la clayette), une `capacityBack` (entier ≥ 1, rangée arrière obligatoire) et une `capacityFront` (entier ≥ 0, rangée avant optionnelle ; `0` signifie pas de rangée avant). Réduire une capacité en dessous du nombre de bouteilles déjà placées sur la rangée concernée MUST être refusé (HTTP 409).

#### Scenario: Ajouter un étage avec rangée avant et arrière
- **GIVEN** une clayette `sh-1`
- **WHEN** un membre soumet `POST /api/cave/shelves/sh-1/rows` avec `{ position: 1, capacityBack: 8, capacityFront: 8 }`
- **THEN** un étage est créé avec 8 slots arrière et 8 slots avant
- **AND** le système renvoie HTTP 201

#### Scenario: Étage sans rangée avant
- **WHEN** un membre soumet `POST /api/cave/shelves/sh-1/rows` avec `{ position: 2, capacityBack: 6, capacityFront: 0 }`
- **THEN** un étage est créé avec 6 slots arrière et aucun slot avant

#### Scenario: capacityBack à zéro refusé
- **WHEN** un membre soumet un étage avec `{ capacityBack: 0 }`
- **THEN** le système renvoie HTTP 400

#### Scenario: Réduire la capacité sous l'occupation refusé
- **GIVEN** un étage avec `capacityBack: 8` dont 6 slots arrière sont occupés
- **WHEN** un membre modifie l'étage avec `capacityBack: 5`
- **THEN** le système renvoie HTTP 409
- **AND** l'étage est inchangé

### Requirement: Slot comme emplacement unitaire

Un slot SHALL être identifié de façon unique par `(rowId, depth, index)` où `depth ∈ { front, back }` et `index` est un entier de 1 à la capacité de la rangée. Un slot contient **au plus une** bouteille `in_stock`. Le système MUST exposer, pour toute cave, l'ensemble de ses slots avec leur occupation (bouteille présente ou vide).

#### Scenario: Lister la structure et l'occupation d'une cave
- **GIVEN** une cave avec 2 clayettes, chacune 3 étages
- **WHEN** un membre soumet `GET /api/cave/cellars/{id}` avec expansion de la structure
- **THEN** le système renvoie les clayettes ordonnées par `position`, leurs étages ordonnés par `position`, et pour chaque slot son `depth`, son `index` et la bouteille occupante (ou `null`)

#### Scenario: Index de slot hors capacité rejeté
- **GIVEN** un étage avec `capacityBack: 6`
- **WHEN** une opération référence le slot `back` d'index `7`
- **THEN** le système renvoie HTTP 400

