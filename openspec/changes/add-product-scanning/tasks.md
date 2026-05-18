# Tasks

Checklist d'implémentation du change `add-product-scanning`. Ordonnée pour permettre une livraison incrémentale : à la fin de chaque section, l'application doit rester exécutable (`pnpm test` vert, `pnpm build` OK, `pnpm typecheck` vert, `pnpm lint` vert).

## 1. Schéma DB et migration (contrainte d'unicité)

- [ ] 1.1 Modifier `server/database/schema/inventory-items.ts` : ajouter `unique('inventory_items_household_ingredient_location_uq').on(t.householdId, t.ingredientId, t.location)` dans le builder des index/contraintes
- [ ] 1.2 Lancer `pnpm db:generate` pour produire la migration `add unique constraint on inventory_items (household, ingredient, location)`
- [ ] 1.3 Vérifier la migration générée (un seul `ALTER TABLE inventory_items ADD UNIQUE INDEX ...`) et la commiter
- [ ] 1.4 Mettre à jour le README : section "Migration & développement" documentant que cette migration échoue si la base locale contient des doublons sur `(household_id, ingredient_id, location)` ; recommander `pnpm db:reset` ou `docker compose down -v`

## 2. DTO partagés

- [ ] 2.1 Modifier `shared/dto/inventory.ts` : ajouter `created: z.boolean()` dans `InventoryCreateResponseSchema` (réponse de `POST /api/inventory`). Le payload d'entrée ne change pas.
- [ ] 2.2 Créer `shared/dto/scan.dto.ts` :
  - `AddFromScanSchema` : `{ productId, quantity: { value, unit }, location? }`
  - `AddFromScanResponseSchema` : `{ item: InventoryItemView, created: boolean }`
  - `ConsumeByBarcodeSchema` : `{ barcode, quantity: { value, unit }, preview? }`
  - `ConsumePreviewResponseSchema` : `{ candidates: Array<{ lineId, location, currentQuantity, wouldRemove }>, totalAvailable, fullyConsumed }`
  - `ConsumeResponseSchema` : `{ impactedLines: Array<{ lineId, location, quantityRemoved, remainingQuantity, deleted }> }`
- [ ] 2.3 Exporter les schémas depuis l'index des DTO

## 3. Domain inventory — ports

- [ ] 3.1 Créer `server/contexts/inventory/domain/ports/product-lookup.port.ts` :
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
- [ ] 3.2 Étendre `server/contexts/inventory/domain/ports/inventory-item-repository.port.ts` :
  - `findByIngredientAndLocation(ingredientId: string, location: StorageLocation | string, householdId: string): Promise<InventoryItem | null>`
  - `listByIngredient(ingredientId: string, householdId: string): Promise<InventoryItem[]>` (utilisé par consume ; le tri par défaut storage + createdAt est fait dans le use case, pas dans le repo)
- [ ] 3.3 Ajouter l'erreur métier `server/contexts/inventory/domain/errors/location-conflict.error.ts` (pour le 409 sur update)
- [ ] 3.4 Ajouter l'erreur métier `server/contexts/inventory/domain/errors/insufficient-quantity.error.ts` (pour le 400 consume) si non couverte par les erreurs existantes

## 4. Infrastructure inventory — repository

- [ ] 4.1 Modifier `server/contexts/inventory/infrastructure/repositories/drizzle-inventory-item.repository.ts` :
  - Implémenter `findByIngredientAndLocation()` (SELECT avec WHERE composite)
  - Implémenter `listByIngredient()` (SELECT WHERE ingredient_id + household_id)
  - `save()` doit gérer `ER_DUP_ENTRY` MySQL (`mysql2` error code) sur l'INSERT : intercepter et relancer une exception métier dédiée que le use case peut traiter (retry 1 fois)
- [ ] 4.2 Mettre à jour le **fake repository** utilisé en tests d'intégration : ajouter les deux nouvelles méthodes + simulation du conflit d'unicité à l'insert (déclenche une erreur que les tests d'intégration peuvent reproduire)

## 5. Infrastructure ingredients — adapter IProductLookup

- [ ] 5.1 Créer `server/contexts/ingredients/infrastructure/product-lookup.adapter.ts` qui implémente `IProductLookup` de inventory en s'appuyant sur `IProductRepository` (récupère le produit par id, filtre par `householdId`, retourne un `ProductSummary`)
- [ ] 5.2 Tests unitaires de l'adapter (mock du `IProductRepository`) : produit du foyer → ProductSummary ; produit d'un autre foyer → null ; id inexistant → null

## 6. Use case `AddInventoryItemUseCase` (refonte upsert)

- [ ] 6.1 Modifier `server/contexts/inventory/application/use-cases/add-inventory-item.use-case.ts` :
  - Nouvelle logique : `findByIngredientAndLocation()` → si existant, `withQuantity(existing.quantity.add(input.quantity), now)` + `save()` + retourne `{ item, created: false }` ; sinon, créer + `save()` + retourne `{ item, created: true }`
  - Gérer le `ER_DUP_ENTRY` (concurrent insert) : intercepter via l'erreur métier dédiée, relancer la branche upsert (retry 1 fois max)
  - Signature de retour change : `{ item: InventoryItemView, created: boolean }` au lieu de `InventoryItemView`
- [ ] 6.2 Adapter `Quantity` si besoin : vérifier que la méthode d'addition de quantité canonique existe (`Quantity.add(other)`) ; sinon l'ajouter avec ses tests unitaires
- [ ] 6.3 Tests d'intégration mis à jour (`tests/integration/inventory/add-inventory-item.test.ts`) : tous les scénarios de la requirement modifiée (création, incrément, conversion d'unité à l'incrément, même ingrédient locations différentes, location dérivée de l'ingrédient, concurrence avec retry)

## 7. Use case `UpdateInventoryItemUseCase` (conflit de location)

- [ ] 7.1 Modifier `server/contexts/inventory/application/use-cases/update-inventory-item.use-case.ts` : quand `input.location` est fourni et différent de la location actuelle, appeler `findByIngredientAndLocation(ingredientId, input.location, householdId)` ; si un item différent existe → lever `LocationConflictError`
- [ ] 7.2 Tests d'intégration : `Update location to a free location` (OK), `Update location collides with an existing line` (409)

## 8. Use case `AddInventoryItemFromProductScan`

- [ ] 8.1 Créer `server/contexts/inventory/application/use-cases/add-inventory-item-from-product-scan.use-case.ts` :
  - dépendances : `IInventoryItemRepository`, `IProductLookup`, `IIngredientLookup`, `idGenerator`, `clock`
  - input : `{ householdId, productId, quantity, location? }`
  - logique :
    1. `productLookup.findById(productId, householdId)` → 404 si null
    2. `ingredientLookup.findById(product.ingredientId, householdId)` → erreur si null ou archivé (cas défensif)
    3. validation unité vs `ingredient.canonicalUnit`
    4. déléguer à `AddInventoryItemUseCase.execute({ householdId, ingredientId: product.ingredientId, quantity, location })` (réutilise la logique upsert) — OU dupliquer la logique upsert si l'injection croisée de use cases ne te plaît pas
  - sortie : `{ item: InventoryItemView, created: boolean }`
- [ ] 8.2 Tests d'intégration (`tests/integration/inventory/add-inventory-item-from-product-scan.test.ts`) : tous les scénarios de la requirement (création, incrément d'une ligne existante, location override, produit inconnu, produit d'un autre foyer, unité incompatible)
- [ ] 8.3 Test ESLint/architecture : vérifier qu'aucun import depuis `~/server/contexts/ingredients/**` n'apparaît dans le use case (régression contre la règle d'isolation déjà active)

## 9. Use case `ConsumeInventoryItemByBarcode`

- [ ] 9.1 Créer `server/contexts/inventory/application/use-cases/consume-inventory-item-by-barcode.use-case.ts` :
  - dépendances : `IInventoryItemRepository`, `IBarcodeResolver`, `IIngredientLookup`, `clock`
  - input : `{ householdId, barcode, quantity, preview? }`
  - logique :
    1. résoudre le barcode via `IBarcodeResolver` → 404 si null
    2. vérifier `ingredientId` non vide dans la résolution (sinon 404)
    3. valider la conversion d'unité (`Quantity` VO) vs `ingredient.canonicalUnit`
    4. `listByIngredient(ingredientId, householdId)` puis trier en mémoire : ligne à `ingredient.storage` en premier, puis les autres par `createdAt ASC`
    5. parcourir la queue : drainer `quantity.value` de la première ligne, puis de la suivante, etc.
    6. si somme disponible < demande → 400 `InsufficientQuantityError` (sans modifier l'état)
    7. mode preview : retourner les candidats avec `wouldRemove` (sans `save()`)
    8. mode normal : pour chaque ligne impactée → `save()` (nouvelle quantité) ou `delete()` si tombe à zéro
  - sortie : preview ou impact selon le mode
- [ ] 9.2 Tests d'intégration (`tests/integration/inventory/consume-inventory-item-by-barcode.test.ts`) : tous les scénarios de la requirement (single line, default location first, overflow, insuffisant, preview, non-default order by createdAt, barcode inconnu, barcode invalide, unité incompatible)

## 10. Composition root (DI)

- [ ] 10.1 Modifier `server/plugins/container.ts` : instancier `ProductLookupAdapter` (depuis `ingredients/infrastructure`) et l'enregistrer comme `productLookup` sur le container
- [ ] 10.2 Instancier `AddInventoryItemFromProductScanUseCase` et `ConsumeInventoryItemByBarcodeUseCase`, les exposer sur le container
- [ ] 10.3 Modifier `server/types/container.ts` : déclarer `productLookup: IProductLookup`, `addInventoryItemFromProductScan`, `consumeInventoryItemByBarcode`
- [ ] 10.4 Smoke test container : tous les nouveaux use cases sont définis sur `event.context.container`

## 11. Routes HTTP — modification de la réponse existante

- [ ] 11.1 Modifier `server/api/inventory/index.post.ts` :
  - récupérer `{ item, created }` du use case
  - définir le status HTTP : 201 si `created`, sinon 200 (utiliser `setResponseStatus(event, 201)`)
  - retourner `{ item, created }`
- [ ] 11.2 Modifier `server/api/inventory/[id].patch.ts` : mapper `LocationConflictError` → HTTP 409 avec un body informatif (`{ error: 'location-conflict', conflictingLineId, ... }`)
- [ ] 11.3 Smoke tests HTTP : `POST /api/inventory` premier appel → 201 ; second appel sur le même couple → 200 ; `PATCH` location vers une location occupée → 409

## 12. Routes HTTP — nouvelles

- [ ] 12.1 Créer `server/api/inventory/from-scan.post.ts` :
  - `requireHouseholdMember()`
  - parse body via `AddFromScanSchema`
  - délègue à `event.context.container.addInventoryItemFromProductScan`
  - statut : 201 si `created`, 200 sinon
  - mappe erreurs : produit introuvable → 404, `InvalidIngredientReference` → 400, `IncompatibleUnits` → 400, `InvalidQuantity` → 400
- [ ] 12.2 Créer `server/api/inventory/consume-by-barcode.post.ts` :
  - `requireHouseholdMember()`
  - parse body via `ConsumeByBarcodeSchema`
  - délègue à `event.context.container.consumeInventoryItemByBarcode`
  - mappe erreurs : barcode inconnu → 404, `InvalidBarcodeFormatError` → 400, `InsufficientQuantityError` → 400, `IncompatibleUnits` → 400
- [ ] 12.3 Smoke tests HTTP des deux nouvelles routes (cas heureux création + cas heureux incrément pour `from-scan` ; cas heureux + 1 cas d'erreur pour `consume-by-barcode`)

## 13. Front — dépendances et composables

- [ ] 13.1 Ajouter `@zxing/browser` comme dépendance front (`pnpm add @zxing/browser`)
- [ ] 13.2 Créer `app/composables/useBarcodeScanner.ts` :
  - état réactif : `state: 'idle' | 'initializing' | 'ready' | 'scanning' | 'scanned' | 'error'`, `permission: 'granted' | 'denied' | 'prompt'`, `error?: 'insecure-context' | 'permission-denied' | 'no-camera' | 'detector-failed'`
  - méthodes `start(videoEl: HTMLVideoElement)` et `stop()`
  - détection `window.isSecureContext` avant tout ; émet `error: 'insecure-context'` si false (mais autorise localhost via la propriété native)
  - détection `'BarcodeDetector' in window` :
    - si oui → instancier `new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] })`, lancer un loop `requestAnimationFrame` qui appelle `detect(videoEl)`
    - si non → `const { BrowserMultiFormatReader } = await import('@zxing/browser')` puis `decodeFromVideoDevice(...)`
  - `getUserMedia({ video: { facingMode: { exact: 'environment' } } })` avec fallbacks
  - dé-doublonnage : émettre uniquement après 2 lectures consécutives du même code (cf. design D8)
  - exposer `onScan(callback: (code: string) => void)`
- [ ] 13.3 Test unitaire ou story manuelle du composable (vitest jsdom : mock `BarcodeDetector` + mock `getUserMedia`). Au minimum : un test qui prouve que le path zxing **n'est PAS chargé** si `BarcodeDetector` est défini.
- [ ] 13.4 Créer `app/composables/useApiBarcodes.ts` :
  - `resolve(code: string)` → `GET /api/barcodes/:code` (retourne `ScanResult | null`)
  - `addFromScan(input: AddFromScanInput)` → `POST /api/inventory/from-scan`
  - `consumeByBarcode(input: ConsumeByBarcodeInput)` → `POST /api/inventory/consume-by-barcode`
  - typage strict via les schémas Zod de `shared/dto/scan.dto.ts`

## 14. Front — composants

- [ ] 14.1 Créer `app/components/scan/ScanModal.vue` :
  - modal Nuxt UI plein écran avec `<video>` autoplay + viewfinder (cadre + ligne laser)
  - intègre `useBarcodeScanner`, démarre au mount, stoppe au unmount
  - émet `@scan="code"` quand un code est détecté
  - affiche des états : initialisation / prêt à scanner / scan réussi / erreur (avec message contextualisé : permission refusée, HTTPS requis, caméra introuvable)
  - aucun champ `<input>` pour saisie manuelle (vérifier au snapshot)
- [ ] 14.2 Créer `app/components/scan/ScanResultDialog.vue` :
  - props : `barcode: string`, `mode: 'enrich' | 'stock-in' | 'consume'`, `preselectedIngredientId?: string`
  - au mount : appelle `useApiBarcodes().resolve(barcode)`
  - mode `enrich` :
    - inconnu → embarque `ProductForm` avec barcode pré-rempli + `IngredientPicker` (option `preselectedIngredientId` si fournie)
    - connu → affiche le produit existant + bouton "Modifier ce produit" (réutilise `ProductForm` en édition)
  - mode `stock-in` :
    - inconnu → affiche "Produit inconnu" + bouton "Le créer d'abord" qui bascule en mode `enrich`
    - connu → formulaire d'ajout pré-rempli (quantité = `product.packSize`/`packUnit`, location = `ingredient.storage`). Submit appelle `addFromScan`. Affiche un toast distinct selon `created: true` ("Nouvelle ligne créée") ou `created: false` ("Quantité incrémentée").
  - mode `consume` :
    - inconnu → 404 → message "Produit inconnu"
    - connu : sur ouverture, lister via `GET /api/inventory` (déjà chargé sur la page parente) si l'ingrédient résolu a `> 1` ligne. Si 1 seule ligne → formulaire direct, submit appelle `consumeByBarcode` (sans preview). Si N > 1 → appel `consumeByBarcode({ preview: true, quantity })` à la saisie de quantité, affichage des candidats (location, quantité retirée par ligne), confirmation déclenche l'appel sans preview.

## 15. Front — intégrations dans les pages

- [ ] 15.1 Modifier `app/pages/inventory/index.vue` :
  - ajouter deux boutons "Scanner pour ranger" (`mode: 'stock-in'`) et "Scanner pour consommer" (`mode: 'consume'`)
  - orchestration : ouvrir `ScanModal` ; sur `@scan`, fermer la modal et ouvrir `ScanResultDialog` avec le bon mode
  - sur succès du dialog : rafraîchir la liste d'inventaire
- [ ] 15.2 Modifier `app/pages/ingredients/index.vue` : ajouter le bouton "Scanner un nouveau produit" (`mode: 'enrich'`, pas d'ingrédient présélectionné)
- [ ] 15.3 Modifier `app/pages/ingredients/[id].vue` : ajouter le bouton "Scanner un nouveau produit pour cet ingrédient" (`mode: 'enrich'`, `preselectedIngredientId` = id de la page)

## 16. Tests, lint, doc

- [ ] 16.1 `pnpm typecheck` vert
- [ ] 16.2 `pnpm lint` vert (vérifier qu'aucune violation de la règle d'isolation domain n'a été introduite)
- [ ] 16.3 `pnpm test` vert (unit + integration + smoke HTTP)
- [ ] 16.4 Vérifier manuellement en dev (`pnpm dev`, HTTPS via tunnel ou localhost) :
  - scan d'un EAN connu en mode `stock-in` sur un ingrédient sans ligne d'inventaire → nouvelle ligne créée (toast "créée")
  - scan d'un EAN connu en mode `stock-in` sur un ingrédient avec une ligne existante au même emplacement → ligne incrémentée (toast "incrémentée")
  - scan d'un EAN connu en mode `consume` avec une seule ligne → décrément direct
  - scan d'un EAN connu en mode `consume` avec lignes dans 2 locations → preview affiché avec ordre default-first
  - scan d'un EAN inconnu en mode `enrich` → formulaire de création produit
  - refus de permission caméra → message clair, pas de fallback texte
  - tentative de changer la location d'un item vers une location déjà occupée → erreur 409 visible
- [ ] 16.5 Mettre à jour `README.md` : section "Permissions navigateur" mentionnant que le scan caméra nécessite HTTPS (sauf localhost) + note migration "db:reset si doublons"
- [ ] 16.6 Vérifier que `CLAUDE.md` reste à jour (devrait l'être : pas de nouveau bounded context, pas de nouvelle commande)
- [ ] 16.7 `npx -y -p @fission-ai/openspec@latest openspec validate add-product-scanning` vert avant de soumettre la PR
