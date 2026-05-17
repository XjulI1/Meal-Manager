# Tasks

Checklist d'implémentation du change `add-product-scanning`. Ordonnée pour permettre une livraison incrémentale : à la fin de chaque section, l'application doit rester exécutable (`pnpm test` vert, `pnpm build` OK, `pnpm typecheck` vert, `pnpm lint` vert).

## 1. Schéma DB et migration

- [ ] 1.1 Modifier `server/database/schema/inventory-items.ts` : ajouter `expirationDate: date('expiration_date')` (nullable, sans default)
- [ ] 1.2 Lancer `pnpm db:generate` pour produire la migration `add expiration_date to inventory_items`
- [ ] 1.3 Vérifier la migration générée (un seul `ALTER TABLE inventory_items ADD COLUMN expiration_date date NULL`) et la commiter

## 2. DTO partagés

- [ ] 2.1 Modifier `shared/dto/inventory.ts` : ajouter `expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()` dans `InventoryCreateSchema`, `InventoryUpdateSchema`, `InventoryResponseSchema`
- [ ] 2.2 Créer `shared/dto/scan.dto.ts` :
  - `AddFromScanSchema` : `{ productId, quantity: { value, unit }, expirationDate?, location? }`
  - `ConsumeByBarcodeSchema` : `{ barcode, quantity: { value, unit }, lotId?, preview? }`
  - `ScanResultSchema` : `{ ingredient: IngredientView, product: ProductView }` (réutilise les schémas ingredient/product existants)
  - `ConsumePreviewResponseSchema` : `{ candidates: Array<{ lotId, expirationDate, currentQuantity, wouldRemove }>, totalAvailable, fullyConsumed }`
  - `ConsumeResponseSchema` : `{ impactedLots: Array<{ lotId, quantityRemoved, remainingQuantity, deleted }> }`
- [ ] 2.3 Exporter les schémas depuis l'index des DTO

## 3. Domain inventory — entité, port produit

- [ ] 3.1 Modifier `server/contexts/inventory/domain/entities/inventory-item.entity.ts` : ajouter `readonly expirationDate?: Date` (optionnel, Date sans heure), propager dans `create()`, `rehydrate()`, `props()`, et ajouter une méthode `withExpirationDate(date | undefined, now)`
- [ ] 3.2 Créer `server/contexts/inventory/domain/ports/product-lookup.port.ts` :
  ```ts
  export interface ProductSummary {
    id: string
    ingredientId: string
    packSize: number
    packUnit: 'g' | 'ml' | 'unit'
  }
  export interface IProductLookup {
    findById(productId: string, householdId: string): Promise<ProductSummary | null>
  }
  ```
- [ ] 3.3 Étendre `server/contexts/inventory/domain/ports/inventory-item-repository.port.ts` : ajouter `listByIngredientFifo(ingredientId: string, householdId: string): Promise<InventoryItem[]>` (trié `expirationDate ASC NULLS LAST, createdAt ASC`)
- [ ] 3.4 Pas de nouvelles erreurs domaine pour ce change : on réutilise `InvalidQuantityError`, `ItemNotFoundError`, `InvalidIngredientReferenceError` et on ajoute un seul `ProductNotInHouseholdError` dans `errors/` si besoin (sinon HTTP 404 mappé depuis null)

## 4. Infrastructure inventory — mapper, repository

- [ ] 4.1 Modifier `server/contexts/inventory/infrastructure/mappers/inventory-item.mapper.ts` : round-trip de `expirationDate` (Date ↔ string `YYYY-MM-DD` ↔ colonne `date` MySQL)
- [ ] 4.2 Modifier `server/contexts/inventory/infrastructure/repositories/drizzle-inventory-item.repository.ts` : `save()` persiste `expirationDate`, `findById()`/`list()` la rehydrate
- [ ] 4.3 Implémenter `listByIngredientFifo()` dans le repo Drizzle (ORDER BY `expiration_date ASC NULLS LAST, created_at ASC`)
- [ ] 4.4 Mettre à jour le **fake repository** utilisé dans les tests d'intégration pour exposer les mêmes méthodes (avec le tri FIFO en mémoire)

## 5. Infrastructure ingredients — adapter IProductLookup

- [ ] 5.1 Créer `server/contexts/ingredients/infrastructure/product-lookup.adapter.ts` qui implémente `IProductLookup` de inventory en s'appuyant sur `IProductRepository` (récupère le produit par id, filtre par `householdId`, retourne un `ProductSummary`)
- [ ] 5.2 Tests unitaires de l'adapter (mock du `IProductRepository`) : produit du foyer → ProductSummary ; produit d'un autre foyer → null ; id inexistant → null

## 6. Use cases inventory — DLC sur add/update existants

- [ ] 6.1 Modifier `AddInventoryItemUseCase` : accepter `expirationDate?: Date | null` dans l'input ; si non fourni et `ingredient.shelfLifeDays` défini, calculer `clock() + shelfLifeDays` ; sinon stocker `undefined`. Injecter `clock` (déjà présent).
- [ ] 6.2 Modifier `UpdateInventoryItemUseCase` : accepter `expirationDate?: Date | null` (avec null explicite pour clear)
- [ ] 6.3 Modifier `ListInventoryItemsUseCase` : exposer `expirationDate` dans la vue retournée (ISO `YYYY-MM-DD` ou null)
- [ ] 6.4 Tests d'intégration mis à jour : tous les scénarios de la requirement modifiée `Adding an Inventory Item` (incluant DLC auto, DLC explicite, ingrédient sans `shelfLifeDays`, format invalide)
- [ ] 6.5 Tests d'intégration : `Updating an Inventory Item` (update DLC, clear DLC à null)

## 7. Use case `AddInventoryItemFromProductScan`

- [ ] 7.1 Créer `server/contexts/inventory/application/use-cases/add-inventory-item-from-product-scan.use-case.ts` : 
  - dépendances : `IInventoryItemRepository`, `IProductLookup`, `IIngredientLookup`, `idGenerator`, `clock`
  - input : `{ householdId, productId, quantity, expirationDate?, location? }`
  - logique : 
    1. `productLookup.findById(productId, householdId)` → 404 si null
    2. `ingredientLookup.findById(product.ingredientId, householdId)` → 400 si null ou archivé (cas défensif)
    3. validation unité vs `ingredient.canonicalUnit`
    4. pré-calcul DLC depuis `shelfLifeDays` si non fournie
    5. construire et sauvegarder l'`InventoryItem`
  - sortie : `InventoryItemView`
- [ ] 7.2 Tests d'intégration (`tests/integration/inventory/add-inventory-item-from-product-scan.test.ts`) : tous les scénarios de la requirement `Adding an Inventory Item from a Product Scan` (defaults, DLC explicite, location override, produit inconnu, produit d'un autre foyer, unité incompatible)
- [ ] 7.3 Test ESLint/architecture : vérifier qu'aucun import depuis `~/server/contexts/ingredients/**` n'apparaît dans le use case (régression contre la règle d'isolation déjà active)

## 8. Use case `ConsumeInventoryItemByBarcode`

- [ ] 8.1 Créer `server/contexts/inventory/application/use-cases/consume-inventory-item-by-barcode.use-case.ts` :
  - dépendances : `IInventoryItemRepository`, `IBarcodeResolver`, `IIngredientLookup`, `clock`
  - input : `{ householdId, barcode, quantity, lotId?, preview? }`
  - logique :
    1. résoudre le barcode via `IBarcodeResolver` → 404 si null
    2. vérifier `ingredientId` non vide dans la résolution (sinon 404)
    3. valider la conversion d'unité (`Quantity` VO)
    4. lister les lots via `listByIngredientFifo(ingredientId, householdId)`
    5. si `lotId` fourni : filtrer le tableau à ce seul lot (404 si introuvable dans le résultat)
    6. parcourir la queue FIFO : drainer `quantity.value` du premier lot, puis du suivant, etc.
    7. si somme disponible < demande → 400 (sans modifier l'état)
    8. mode preview : retourner les candidats avec `wouldRemove` (sans `save()`)
    9. mode normal : pour chaque lot impacté → `save()` ou `delete()` si tombe à zéro
  - sortie : preview ou impact selon le mode
- [ ] 8.2 Tests d'intégration (`tests/integration/inventory/consume-inventory-item-by-barcode.test.ts`) : tous les scénarios de la requirement `Consuming Inventory by Barcode (FIFO on DLC)` (single lot, FIFO multi-lots, overflow, insuffisant, preview, lotId explicite, barcode inconnu, barcode invalide, unité incompatible)
- [ ] 8.3 Test spécifique du tri FIFO : 3 lots avec DLC `2026-06-01`, `2026-06-15`, `null` → ordre vérifié

## 9. Composition root (DI)

- [ ] 9.1 Modifier `server/plugins/container.ts` : instancier `ProductLookupAdapter` (depuis ingredients/infrastructure) et l'enregistrer comme `productLookup` sur le container
- [ ] 9.2 Instancier `AddInventoryItemFromProductScanUseCase` et `ConsumeInventoryItemByBarcodeUseCase`, les exposer sur le container
- [ ] 9.3 Modifier `server/types/container.ts` : déclarer `productLookup: IProductLookup`, `addInventoryItemFromProductScan`, `consumeInventoryItemByBarcode`
- [ ] 9.4 Smoke test container : tous les nouveaux use cases sont définis sur `event.context.container` (test HTTP existant à étendre ou nouveau)

## 10. Routes HTTP — modifications

- [ ] 10.1 Modifier `server/api/inventory/index.post.ts` : accepter `expirationDate?: string | null` dans le body, validation Zod, passer au use case
- [ ] 10.2 Modifier `server/api/inventory/[id].patch.ts` : accepter `expirationDate?: string | null` (null clear)
- [ ] 10.3 Modifier `server/api/inventory/index.get.ts` (et le mapper de réponse) : retourner `expirationDate` dans chaque item
- [ ] 10.4 Smoke tests HTTP correspondants (extension de `tests/integration/http/inventory.test.ts` ou équivalent)

## 11. Routes HTTP — nouvelles

- [ ] 11.1 Créer `server/api/inventory/from-scan.post.ts` :
  - `requireHouseholdMember()`
  - parse body via `AddFromScanSchema`
  - délègue à `event.context.container.addInventoryItemFromProductScan`
  - mappe erreurs : `ProductNotInHousehold` → 404, `InvalidIngredientReference` → 400, `IncompatibleUnits` → 400, `InvalidQuantity` → 400
- [ ] 11.2 Créer `server/api/inventory/consume-by-barcode.post.ts` :
  - `requireHouseholdMember()`
  - parse body via `ConsumeByBarcodeSchema`
  - délègue à `event.context.container.consumeInventoryItemByBarcode`
  - mappe erreurs : barcode inconnu → 404, `InvalidBarcodeFormatError` → 400, quantité insuffisante → 400, `IncompatibleUnits` → 400
- [ ] 11.3 Smoke tests HTTP des deux nouvelles routes (cas heureux + 1 cas d'erreur chacun)

## 12. Front — dépendances et composables

- [ ] 12.1 Ajouter `@zxing/browser` comme dépendance front (`pnpm add @zxing/browser`)
- [ ] 12.2 Créer `app/composables/useBarcodeScanner.ts` :
  - état réactif : `state: 'idle' | 'initializing' | 'ready' | 'scanning' | 'scanned' | 'error'`, `permission: 'granted' | 'denied' | 'prompt'`, `error?: 'insecure-context' | 'permission-denied' | 'no-camera' | 'detector-failed'`
  - méthodes `start(videoEl: HTMLVideoElement)` et `stop()`
  - détection `window.isSecureContext` avant tout ; émet `error: 'insecure-context'` si false (mais autorise localhost via la propriété native)
  - détection `'BarcodeDetector' in window` :
    - si oui → instancier `new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] })`, lancer un loop `requestAnimationFrame` qui appelle `detect(videoEl)`
    - si non → `const { BrowserMultiFormatReader } = await import('@zxing/browser')` puis `decodeFromVideoDevice(...)`
  - `getUserMedia({ video: { facingMode: { exact: 'environment' } } })` avec fallbacks
  - dé-doublonnage : émettre uniquement après 2 lectures consécutives du même code (cf. design D7)
  - exposer `onScan(callback: (code: string) => void)`
- [ ] 12.3 Test unitaire ou story manuelle du composable (vitest jsdom : mock `BarcodeDetector` + mock `getUserMedia`). Au minimum : un test qui prouve que le path zxing **n'est PAS chargé** si `BarcodeDetector` est défini.
- [ ] 12.4 Créer `app/composables/useApiBarcodes.ts` : 
  - `resolve(code: string)` → `GET /api/barcodes/:code` (retourne `ScanResult | null`)
  - `addFromScan(input: AddFromScanInput)` → `POST /api/inventory/from-scan`
  - `consumeByBarcode(input: ConsumeByBarcodeInput)` → `POST /api/inventory/consume-by-barcode`
  - typage strict via les schémas Zod de `shared/dto/scan.dto.ts`

## 13. Front — composants

- [ ] 13.1 Créer `app/components/scan/ScanModal.vue` :
  - modal Nuxt UI plein écran avec `<video>` autoplay + viewfinder (cadre + ligne laser)
  - intègre `useBarcodeScanner`, démarre au mount, stoppe au unmount
  - émet `@scan="code"` quand un code est détecté
  - affiche des états : initialisation / prêt à scanner / scan réussi / erreur (avec message contextualisé : permission refusée, HTTPS requis, caméra introuvable)
  - aucun champ `<input>` pour saisie manuelle (vérifier au snapshot)
- [ ] 13.2 Créer `app/components/scan/ScanResultDialog.vue` :
  - props : `barcode: string`, `mode: 'enrich' | 'stock-in' | 'consume'`, `preselectedIngredientId?: string`
  - au mount : appelle `useApiBarcodes().resolve(barcode)`
  - mode `enrich` :
    - inconnu → embarque `ProductForm` avec barcode pré-rempli + `IngredientPicker` (option `preselectedIngredientId` si fournie)
    - connu → affiche le produit existant + bouton "Modifier ce produit" (réutilise `ProductForm` en édition)
  - mode `stock-in` :
    - inconnu → affiche "Produit inconnu" + bouton "Le créer d'abord" qui bascule en mode `enrich`
    - connu → formulaire d'ajout pré-rempli (quantité = `product.packSize`/`packUnit`, location = `ingredient.storage`, DLC = aujourd'hui + `ingredient.shelfLifeDays` si défini)
  - mode `consume` :
    - inconnu → 404 dans le call resolve → message "Produit inconnu"
    - connu → call `consumeByBarcode({ ..., preview: true })` ; si 1 candidat → formulaire direct ; si N candidats → liste FIFO avec `lotId` sélectionnable ; submit appelle la version sans `preview`

## 14. Front — intégrations dans les pages

- [ ] 14.1 Modifier `app/components/InventoryItemForm.vue` : ajouter un champ `expirationDate` (date picker, optionnel)
- [ ] 14.2 Modifier `app/pages/inventory/index.vue` :
  - ajouter deux boutons "Scanner pour ranger" (`mode: 'stock-in'`) et "Scanner pour consommer" (`mode: 'consume'`)
  - orchestration : ouvrir `ScanModal` ; sur `@scan`, fermer la modal et ouvrir `ScanResultDialog` avec le bon mode
  - sur succès du dialog : rafraîchir la liste d'inventaire ; afficher la DLC dans chaque ligne
- [ ] 14.3 Modifier `app/pages/ingredients/index.vue` : ajouter le bouton "Scanner un nouveau produit" (`mode: 'enrich'`, pas d'ingrédient présélectionné)
- [ ] 14.4 Modifier `app/pages/ingredients/[id].vue` : ajouter le bouton "Scanner un nouveau produit pour cet ingrédient" (`mode: 'enrich'`, `preselectedIngredientId` = id de la page)

## 15. Tests, lint, doc

- [ ] 15.1 `pnpm typecheck` vert
- [ ] 15.2 `pnpm lint` vert (vérifier qu'aucune violation de la règle d'isolation domain n'a été introduite)
- [ ] 15.3 `pnpm test` vert (unit + integration + smoke HTTP)
- [ ] 15.4 Vérifier manuellement en dev (`pnpm dev`, HTTPS via tunnel ou localhost) :
  - scan d'un EAN connu en mode `stock-in` → DLC pré-remplie correctement
  - scan d'un EAN connu en mode `consume` avec 3 lots de DLC différentes → ordre FIFO respecté
  - scan d'un EAN inconnu en mode `enrich` → formulaire de création produit
  - refus de permission caméra → message clair, pas de fallback texte
- [ ] 15.5 Mettre à jour `README.md` : section "Permissions navigateur" mentionnant que le scan caméra nécessite HTTPS (sauf localhost)
- [ ] 15.6 Vérifier que `CLAUDE.md` reste à jour (devrait l'être : pas de nouveau bounded context, pas de nouvelle commande)
- [ ] 15.7 `npx -y -p @fission-ai/openspec@latest openspec validate add-product-scanning` vert avant de soumettre la PR
