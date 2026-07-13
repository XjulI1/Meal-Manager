# wine-cellar-import Specification

## Purpose
TBD - created by archiving change add-wine-cellar. Update Purpose after archive.
## Requirements
### Requirement: Import d'un export Vinotag

Le système SHALL permettre à un membre du foyer d'importer, en une opération one-shot, un export Vinotag au format Excel `.xlsx`. L'import lit la première feuille dont la première ligne contient les en-têtes attendus. Chaque ligne représente une **référence de vin** avec une quantité de bouteilles. L'import crée une référence `Wine` par ligne et `bottle_quantity` bouteilles **non placées** (`position = null`) rattachées à cette référence. Aucun emplacement n'est déduit (l'export n'en contient pas). L'import est réservé aux membres du foyer et scoped `householdId`.

#### Scenario: Import nominal
- **GIVEN** un membre authentifié et un fichier Vinotag `.xlsx` de 32 lignes totalisant 56 bouteilles
- **WHEN** il soumet `POST /api/cave/import` avec le fichier
- **THEN** 32 références de vin sont créées dans son foyer
- **AND** 56 bouteilles `in_stock` non placées sont créées
- **AND** le système renvoie un rapport `{ winesCreated: 32, bottlesCreated: 56, skippedRows: [...] }`

#### Scenario: Fichier non Excel refusé
- **WHEN** un membre soumet un fichier `.csv` ou `.pdf`
- **THEN** le système renvoie HTTP 400 avec un message explicite

#### Scenario: En-têtes attendus absents
- **GIVEN** un `.xlsx` dont la première ligne ne contient pas `wine_name`
- **WHEN** un membre lance l'import
- **THEN** le système renvoie HTTP 400 sans rien créer

### Requirement: Mapping des colonnes Vinotag

L'import SHALL appliquer le mapping suivant depuis les colonnes Vinotag vers le modèle :
- `wine_name` → `Wine.name` (**requis** ; ligne ignorée et signalée si vide).
- `wine_domain` → `Wine.domain`.
- `wine_country` (code ISO, ex. `fr`) → `Wine.country` (`fr` → « France » ; code inconnu conservé tel quel).
- `wine_region` (slug) → `Wine.region` mappé vers la liste fermée (`bourgogne`→`bourgogne`, `beaujolais`→`beaujolais`, `bordeaux`→`bordeaux`, `vallee_du_rhone`→`vallee-du-rhone`, `vallee_de_la_loire`→`vallee-de-la-loire`, …) ; slug vide ou non reconnu → `autre`.
- `millesime_year` → `Wine.vintage` (entier ; vide → sans année).
- `wine_type` → `Wine.color` (`wine_red`→`rouge`, `wine_white`→`blanc`, `wine_rose`→`rose`, `wine_sparkling`→`effervescent`).
- `bottle_size` (ex. `75cl`, `1.5L`) → contenance normalisée en `ml` via `Quantity` ; non parsable → défaut `750 ml`.
- `wine_comment` (à défaut `bottle_comment`) → `Wine.comment`.
- `bottle_buying_price` → `Bottle.buyingPrice`.
- `last_bottle_added` → `Bottle.addedDate` (parse de la date ; échec → non renseignée).
- `rating` → `Wine.rating` (entier 0–5 si présent).
- `wine_apogee_start` / `wine_apogee_end` → `Wine.gardeMin` / `Wine.gardeMax` : l'année est extraite si la valeur est exploitable, sinon la borne est laissée **vide**.

Les colonnes `favorite` et `bottle_real_price` SHALL être ignorées. Les champs `appellation` et `photoUrl` restent vides (absents de l'export).

#### Scenario: Mapping robe et région
- **GIVEN** une ligne `{ wine_type: "wine_red", wine_region: "vallee_du_rhone", wine_name: "Beaumes de Venise" }`
- **WHEN** l'import traite la ligne
- **THEN** le vin créé a `color = rouge` et `region = vallee-du-rhone`

#### Scenario: Région vide → autre
- **GIVEN** une ligne sans `wine_region`
- **THEN** le vin créé a `region = autre`

#### Scenario: Contenance parsée
- **GIVEN** une ligne `bottle_size: "75cl"`
- **THEN** les bouteilles créées ont `size = 750 ml`

#### Scenario: Prix d'achat importé sur chaque bouteille
- **GIVEN** une ligne `{ wine_name: "Bourgogne Hautes côtes de Beaune", bottle_quantity: 1, bottle_buying_price: "24.00" }`
- **WHEN** l'import traite la ligne
- **THEN** la bouteille créée a `buyingPrice = 24.00`

#### Scenario: Prix d'achat propagé à toutes les bouteilles d'une ligne
- **GIVEN** une ligne `{ bottle_quantity: 3, bottle_buying_price: "20.00" }`
- **THEN** les 3 bouteilles créées ont chacune `buyingPrice = 20.00`

#### Scenario: Prix d'achat absent
- **GIVEN** une ligne sans `bottle_buying_price`
- **THEN** les bouteilles créées ont `buyingPrice` non renseigné (optionnel)

#### Scenario: Colonnes ignorées
- **GIVEN** une ligne avec `favorite: "true"` et `bottle_real_price: "30.00"`
- **THEN** ces valeurs n'apparaissent nulle part dans les entités créées
- **AND** en particulier `bottle_real_price` n'est PAS confondu avec `bottle_buying_price` (seul ce dernier alimente `buyingPrice`)

#### Scenario: Ligne sans nom ignorée et signalée
- **GIVEN** une ligne avec `wine_name` vide
- **WHEN** l'import traite le fichier
- **THEN** la ligne est ignorée (aucune entité créée pour elle)
- **AND** elle figure dans `skippedRows` du rapport avec son numéro de ligne

### Requirement: Rapport et absence d'effet partiel indésirable

L'import SHALL renvoyer un rapport résumant `winesCreated`, `bottlesCreated`, et la liste `skippedRows` (numéro de ligne + motif). Les bouteilles importées SHALL être rangeables ensuite depuis le pool « à ranger ». L'import ne dé-duplique pas contre l'existant : relancer le même fichier crée de nouvelles références (le membre en est averti dans l'UI avant confirmation).

#### Scenario: Bouteilles importées visibles dans le pool à ranger
- **GIVEN** un import ayant créé 56 bouteilles
- **WHEN** un membre consulte le pool « à ranger »
- **THEN** les 56 bouteilles y figurent, prêtes à être placées

#### Scenario: Rapport listant les lignes ignorées
- **GIVEN** un fichier de 32 lignes dont 2 sans `wine_name`
- **WHEN** l'import se termine
- **THEN** le rapport indique `winesCreated: 30` et `skippedRows` de longueur 2

