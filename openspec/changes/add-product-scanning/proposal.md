# Proposal: Scan caméra de produits (enrichissement, rangement, consommation)

## Why

Le change `add-ingredients-catalog` a posé toute la fondation produit + code-barres : agrégat `Product`, VO `Barcode` (EAN-8 / EAN-13 / UPC-A normalisé, checksum), port `IBarcodeResolver` câblé à l'adapter `IngredientBarcodeResolver`, et même l'endpoint `GET /api/barcodes/[code]`. Mais rien de tout ça n'est exploité côté utilisateur : il n'y a pas de scanner caméra, et les use cases d'inventaire ignorent les produits (l'ajout d'un item passe encore par un `ingredientId` saisi manuellement).

Le scan est pourtant l'usage cible numéro 1 sur mobile : on rentre des courses, on rentre une recette, on sort un produit du placard. Ce change branche enfin le matériel existant en exposant trois flows utilisateur autour du même geste « pointer le code-barre avec son téléphone ».

## What Changes

### Cas d'usage couverts

1. **Enrichir la base** — scan d'un EAN inconnu. Le front bascule sur un formulaire de création de produit (marque, `packSize`, `packUnit`, image facultative) avec choix de l'ingrédient parent (existant ou créé à la volée).
2. **Ranger les courses** — scan d'un EAN connu. Le front pré-remplit un formulaire d'ajout d'inventaire avec `ingredient.storage`, `product.packSize/packUnit` et une **DLC suggérée** à `today + ingredient.shelfLifeDays` (modifiable). Validation → `InventoryItem` créé.
3. **Consommer / sortir** — scan d'un EAN connu pour décrémenter un `InventoryItem`. Stratégie **FIFO sur DLC** (le lot le plus proche de la péremption part en premier). Si plusieurs lots avec la même DLC, ou en mode « preview », l'utilisateur choisit.

### Nouveau côté serveur

- **Champ `expirationDate` (DLC) sur `InventoryItem`** : ajouté à l'entité, au schéma Drizzle (`date NULL`), au mapper, à la route `POST /api/inventory` et `PATCH /api/inventory/:id`. Optionnel à l'API ; quand `ingredient.shelfLifeDays` est défini et que l'appelant n'envoie pas de DLC, **le serveur calcule** `today + shelfLifeDays`. Pré-requis pour les flows scan-in et FIFO. **BREAKING** sur le contrat de réponse inventory : chaque item retourne désormais un champ `expirationDate?: string` (ISO date).
- **Use case `AddInventoryItemFromProductScanUseCase`** (`inventory/application/use-cases/`) : prend `productId` + `quantity` + DLC optionnelle. Résout le produit (via le port `IBarcodeResolver` ou un nouveau port d'accès produit — voir design.md), hydrate `ingredientId`, `storage`, calcule la DLC à défaut, crée l'`InventoryItem`.
- **Use case `ConsumeInventoryItemByBarcodeUseCase`** (`inventory/application/use-cases/`) : prend `barcode` + `quantity`. Résout le produit → ingrédient. Liste les `InventoryItem` du foyer pour cet `ingredientId`, triés FIFO par `expirationDate` ASC (NULLs en dernier). Mode `preview` : retourne la liste candidate sans modifier l'état. Mode normal : décrémente le 1ᵉʳ lot ; si quantité demandée > lot, déborde sur les lots suivants. Si quantité résultante d'un lot ≤ 0, l'item est supprimé (cohérent avec `Adjust Quantity`).
- **Routes HTTP** :
  - `POST /api/inventory/from-scan` — body : `{ productId, quantity: { value, unit }, expirationDate?, location? }` → 201 avec l'item créé.
  - `POST /api/inventory/consume-by-barcode` — body : `{ barcode, quantity: { value, unit }, lotId?, preview? }` → 200 avec lot(s) impacté(s) (ou liste candidate en preview).

### Nouveau côté front

- **Composable `useBarcodeScanner()`** (`app/composables/useBarcodeScanner.ts`) : encapsule `BarcodeDetector` natif (Chrome Android) avec **fallback dynamique** `@zxing/browser` pour Safari iOS / desktop. Gère les permissions caméra (gracieux si refusées), la sélection de la caméra arrière, démarre/arrête le flux MediaStream, et émet les EAN normalisés (string).
- **Composable `useApiBarcodes()`** : wrappe `GET /api/barcodes/[code]` et les nouveaux `POST /api/inventory/from-scan` + `POST /api/inventory/consume-by-barcode`. Typé via les DTO.
- **Composant `ScanModal.vue`** : modal plein écran avec la vidéo caméra + viewfinder + état (initialisation / prêt / scan en cours / résolu / erreur). Émet `scan` avec l'EAN normalisé. **Pas de saisie manuelle d'EAN** (hors scope explicite).
- **Composant `ScanResultDialog.vue`** : reçoit l'EAN scanné, appelle `GET /api/barcodes/:code`, puis bascule selon le mode :
  - `enrich` : formulaire de création de produit (réutilise `ProductForm` existant) avec sélecteur d'ingrédient (`IngredientPicker` existant). Si l'EAN est **déjà connu**, propose à la place de modifier le produit existant.
  - `stock-in` : formulaire de rangement (quantité, DLC pré-calculée, override location). Si l'EAN est **inconnu**, propose de basculer en mode `enrich`.
  - `consume` : formulaire de consommation (quantité). Si plusieurs lots, affiche la liste candidate (preview) avec sélection.
- **Intégrations** :
  - Page `/inventory` — deux boutons « Scanner pour ranger » et « Scanner pour consommer ».
  - Page `/ingredients/[id]` — bouton « Scanner un nouveau produit pour cet ingrédient » (mode `enrich` pré-ciblé).
  - Page `/ingredients/index` — bouton « Scanner un nouveau produit » (mode `enrich`, ingrédient libre).

### Suppressions et hors scope

- **Hors scope explicite (ne pas implémenter)** :
  - Cocher la liste de courses au scan.
  - Ajouter à la liste de courses au scan.
  - Scan multi-produits en rafale.
  - Intégration OpenFoodFacts ou toute API externe de résolution (le port `IBarcodeResolver` est déjà extensible).
  - Saisie manuelle d'EAN au clavier dans l'UI scan.
  - Lecture de DLC depuis le visuel du produit (OCR).
- **Pas de migration de données** : `expirationDate` ajoutée comme NULLable (les items existants restent NULL → traités comme « DLC inconnue » par le FIFO, placés en dernier).
- **Pas de suppression** du port `IBarcodeResolver` côté `inventory` : il reste utilisé et son contrat est déjà spec'é.

## Capabilities

### New Capabilities

- `product-scanning`: scan caméra de codes-barres dans l'UI et orchestration des trois flows (enrichissement catalogue, ajout d'inventaire pré-rempli, consommation FIFO). Couvre le composable scanner, la modal de scan, le `ScanResultDialog` multi-mode, les composables HTTP et les nouveaux endpoints scan-in / consume-by-barcode.

### Modified Capabilities

- `inventory`: ajoute le champ `expirationDate` (DLC) optionnel sur les items d'inventaire avec pré-remplissage serveur depuis `ingredient.shelfLifeDays`, deux nouveaux use cases (`AddInventoryItemFromProductScan`, `ConsumeInventoryItemByBarcode`) et leurs routes HTTP. Les routes inventory existantes voient leur réponse enrichie de `expirationDate` (champ optionnel, **BREAKING mineur** pour les clients qui valident strictement le schéma).

## Impact

**Code créé** :
- `server/contexts/inventory/application/use-cases/add-inventory-item-from-product-scan.use-case.ts`
- `server/contexts/inventory/application/use-cases/consume-inventory-item-by-barcode.use-case.ts`
- `server/api/inventory/from-scan.post.ts`
- `server/api/inventory/consume-by-barcode.post.ts`
- `shared/dto/scan.dto.ts` (Zod : `AddFromScanInput`, `ConsumeByBarcodeInput`, `ScanResult`)
- `app/composables/useBarcodeScanner.ts`
- `app/composables/useApiBarcodes.ts`
- `app/components/scan/ScanModal.vue`
- `app/components/scan/ScanResultDialog.vue`
- Tests : unit pour le use case FIFO (cas mono-lot, multi-lots, débordement, DLC null), integration HTTP pour les 2 nouvelles routes.

**Code modifié** :
- `server/database/schema/inventory-items.ts` : ajout `expirationDate: date('expiration_date')` (nullable).
- `server/database/migrations/` : nouvelle migration générée via `pnpm db:generate`.
- `server/contexts/inventory/domain/entities/inventory-item.entity.ts` : ajout du champ `expirationDate?: Date`.
- `server/contexts/inventory/infrastructure/mappers/inventory-item.mapper.ts` : round-trip de la DLC.
- `server/contexts/inventory/application/use-cases/add-inventory-item.use-case.ts` : accepte `expirationDate?` (sinon pré-remplit depuis `ingredient.shelfLifeDays`).
- `server/contexts/inventory/application/use-cases/update-inventory-item.use-case.ts` : permet d'éditer la DLC.
- `server/contexts/inventory/application/use-cases/list-inventory-items.use-case.ts` : renvoie `expirationDate` dans la vue.
- `server/contexts/inventory/domain/ports/inventory-item-repository.port.ts` : ajout d'une méthode `listByIngredientFifo(ingredientId, householdId)` (ou équivalent) pour le use case consume.
- `server/api/inventory/index.post.ts` & `[id].patch.ts` : acceptent `expirationDate` optionnelle ; format ISO date.
- `server/plugins/container.ts` : enregistre les 2 nouveaux use cases inventory.
- `app/pages/inventory/index.vue` : boutons scan + intégration des modals.
- `app/pages/ingredients/[id].vue` et `app/pages/ingredients/index.vue` : bouton scan (mode `enrich`).
- `app/components/InventoryItemForm.vue` : ajoute un champ DLC (date picker).
- `shared/dto/inventory.dto.ts` : `expirationDate?: string` (ISO date) dans le schéma de réponse + payload.

**DB** : 1 colonne ajoutée (`inventory_items.expiration_date date NULL`), 1 migration. Pas de backfill nécessaire (NULL acceptable).

**API** : 2 routes nouvelles. 4 routes existantes voient leur schéma de réponse augmenté d'un champ optionnel (`expirationDate`). Pas de breaking sur les payloads d'entrée existants — `expirationDate` y est optionnelle.

**Dépendances npm** :
- `@zxing/browser` (~80 KB gzip) en dépendance front, **chargée dynamiquement** (`import()` à l'intérieur de `useBarcodeScanner`) pour ne pas peser sur le bundle initial. Active uniquement en fallback (Safari iOS, desktop sans `BarcodeDetector`).
- Aucune dépendance serveur ajoutée.

**Permissions navigateur** : accès caméra requis (HTTPS obligatoire en production ; localhost OK en dev). La modal de scan affiche un message clair en cas de refus.

**Tests** : 100% des nouveaux use cases en integration (fakes en mémoire), VO `Barcode` déjà couvert. Pas de test E2E (Playwright hors scope v1 — cohérent avec la convention projet).

**Future work / Backlog** (mention explicite pour ne pas être réintroduit dans ce change) :
- Adapter `OpenFoodFactsBarcodeResolver` branché en stratégie de fallback dans `IBarcodeResolver` quand l'EAN est inconnu du catalogue local. Pré-remplirait alors le formulaire de création produit avec les données OFF (nom, marque, image, packSize).
- Scan rapide multi-produits en rafale (file d'attente d'EAN → validation groupée).
- Scan → cocher une ligne de la liste de courses.
- OCR de la DLC depuis la photo du produit.
