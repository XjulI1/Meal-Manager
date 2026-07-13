# wine-cellar-visualization Specification

## Purpose
TBD - created by archiving change add-wine-cellar. Update Purpose after archive.
## Requirements
### Requirement: Vue grille 2D d'une clayette

Le système SHALL afficher une cave sous forme de grille 2D, une clayette à la fois. Les étages sont présentés en lignes (ordonnés par `position`), et chaque étage montre sa rangée **arrière** puis, si elle existe, sa rangée **avant**, avec un emplacement (slot) par bouteille. Un slot occupé affiche a minima la robe (code couleur), le nom du vin et le millésime ; un slot vide est visuellement distinct. Un slot SHALL être cliquable pour ouvrir le détail de la bouteille (ou, s'il est vide, proposer d'y placer une bouteille du pool « à ranger »).

#### Scenario: Afficher la grille d'une clayette
- **GIVEN** une clayette de 3 étages, chacun `capacityBack: 8`, `capacityFront: 8`
- **WHEN** un membre ouvre la vue grille de cette clayette
- **THEN** 3 lignes sont affichées, chacune avec 8 slots arrière et 8 slots avant
- **AND** les slots occupés montrent robe + nom + millésime, les slots vides sont marqués comme libres

#### Scenario: Cliquer un slot occupé
- **WHEN** un membre clique un slot occupé
- **THEN** le détail de la bouteille s'ouvre (vin, contenance, apogée, actions boire/déplacer)

#### Scenario: Cliquer un slot vide
- **WHEN** un membre clique un slot vide
- **AND** le pool « à ranger » contient au moins une bouteille
- **THEN** une action de placement depuis le pool est proposée

### Requirement: Code couleur par robe

La visualisation SHALL distinguer les robes par un code couleur cohérent : `rouge`, `blanc`, `rose`, `effervescent`. Le code couleur MUST être accompagné d'un libellé texte pour rester accessible (ne pas reposer uniquement sur la couleur).

#### Scenario: Robes distinguées
- **GIVEN** une clayette contenant des bouteilles de robes différentes
- **WHEN** un membre ouvre la grille
- **THEN** chaque slot occupé porte la couleur de sa robe et un libellé textuel de la robe

### Requirement: Vue liste filtrable de la collection

Le système SHALL fournir une vue liste de toutes les bouteilles `in_stock` du foyer (placées et non placées). La liste SHALL être filtrable par robe, région, domaine et fenêtre d'apogée, et triable (nom, millésime, région). Chaque entrée SHALL indiquer si la bouteille est rangée (cave / clayette / étage / slot) ou dans le pool « à ranger ».

#### Scenario: Filtrer par robe
- **GIVEN** une collection mêlant rouges et blancs
- **WHEN** un membre filtre sur `robe = blanc`
- **THEN** seules les bouteilles de vins blancs `in_stock` sont listées

#### Scenario: Indiquer l'emplacement dans la liste
- **GIVEN** une bouteille placée en Cave « Cave J.R » / Clayette 2 / Étage 3 / arrière slot 2
- **WHEN** un membre consulte la liste
- **THEN** l'entrée affiche cet emplacement complet
- **AND** une bouteille non placée est marquée « à ranger »

#### Scenario: Pool « à ranger » accessible
- **WHEN** un membre filtre sur « à ranger »
- **THEN** seules les bouteilles `in_stock` sans emplacement sont listées

### Requirement: Rendu responsive

La visualisation SHALL être responsive. Sur mobile (largeur réduite), la **vue liste** SHALL être la vue par défaut ; la grille 2D reste accessible mais peut défiler horizontalement. Sur desktop, la grille 2D et la liste sont toutes deux directement exploitables.

#### Scenario: Vue par défaut sur mobile
- **GIVEN** un affichage en largeur mobile
- **WHEN** un membre ouvre la section Cave
- **THEN** la vue liste est présentée par défaut

