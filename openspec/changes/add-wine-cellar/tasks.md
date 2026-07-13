## 1. Fondations : schéma, DTO, dépendances

- [ ] 1.1 Ajouter `exceljs` aux dépendances (`pnpm add exceljs`) pour le parsing `.xlsx` de l'import.
- [ ] 1.2 Créer `server/database/schema/wine-cellar.ts` avec les tables `wine_cellars`, `wine_shelves`, `wine_rows`, `wines`, `wine_bottles` (IDs `char(36)`, `household_id` sur les racines, `size_ml int unsigned`, `garde_min/garde_max smallint`, position `row_id`/`depth` enum(`front`,`back`)/`slot_index` nullables, `status` enum(`in_stock`,`consumed`), `exit_reason`/`exit_date`/`tasting_note`). Ajouter `UNIQUE INDEX (row_id, depth, slot_index)` sur `wine_bottles`.
- [ ] 1.3 Enregistrer le schéma dans `server/database/schema/index.ts` et générer la migration (`pnpm db:generate`).
- [ ] 1.4 Créer `shared/dto/wine-cellar.ts` : schémas Zod (cave, clayette, étage, vin, bouteille, placement, sortie, filtres liste, rapport d'import) + enums robe et régions viticoles FR (+ `autre`).

## 2. Domaine `wine-cellar`

- [ ] 2.1 Entités structure : `Cellar`, `Shelf`, `Row` (+ invariants capacité `capacityBack ≥ 1`, `capacityFront ≥ 0`). Refs: add-wine-cellar §wine-cellar-structure
- [ ] 2.2 Value Object `SlotPosition` (`rowId`, `depth`, `index`) + validation `index ≥ 1`. Refs: add-wine-cellar §wine-cellar-structure
- [ ] 2.3 Entités collection : `Wine` (name requis, robe requise, garde `min ≤ max`, région dans la liste fermée) et `Bottle` (contenance `Quantity` volume, `status`, position optionnelle). Refs: add-wine-cellar §wine-collection
- [ ] 2.4 VO/service contenance : conversion via `Quantity` (dimension volume) et set de contenances usuelles (375/500/750/1500/3000 ml). Refs: add-wine-cellar §wine-collection
- [ ] 2.5 Erreurs métier : `CellarNotFound`, `ShelfNotEmpty`, `CapacityBelowOccupancy`, `SlotOutOfRange`, `SlotOccupied`, `WineNotFound`, `BottleNotFound`, `BottleAlreadyExited`, `IncoherentGardeWindow`, `RegionNotAllowed`.
- [ ] 2.6 Ports : `ICellarRepository`, `IWineRepository`, `IBottleRepository`, `IWineImportParser`.

## 3. Use cases (application)

- [ ] 3.1 Structure : `CreateCellar`, `RenameCellar`, `DeleteCellar`, `AddShelf`, `DeleteShelf` (refus si non vide), `AddRow`, `UpdateRowCapacity` (refus si sous l'occupation), `GetCellarWithLayout` (structure + occupation des slots). Refs: add-wine-cellar §wine-cellar-structure
- [ ] 3.2 Vins : `CreateWine`, `UpdateWine`, `ListWines`, `GetWine`. Refs: add-wine-cellar §wine-collection
- [ ] 3.3 Bouteilles : `AddBottles` (N instances non placées ou placées), `PlaceBottle`/`MoveBottle` (slot libre, sinon `SlotOccupied`), `UnassignBottle` (retour au pool). Refs: add-wine-cellar §wine-collection
- [ ] 3.4 Sortie : `ExitBottle` (`consumed`/`gifted`/`broken`, date + note, libère le slot, refus double sortie) et `ListExitJournal` (projection sur bouteilles `consumed`). Refs: add-wine-cellar §wine-collection
- [ ] 3.5 Liste filtrable : `ListBottles` avec filtres robe/région/domaine/apogée + tri, indiquant l'emplacement ou « à ranger ». Refs: add-wine-cellar §wine-cellar-visualization
- [ ] 3.6 Import : `ImportVinotagUseCase` consommant les lignes normalisées → crée vins + bouteilles non placées + rapport (`winesCreated`, `bottlesCreated`, `skippedRows`). Refs: add-wine-cellar §wine-cellar-import

## 4. Infrastructure

- [ ] 4.1 Mappers row Drizzle ↔ entités (`cellar`, `shelf`, `row`, `wine`, `bottle`) incluant `Quantity` pour la contenance.
- [ ] 4.2 Repositories Drizzle (`DrizzleCellarRepository`, `DrizzleWineRepository`, `DrizzleBottleRepository`), tous scoped `householdId` ; traduction `ER_DUP_ENTRY` (slot) → conflit d'occupation.
- [ ] 4.3 Adapter `ExcelJsWineImportParser` (implémente `IWineImportParser`) : lit le `.xlsx`, valide la présence de `wine_name`, applique le mapping colonnes → lignes normalisées (robe, région slug→enum, contenance→ml, pays ISO→libellé, garde année, prix, date d'ajout, note ; ignore `favorite`/`bottle_real_price`). Refs: add-wine-cellar §wine-cellar-import
- [ ] 4.4 Câbler tous les repositories + use cases + parser dans `server/plugins/container.ts`.

## 5. API HTTP (`server/api/cave/**`)

- [ ] 5.1 Caves : `GET/POST /api/cave/cellars`, `GET/PATCH/DELETE /api/cave/cellars/[id]` (avec layout + occupation). Refs: add-wine-cellar §wine-cellar-structure
- [ ] 5.2 Clayettes & étages : `POST /api/cave/cellars/[id]/shelves`, `DELETE .../shelves/[id]`, `POST .../shelves/[id]/rows`, `PATCH/DELETE .../rows/[id]`. Refs: add-wine-cellar §wine-cellar-structure
- [ ] 5.3 Vins : `GET/POST /api/cave/wines`, `GET/PATCH /api/cave/wines/[id]`. Refs: add-wine-cellar §wine-collection
- [ ] 5.4 Bouteilles : `POST /api/cave/wines/[id]/bottles` (dont `buyingPrice`), `PATCH /api/cave/bottles/[id]` (édition attributs : prix d'achat, contenance, date d'ajout ; refus prix négatif 400), `PATCH /api/cave/bottles/[id]/position`, `POST /api/cave/bottles/[id]/exit`, `GET /api/cave/bottles` (liste filtrable), `GET /api/cave/journal`. Refs: add-wine-cellar §wine-collection §wine-cellar-visualization
- [ ] 5.5 Import : `POST /api/cave/import` (upload multipart `.xlsx`, refus autre type, limite de taille, renvoie le rapport). Refs: add-wine-cellar §wine-cellar-import
- [ ] 5.6 Toutes les routes via `requireHouseholdMember()` + `safeParse` des DTO ; codes 400/404/409 conformes aux specs.

## 6. Front (`app/`)

- [ ] 6.1 Composables `useApiWineCellar*` typés par les DTO ; store Pinia UI-only (filtres, clayette sélectionnée).
- [ ] 6.2 Page `/cave` : liste des caves + entrée de navigation « Cave ».
- [ ] 6.3 Composants structure : formulaires création/édition cave, clayette, étage (capacités avant/arrière).
- [ ] 6.4 Vue grille 2D par clayette : étages en lignes, rangées arrière/avant, slots cliquables, code couleur robe + libellé, slot vide → placement depuis le pool. Refs: add-wine-cellar §wine-cellar-visualization
- [ ] 6.5 Vue liste filtrable (robe/région/domaine/apogée, tri) affichant l'emplacement complet ou « à ranger ». Refs: add-wine-cellar §wine-cellar-visualization
- [ ] 6.6 Formulaires vin & bouteille (dont champ **prix d'achat** en euros) + actions boire (motif + note de dégustation) / déplacer / ranger. Refs: add-wine-cellar §wine-collection
- [ ] 6.7 Page d'import Vinotag : upload, écran de confirmation (avertissement pas de fusion), affichage du rapport. Refs: add-wine-cellar §wine-cellar-import
- [ ] 6.8 Responsive : liste par défaut sur mobile, grille scrollable horizontalement. Refs: add-wine-cellar §wine-cellar-visualization

## 7. Tests

- [ ] 7.1 `tests/unit/` : VO contenance (cl/L→ml), `SlotPosition`, invariants capacité, garde `min ≤ max`, prix d'achat positif, mapping Vinotag (robe, région, contenance, **prix `bottle_buying_price` vs `bottle_real_price` ignoré**, colonnes ignorées, ligne sans nom).
- [ ] 7.2 `tests/integration/` : use cases avec repositories en mémoire couvrant chaque scénario des specs (création cave, capacités, placement/slot occupé 409, déplacement, sortie + journal, double sortie 409, import + rapport + skippedRows).
- [ ] 7.3 `tests/integration/http/` : smoke tests des routes clés (`POST /api/cave/cellars`, placement 409, `POST /api/cave/import`).
- [ ] 7.4 `pnpm lint` (isolation domaine), `pnpm typecheck`, `pnpm test` verts.

## 8. Validation & doc

- [ ] 8.1 Valider le change : `openspec validate add-wine-cellar --all` (ou `--strict`).
- [ ] 8.2 Vérifier l'import de bout en bout avec l'export réel « export-Cave J.R » (32 vins / 56 bouteilles, rapport attendu).
- [ ] 8.3 Mettre à jour `README.md`/nav si nécessaire (nouvelle section Cave).
