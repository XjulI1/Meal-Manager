## Why

Le foyer gère son inventaire alimentaire dans Meal Manager mais suit sa cave à vin dans une application tierce (Vinotag) qu'il souhaite abandonner. Il faut une gestion de cave native : déclarer une ou plusieurs caves, y ranger physiquement les bouteilles (pour les retrouver), suivre les informations de conservation, et migrer l'existant depuis un export Vinotag.

## What Changes

- Nouveau bounded context `wine-cellar`, scoped foyer (comme `inventory`/`catalog`), **autonome** : aucun lien avec menus, recettes ou liste de courses en v1.
- **Structure physique de cave** : un foyer déclare 1..n caves. Une cave contient 1..n clayettes, chaque clayette 1..n étages. Un étage a une capacité **arrière** (obligatoire, ≥ 1) et une capacité **avant** (optionnelle, 0 = pas de rangée avant). Un emplacement précis (slot) est identifié par `(étage, profondeur avant|arrière, index)` et contient au plus **une** bouteille. Capacités **appliquées**.
- **Référentiel de vins** (`Wine`) : nom, domaine, pays (défaut France), région (liste viticole FR + « Autre »), appellation (optionnel), millésime, robe (rouge/blanc/rosé/effervescent), garde min/max (année, optionnel), commentaire, photo d'étiquette (optionnel), note 0–5 (optionnel).
- **Bouteilles** (`Bottle`, instances d'un `Wine`) : contenance en ml via le VO `Quantity` (défaut 750 ml ; demi/50cl/75cl/magnum/jéroboam), prix d'achat (optionnel), date d'ajout (optionnel), emplacement nullable (`null` = pool « à ranger »), statut `in_stock`/`consumed`.
- **Cycle de vie d'une bouteille** : ajouter, placer dans un slot, déplacer d'un slot à un autre, **boire/sortir** (date + note de dégustation) ou offrir/casser. Les sorties sont conservées dans un **journal**.
- **Import Vinotag** : upload one-shot d'un fichier Excel `.xlsx`. Crée les références `Wine` + N bouteilles **non placées**. Mapping des colonnes documenté ; champs `favorite` et `bottle_real_price` ignorés ; `appellation`/photo absents de l'export (saisis manuellement ensuite).
- **Visualisation** : vue **grille 2D par clayette** (étages en lignes, avant/arrière, slots cliquables) + **vue liste filtrable** (robe, région, apogée, domaine…). Structure éditée par **formulaire** (pas de drag-and-drop en v1). Responsive : liste privilégiée sur mobile.
- Nouvelles pages front (`/cave`), stores Pinia UI, composables `useApi*`, DTO Zod (`shared/dto/`), schémas Drizzle + migration.

**Hors périmètre v1** (cadré ici, à proposer séparément) : alertes/notifications d'apogée, éditeur drag-and-drop de la structure, accords mets-vins, statistiques de cave, favori, upload de photos d'étiquette.

## Capabilities

### New Capabilities
- `wine-cellar-structure`: déclaration et édition des caves, clayettes, étages et slots ; règles de capacité avant/arrière et unicité d'occupation d'un slot.
- `wine-collection`: référentiel de vins (`Wine`) et bouteilles (`Bottle`) d'un foyer ; ajout, placement, déplacement, consommation/sortie avec journal, pool « à ranger ».
- `wine-cellar-import`: import one-shot d'un export Vinotag `.xlsx` (parsing, mapping, création vins + bouteilles non placées, rapport d'import).
- `wine-cellar-visualization`: vue grille 2D par clayette et vue liste filtrable de la collection.

### Modified Capabilities
<!-- Aucune : fonctionnalité entièrement nouvelle, autonome. -->

## Impact

- **Nouveau code** : `server/contexts/wine-cellar/` (domain/application/infrastructure), `server/database/schema/wine-cellar.ts` (agrégats : cellar, shelf/row/slot, wine, bottle, bottle-exit-journal), migration Drizzle, DI dans `server/plugins/container.ts`.
- **API** : nouvelles routes HTTP sous `server/api/cave/**` (caves, clayettes, étages, vins, bouteilles, placement, consommation, import), toutes via `requireHouseholdMember()`.
- **Shared** : `shared/dto/wine-cellar.ts` (schémas Zod), réutilisation de `shared/units/quantity.ts` pour les contenances.
- **Front** : pages `/cave` (liste + visualisation), formulaires structure/vin/bouteille, import ; store Pinia + composables `useApiWineCellar*`.
- **Dépendances** : ajout d'une lib de lecture `.xlsx` côté serveur pour l'import (à trancher en design ; sinon parsing manuel du zip OOXML).
- **Tests** : VO (contenance, capacité de slot, mapping Vinotag) en `tests/unit/`, use cases avec repositories en mémoire + smoke HTTP en `tests/integration/`.
- Aucune modification des contextes existants ; navigation front enrichie d'une entrée « Cave ».
