## Context

Meal Manager suit six bounded contexts hexagonaux (`platform`, `family`, `inventory`, `catalog`, `meal-planning`, `shopping`). La gestion de cave à vin est une nouvelle capacité **autonome** (aucune interaction avec les menus/recettes/courses en v1). Le foyer migre depuis Vinotag et fournit un export `.xlsx` (analysé : 32 références / 56 bouteilles, uniquement des vins FR, robes rouge/blanc, contenance 75 cl, sans emplacement).

Contraintes structurantes du projet à respecter : dépendance `infrastructure → application → domain` (ESLint enforce l'isolation du domaine), VO `Quantity` pour toute quantité, isolation foyer via `requireHouseholdMember()`, IDs `char(36)` UUID applicatifs, un fichier de schéma Drizzle par agrégat, composition root dans `server/plugins/container.ts`, DTO Zod partagés dans `shared/dto/`, locale `fr-FR`.

## Goals / Non-Goals

**Goals :**
- Modéliser la structure physique (cave → clayette → étage → slot avant/arrière) avec capacités appliquées et emplacement précis d'une bouteille.
- Modéliser un référentiel de vins (`Wine`) et des bouteilles instances (`Bottle`) plaçables, déplaçables et sortables, avec journal des sorties.
- Importer un export Vinotag `.xlsx` en créant vins + bouteilles non placées, sans polluer le domaine avec le format de fichier.
- Fournir une vue grille 2D par clayette et une vue liste filtrable, responsive.

**Non-Goals (v1) :**
- Alertes/notifications d'apogée, éditeur drag-and-drop, accords mets-vins, statistiques, favori, upload d'images d'étiquette.
- Lien avec l'inventaire alimentaire, les menus, les recettes ou la liste de courses.
- Zones de température / types de cave.
- Dé-duplication à l'import contre l'existant.

## Decisions

### D1 — Nouveau bounded context `wine-cellar`
Création de `server/contexts/wine-cellar/{domain,application,infrastructure}` sur le même patron que `inventory`. Alternative écartée : étendre `inventory` — rejetée car le vocabulaire (cave, clayette, robe, apogée, placement) et le cycle de vie n'ont rien de commun avec les stocks alimentaires ; le mélange nuirait à l'isolation.

### D2 — Deux agrégats : `Cellar` (structure) et `Wine` (collection)
- **Agrégat `Cellar`** : racine `Cellar` → `Shelf` (clayette) → `Row` (étage). L'`Row` porte `capacityBack (≥1)` et `capacityFront (≥0)`.
- **Agrégat `Wine`** : racine `Wine` → `Bottle` (instances).
- Référence inter-agrégats **par id uniquement** : une `Bottle` référence un `rowId` (pas l'entité `Row`). Cohérent avec la règle hexagonale.

### D3 — Slots non persistés ; occupation portée par la bouteille
Un slot n'est **pas** une ligne en base : il est dérivé de la capacité de l'étage. La position vit sur la bouteille via trois colonnes nullables `row_id (char36)`, `depth (enum front|back)`, `slot_index (int)`. Une position est soit **entièrement nulle** (pool « à ranger » ou bouteille sortie), soit **entièrement renseignée** (invariant applicatif).

**Unicité d'occupation** : `UNIQUE INDEX (row_id, depth, slot_index)` sur `wine_bottles`. MariaDB/MySQL autorisent **plusieurs lignes tout-à-NULL** dans un index unique → le pool et les bouteilles sorties ne rentrent pas en collision, et l'unicité ne s'applique qu'aux triplets renseignés. C'est exactement le comportement voulu, sans table d'occupation dédiée.

Alternative écartée : table `bottle_placements` séparée — rejetée car l'index multi-NULL couvre déjà l'invariant « un slot ↔ au plus une bouteille » et « une bouteille ↔ au plus un slot » (ce dernier trivial : une seule ligne bouteille). Moins de tables, moins de jointures.

Sur `POST placement`, un `ER_DUP_ENTRY` (course concurrente) est traduit en **HTTP 409** (slot occupé). La validité `slot_index ≤ capacity` est vérifiée en application (contre la capacité de l'étage).

### D4 — Journal des sorties = projection, pas de table dédiée
La sortie fixe sur la bouteille : `status = consumed`, `exit_reason (consumed|gifted|broken)`, `exit_date`, `tasting_note`, et remet la position à NULL. Le journal (`GET /api/cave/journal`) est une **requête** sur les bouteilles `consumed` du foyer triées par `exit_date`. Alternative écartée : table `bottle_exits` — rejetée car toutes les données du journal vivent déjà sur la bouteille ; une table séparée dupliquerait sans bénéfice en v1.

### D5 — Contenance via `Quantity` (dimension volume)
La contenance est un `Quantity` volume normalisé en `ml` (75 cl → 750 ml), colonnes `size_ml int unsigned`. On réutilise `Quantity.fromUserInput` / `toDisplay` et l'enum `quantity_unit` existant. La garde (`gardeMin`/`gardeMax`) est stockée en **année entière** (`smallint`), pas via `Quantity` (ce n'est pas une quantité physique).

### D6 — Import : parsing en infrastructure, use case sur lignes normalisées
La lecture du `.xlsx` est un **adapter d'entrée** en infrastructure exposant un port `IWineImportParser` qui rend un tableau de lignes normalisées (`Record<string,string>`). `ImportVinotagUseCase` consomme ces lignes → crée `Wine` + N `Bottle` non placées et produit un rapport (`winesCreated`, `bottlesCreated`, `skippedRows`). Le domaine/use-case ne connaît **pas** le format Excel → testable avec de simples tableaux en mémoire.

**Dépendance** : ajout de `exceljs` (pur JS, MIT, maintenu) pour lire le `.xlsx`. Alternatives écartées : SheetJS `xlsx` (distribution npm problématique, historique de CVE) ; parsing OOXML manuel via unzip (fragile selon `sharedStrings` vs `inlineStr` — cet export utilise déjà `inlineStr`). Le mapping robe/région/contenance est un service pur testé unitairement.

### D7 — Transport HTTP & isolation foyer
Routes sous `server/api/cave/**`, chacune via `requireHouseholdMember()`. Aucune route n'instancie de use case : `event.context.container.xxxUseCase`. Nouveaux use cases + repositories câblés dans `server/plugins/container.ts`. DTO Zod dans `shared/dto/wine-cellar.ts`, `safeParse` à la frontière.

### D8 — Schéma Drizzle
Nouveau fichier `server/database/schema/wine-cellar.ts` regroupant les tables du feature (`wine_cellars`, `wine_shelves`, `wine_rows`, `wines`, `wine_bottles`), enregistré dans `schema/index.ts`. Une migration générée par `pnpm db:generate`. Additif : aucune table existante touchée.

### D9 — Front
Section `/cave` : liste des caves, vue grille 2D par clayette (composant réutilisable slot/étage/clayette), vue liste filtrable, formulaires (structure, vin, bouteille, placement), page d'import avec écran de confirmation + rapport. Store Pinia **UI-only** ; composables `useApiWineCellar*` typés par les DTO. Entrée de navigation « Cave ». Sur mobile : liste par défaut, grille scrollable horizontalement.

## Risks / Trade-offs

- **[Comportement multi-NULL de l'index unique spécifique au SGBD]** → documenté ; valable sur MariaDB 11.4 (cible Docker). Un test d'intégration du repository (fake en mémoire) reproduit l'invariant « slot unique ».
- **[Course concurrente sur un même slot]** → l'`UNIQUE INDEX` est le backstop ; le repository traduit `ER_DUP_ENTRY` en 409 (même pattern que l'upsert `inventory`).
- **[Fichier `.xlsx` non fiable / volumineux / mal formé]** → limite de taille à l'upload, `try/catch` autour du parsing, erreurs converties en HTTP 400 avec message ; lignes invalides collectées dans `skippedRows` plutôt que d'échouer tout l'import.
- **[Réduction de capacité sous l'occupation]** → vérifiée en application avant persistance (409) ; couverte par un scénario de spec.
- **[Import sans dé-duplication → doublons si relancé]** → l'UI affiche un écran de confirmation rappelant que l'import n'écrase/ne fusionne pas l'existant.
- **[Nouvelle dépendance `exceljs`]** → isolée derrière `IWineImportParser` ; remplaçable sans toucher au domaine.
- **[Données de garde Vinotag peu fiables]** (apogée = dates générées par défaut) → à l'import, extraction d'année seulement si exploitable, sinon borne laissée vide plutôt que d'importer une valeur trompeuse.

## Migration Plan

1. Ajouter `exceljs` aux dépendances.
2. Créer le schéma `wine-cellar.ts` + `pnpm db:generate` → migration versionnée dans `server/database/migrations/`.
3. Déployer (migration additive, aucune donnée existante impactée). Rollback : `down` de la migration (drop des nouvelles tables) ; le reste de l'app est inchangé.
4. L'utilisateur crée sa cave (structure), lance l'import Vinotag, puis range les 56 bouteilles depuis le pool « à ranger ».

## Open Questions

- Faut-il aussi accepter un import **CSV** en plus du `.xlsx` (fallback plus simple/portable) ? Par défaut : non en v1, `.xlsx` seulement.
- Le champ `photoUrl` est prévu au modèle mais l'upload est hors v1 : conserve-t-on la colonne dès maintenant (recommandé, évite une migration ultérieure) ou l'ajoute-t-on plus tard ? Par défaut : colonne créée, non alimentée.
