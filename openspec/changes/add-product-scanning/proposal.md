# Proposal: Scan caméra de produits (enrichissement, rangement, consommation)

## Why

Le change `add-ingredients-catalog` a posé toute la fondation produit + code-barres : agrégat `Product`, VO `Barcode` (EAN-8 / EAN-13 / UPC-A normalisé, checksum), port `IBarcodeResolver` câblé à l'adapter `IngredientBarcodeResolver`, et même l'endpoint `GET /api/barcodes/[code]`. Mais rien de tout ça n'est exploité côté utilisateur : il n'y a pas de scanner caméra, et les use cases d'inventaire ignorent les produits (l'ajout d'un item passe encore par un `ingredientId` saisi manuellement).

Le scan est pourtant l'usage cible numéro 1 sur mobile : on rentre des courses, on rentre une recette, on sort un produit du placard. Ce change branche enfin le matériel existant en exposant trois flows utilisateur autour du même geste « pointer le code-barre avec son téléphone ».

Le change profite aussi de l'occasion pour corriger une approximation du modèle actuel : `AddInventoryItemUseCase` crée systématiquement une nouvelle ligne d'inventaire à chaque appel, ce qui permet aujourd'hui d'avoir N lignes pour le même `(ingredientId, location)`. On bascule sur une sémantique **upsert/increment** : une ligne unique par `(ingredientId, location)`, dont la quantité s'incrémente.

## What Changes

### Cas d'usage couverts

1. **Enrichir la base** — scan d'un EAN inconnu. Le front bascule sur un formulaire de création de produit (marque, `packSize`, `packUnit`, image facultative) avec choix de l'ingrédient parent (existant ou créé à la volée).
2. **Ranger les courses** — scan d'un EAN connu. Le front pré-remplit un formulaire d'ajout d'inventaire avec `ingredient.storage` (location) et `product.packSize/packUnit` (quantité). Validation → la ligne d'inventaire pour `(ingredientId, location)` est créée ou incrémentée.
3. **Consommer / sortir** — scan d'un EAN connu pour décrémenter la quantité. Décrément en priorité sur la ligne à `ingredient.storage` ; débordement sur les autres `location` (FIFO sur `createdAt`) si la quantité demandée dépasse le stock par défaut.

### Modèle inventaire : ligne unique par (ingredientId, location)

- **Contrainte DB** : `UNIQUE (household_id, ingredient_id, location)` sur `inventory_items`. Migration générée via `pnpm db:generate`.
- **`AddInventoryItemUseCase`** change de sémantique : `create` → **upsert/increment**. Mêmes inputs qu'aujourd'hui (`ingredientId`, `quantity`, `location?`) ; si une ligne existe déjà pour ce couple, sa quantité est incrémentée et `updatedAt` rafraîchi ; sinon, nouvelle ligne. **BREAKING** sémantique : deux appels successifs renvoient désormais la même ressource (incrément cumulatif) au lieu de deux ressources distinctes — pas de cassure du contrat API d'entrée. Réponse : HTTP 201 si création, HTTP 200 si incrément (champ `created: boolean` ajouté à la réponse pour disambiguïté côté client).
- **`UpdateInventoryItemUseCase`** : si on tente de changer `location` vers une valeur où une autre ligne existe déjà pour le même ingrédient → HTTP 409 Conflict (pas d'auto-merge — l'utilisateur doit explicitement supprimer ou consommer l'une des deux). Pas de changement sur `quantity`, qui reste éditable librement (notamment pour corriger une erreur de saisie).

### Nouveau côté serveur

- **Port `IProductLookup`** déclaré dans `server/contexts/inventory/domain/ports/product-lookup.port.ts` : interface `findById(productId, householdId)` → `ProductSummary | null`. Implémentation `ProductLookupAdapter` côté `server/contexts/ingredients/infrastructure/`, câblée dans la composition root. Préserve l'isolation hexagonale (inventory n'importe pas de `~/server/contexts/ingredients/**`).
- **Use case `AddInventoryItemFromProductScanUseCase`** (`inventory/application/use-cases/`) : prend `productId` + `quantity` (+ `location?`). Résout le produit via `IProductLookup`, dérive `ingredientId`, applique la même logique upsert que `AddInventoryItemUseCase`.
- **Use case `ConsumeInventoryItemByBarcodeUseCase`** (`inventory/application/use-cases/`) : prend `barcode` + `quantity`. Résout le produit via `IBarcodeResolver` → ingrédient. Liste les lignes du foyer pour cet `ingredientId`, ordonnées : ligne à `ingredient.storage` d'abord, puis les autres locations par `createdAt ASC`. Décrémente le 1ʳᵉ lot ; si quantité demandée > ligne, déborde sur les suivantes. Si quantité résultante d'une ligne ≤ 0, elle est supprimée (cohérent avec `Adjust Quantity`). Mode `preview` : retourne la liste candidate sans modifier l'état (utile quand l'ingrédient a des lignes dans plusieurs locations).
- **Routes HTTP** :
  - `POST /api/inventory/from-scan` — body : `{ productId, quantity: { value, unit }, location? }` → 201 ou 200 avec la ligne créée/incrémentée + `created: boolean`.
  - `POST /api/inventory/consume-by-barcode` — body : `{ barcode, quantity: { value, unit }, preview? }` → 200 avec ligne(s) impactée(s) (ou liste candidate en preview).

### Nouveau côté front

- **Composable `useBarcodeScanner()`** (`app/composables/useBarcodeScanner.ts`) : encapsule `BarcodeDetector` natif (Chrome Android) avec **fallback dynamique** `@zxing/browser` pour Safari iOS / desktop. Gère les permissions caméra (gracieux si refusées), la sélection de la caméra arrière, démarre/arrête le flux MediaStream, et émet les EAN normalisés (string).
- **Composable `useApiBarcodes()`** : wrappe `GET /api/barcodes/[code]` et les nouveaux `POST /api/inventory/from-scan` + `POST /api/inventory/consume-by-barcode`. Typé via les DTO.
- **Composant `ScanModal.vue`** : modal plein écran avec la vidéo caméra + viewfinder + état (initialisation / prêt / scan en cours / résolu / erreur). Émet `scan` avec l'EAN normalisé. **Pas de saisie manuelle d'EAN** (hors scope explicite).
- **Composant `ScanResultDialog.vue`** : reçoit l'EAN scanné, appelle `GET /api/barcodes/:code`, puis bascule selon le mode :
  - `enrich` : formulaire de création de produit (réutilise `ProductForm` existant) avec sélecteur d'ingrédient (`IngredientPicker` existant). Si l'EAN est **déjà connu**, propose à la place de modifier le produit existant.
  - `stock-in` : formulaire de rangement (quantité = `product.packSize`/`packUnit` pré-remplie, location = `ingredient.storage` pré-remplie). Si l'EAN est **inconnu**, propose de basculer en mode `enrich`.
  - `consume` : formulaire de consommation (quantité). Si plusieurs locations contiennent l'ingrédient, affiche la liste candidate (preview) avec confirmation.
- **Intégrations** :
  - Page `/inventory` — deux boutons « Scanner pour ranger » et « Scanner pour consommer ».
  - Page `/ingredients/[id]` — bouton « Scanner un nouveau produit pour cet ingrédient » (mode `enrich` pré-ciblé).
  - Page `/ingredients/index` — bouton « Scanner un nouveau produit » (mode `enrich`, ingrédient libre).

### Suppressions et hors scope

- **Hors scope explicite (ne pas implémenter)** :
  - Date limite de consommation (DLC) — pas dans ce change.
  - Cocher la liste de courses au scan.
  - Ajouter à la liste de courses au scan.
  - Scan multi-produits en rafale.
  - Intégration OpenFoodFacts ou toute API externe de résolution (le port `IBarcodeResolver` est déjà extensible).
  - Saisie manuelle d'EAN au clavier dans l'UI scan.
- **Pas de suppression** du port `IBarcodeResolver` côté `inventory` : il reste utilisé et son contrat est déjà spec'é.

### Migration : déduplication préalable

Aucun utilisateur n'est en production, mais une base de dev locale peut déjà contenir des lignes dupliquées sur `(household_id, ingredient_id, location)`. La migration générée par `pnpm db:generate` ajoutera une contrainte `UNIQUE` et **échouera** sur ces bases. Solution recommandée : `pnpm db:reset` ou `docker compose down -v` avant d'appliquer la migration. Documenté dans le README.

## Capabilities

### New Capabilities

- `product-scanning`: scan caméra de codes-barres dans l'UI et orchestration des trois flows (enrichissement catalogue, ajout d'inventaire pré-rempli, consommation par décrément). Couvre le composable scanner, la modal de scan, le `ScanResultDialog` multi-mode, les composables HTTP et les nouveaux endpoints scan-in / consume-by-barcode.

### Modified Capabilities

- `inventory`: bascule de `AddInventoryItemUseCase` en sémantique **upsert/increment** avec contrainte d'unicité `(householdId, ingredientId, location)`, ajout de deux use cases (`AddInventoryItemFromProductScan`, `ConsumeInventoryItemByBarcode`) et de leurs routes HTTP, et conflit explicite sur changement de `location` vers une valeur déjà occupée.

## Impact

**Code créé** :
- `server/contexts/inventory/application/use-cases/add-inventory-item-from-product-scan.use-case.ts`
- `server/contexts/inventory/application/use-cases/consume-inventory-item-by-barcode.use-case.ts`
- `server/contexts/inventory/domain/ports/product-lookup.port.ts`
- `server/contexts/ingredients/infrastructure/product-lookup.adapter.ts`
- `server/api/inventory/from-scan.post.ts`
- `server/api/inventory/consume-by-barcode.post.ts`
- `shared/dto/scan.dto.ts` (Zod : `AddFromScanInput`, `ConsumeByBarcodeInput`, `ConsumeResponse`, `ConsumePreviewResponse`)
- `app/composables/useBarcodeScanner.ts`
- `app/composables/useApiBarcodes.ts`
- `app/components/scan/ScanModal.vue`
- `app/components/scan/ScanResultDialog.vue`
- Tests : unit pour le composable scanner (mock natif vs fallback), integration pour les use cases (upsert, consume avec/sans débordement, conflit de location), integration HTTP pour les 2 nouvelles routes + nouveaux scénarios upsert sur la route existante.

**Code modifié** :
- `server/database/schema/inventory-items.ts` : ajout de l'index unique `UNIQUE (household_id, ingredient_id, location)` ; nouvelle migration générée.
- `server/contexts/inventory/domain/ports/inventory-item-repository.port.ts` : ajout des méthodes `findByIngredientAndLocation(ingredientId, location, householdId)` et `listByIngredient(ingredientId, householdId)`.
- `server/contexts/inventory/infrastructure/repositories/drizzle-inventory-item.repository.ts` : implémentation des deux nouvelles méthodes + gestion du `MySqlError` `ER_DUP_ENTRY` → erreur métier.
- `server/contexts/inventory/application/use-cases/add-inventory-item.use-case.ts` : refonte en logique upsert. Retourne `{ item: InventoryItemView, created: boolean }` (signature changée).
- `server/contexts/inventory/application/use-cases/update-inventory-item.use-case.ts` : check d'unicité au changement de `location` → erreur `LocationConflictError`.
- `server/api/inventory/index.post.ts` : code HTTP 201 si `created: true`, sinon 200 ; expose le flag `created` dans la réponse.
- `server/api/inventory/[id].patch.ts` : map `LocationConflictError` → 409.
- `server/plugins/container.ts` : enregistre `productLookup`, `addInventoryItemFromProductScan`, `consumeInventoryItemByBarcode`.
- `server/types/container.ts` : déclare les nouveaux types.
- `app/pages/inventory/index.vue` : boutons scan + intégration des modals.
- `app/pages/ingredients/[id].vue` et `app/pages/ingredients/index.vue` : bouton scan (mode `enrich`).
- `shared/dto/inventory.ts` : champ `created: boolean` dans le schéma de réponse de `POST /api/inventory`.

**DB** : 1 contrainte ajoutée (`UNIQUE inventory_items_household_ingredient_location_uq`), 1 migration. Échoue sur des bases avec doublons existants → `db:reset` recommandé en dev.

**API** : 2 routes nouvelles. La route existante `POST /api/inventory` voit son contrat changer (peut renvoyer 200 au lieu de 201 si upsert, et le champ `created` apparaît dans la réponse) — **BREAKING mineur** documenté.

**Dépendances npm** :
- `@zxing/browser` (~80 KB gzip) en dépendance front, **chargée dynamiquement** (`import()` à l'intérieur de `useBarcodeScanner`) pour ne pas peser sur le bundle initial. Active uniquement en fallback (Safari iOS, desktop sans `BarcodeDetector`).
- Aucune dépendance serveur ajoutée.

**Permissions navigateur** : accès caméra requis (HTTPS obligatoire en production ; localhost OK en dev). La modal de scan affiche un message clair en cas de refus.

**Tests** : 100% des nouveaux use cases en integration (fakes en mémoire), VO `Barcode` déjà couvert. Pas de test E2E (Playwright hors scope v1 — cohérent avec la convention projet).

**Future work / Backlog** (mention explicite pour ne pas être réintroduit dans ce change) :
- Date limite de consommation (DLC) sur les lignes d'inventaire — quand on voudra des alertes péremption ou un FIFO basé sur la DLC plutôt que sur la location.
- Adapter `OpenFoodFactsBarcodeResolver` branché en stratégie de fallback dans `IBarcodeResolver` quand l'EAN est inconnu du catalogue local. Pré-remplirait alors le formulaire de création produit avec les données OFF (nom, marque, image, packSize).
- Scan rapide multi-produits en rafale (file d'attente d'EAN → validation groupée).
- Scan → cocher une ligne de la liste de courses.
- OCR de la DLC depuis la photo du produit (quand la DLC sera introduite).
