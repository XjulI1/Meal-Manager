# Tasks

Checklist d'implémentation du change `add-product-scanning`. Ordonnée pour permettre une livraison incrémentale : à la fin de chaque section, l'application doit rester exécutable (`pnpm test` vert, `pnpm build` OK, `pnpm typecheck` vert, `pnpm lint` vert).

## 1. Schéma DB et migration (contrainte d'unicité)

- [x] 1.1 Modifier `server/database/schema/inventory-items.ts` : ajouter `unique('inventory_items_household_ingredient_location_uq').on(t.householdId, t.ingredientId, t.location)` dans le builder des index/contraintes
- [x] 1.2 Lancer `pnpm db:generate` pour produire la migration `add unique constraint on inventory_items (household, ingredient, location)` *(migration écrite à la main suivant la convention du projet — drizzle-kit interactif inutilisable ici)*
- [x] 1.3 Vérifier la migration générée (un seul `ALTER TABLE inventory_items ADD UNIQUE INDEX ...`) et la commiter
- [x] 1.4 Mettre à jour le README : section "Migration & développement" documentant que cette migration échoue si la base locale contient des doublons sur `(household_id, ingredient_id, location)` ; recommander `pnpm db:reset` ou `docker compose down -v`

## 2. DTO partagés

- [x] 2.1 Modifier `shared/dto/inventory.ts` : ajouter `InventoryUpsertResponseSchema = { item, created: boolean }` (la réponse de `POST /api/inventory`). Le payload d'entrée ne change pas.
- [x] 2.2 Créer `shared/dto/scan.dto.ts` :
  - `AddFromScanSchema` : `{ productId, quantity: { value, unit }, location? }`
  - `AddFromScanResponseSchema` : `{ item: InventoryItemView, created: boolean }`
  - `ConsumeByBarcodeSchema` : `{ barcode, quantity: { value, unit }, preview? }`
  - `ConsumePreviewResponseSchema` : `{ candidates: Array<{ lineId, location, currentQuantity, wouldRemove }>, totalAvailable, fullyConsumed }`
  - `ConsumeResponseSchema` : `{ impactedLines: Array<{ lineId, location, quantityRemoved, remainingQuantity, deleted }> }`
- [x] 2.3 Exporter les schémas depuis l'index des DTO *(pas d'index, imports par chemin direct — non applicable)*

## 3. Domain inventory — ports

- [x] 3.1 Créer `server/contexts/inventory/domain/ports/product-lookup.port.ts` :
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
- [x] 3.2 Étendre `server/contexts/inventory/domain/ports/inventory-item-repository.port.ts` :
  - `findByIngredientAndLocation(ingredientId, location, householdId)`
  - `listByIngredient(ingredientId, householdId)` (tri par défaut storage + createdAt fait dans le use case)
  - **Refonte `save()` → `insert()` + `update()`** : nécessaire car `onDuplicateKeyUpdate` sur le PK serait silencieusement dangereux quand l'INSERT d'un nouvel `id` viole la contrainte `(hh, ing, loc)`.
- [x] 3.3 Ajouter l'erreur métier `server/contexts/inventory/domain/errors/location-conflict.error.ts` (pour le 409 sur update)
- [x] 3.4 Ajouter l'erreur métier `server/contexts/inventory/domain/errors/insufficient-quantity.error.ts` (pour le 400 consume) + `duplicate-inventory-line.error.ts` (pour la race d'upsert)

## 4. Infrastructure inventory — repository

- [x] 4.1 Modifier `server/contexts/inventory/infrastructure/repositories/drizzle-inventory-item.repository.ts` :
  - Implémenter `findByIngredientAndLocation()`, `listByIngredient()`, `insert()` (catch `ER_DUP_ENTRY` → `DuplicateInventoryLineError`), `update()` (UPDATE pur par id)
- [x] 4.2 Mettre à jour le **fake repository** utilisé en tests d'intégration : nouvelles méthodes + hook `forceNextInsertConflict` pour exercer la race d'upsert

## 5. Infrastructure ingredients — adapter IProductLookup

- [x] 5.1 Créer `server/contexts/ingredients/infrastructure/product-lookup.adapter.ts`
- [x] 5.2 Tests unitaires de l'adapter (`tests/unit/ingredients/product-lookup-adapter.test.ts`)

## 6. Use case `AddInventoryItemUseCase` (refonte upsert)

- [x] 6.1 Modifier `add-inventory-item.use-case.ts` : sémantique upsert, retour `{ item, created }`, retry sur `DuplicateInventoryLineError`
- [x] 6.2 `Quantity.add()` déjà présent — pas besoin d'ajouter
- [x] 6.3 Tests d'intégration mis à jour (création, incrément, conversion d'unité à l'incrément, locations différentes = 2 lignes, race retry)
- [x] 6.4 Adapter `AdjustQuantityUseCase` pour utiliser `update()` au lieu de `save()` *(implicite — non listé dans les tâches d'origine mais conséquence de la refonte du port)*

## 7. Use case `UpdateInventoryItemUseCase` (conflit de location)

- [x] 7.1 Modifier `update-inventory-item.use-case.ts` : check d'unicité au changement de location → `LocationConflictError`
- [x] 7.2 Tests d'intégration : update location libre (OK), update location occupée (409)

## 8. Use case `AddInventoryItemFromProductScan`

- [x] 8.1 Créer `add-inventory-item-from-product-scan.use-case.ts` — résout `productId` via `IProductLookup` puis délègue à `AddInventoryItemUseCase` (réutilise la logique upsert)
- [x] 8.2 Tests d'intégration : création, incrément, location override, produit inconnu, produit d'un autre foyer, unité incompatible
- [x] 8.3 Le use case n'importe aucun symbole de `~/server/contexts/ingredients/**` (vérifié — uniquement ports inventory + use case interne)

## 9. Use case `ConsumeInventoryItemByBarcode`

- [x] 9.1 Créer `consume-inventory-item-by-barcode.use-case.ts` (tri default storage first + createdAt ASC, débordement, preview/normal)
- [x] 9.2 Tests d'intégration : single line, default location first, overflow, insuffisant, preview, ordre createdAt sur non-default, barcode inconnu, unité incompatible

## 10. Composition root (DI)

- [x] 10.1 `container.ts` : `productLookup = new ProductLookupAdapter(productRepo)`
- [x] 10.2 Instancier `addInventoryItemFromProductScan` et `consumeInventoryItemByBarcode`
- [x] 10.3 `types/container.ts` : déclarations ajoutées
- [x] 10.4 Smoke test container : couvert implicitement par les smoke tests HTTP qui montent un container stub

## 11. Routes HTTP — modification de la réponse existante

- [x] 11.1 `POST /api/inventory` : retourne `{ item, created }`, status 201/200 selon `created`
- [x] 11.2 `PATCH /api/inventory/:id` : `LocationConflictError` → 409 avec body structuré
- [x] 11.3 Smoke tests HTTP couverts dans `tests/integration/http/inventory-routes.test.ts`

## 12. Routes HTTP — nouvelles

- [x] 12.1 `POST /api/inventory/from-scan`
- [x] 12.2 `POST /api/inventory/consume-by-barcode`
- [x] 12.3 Smoke tests HTTP des deux nouvelles routes (cas heureux + erreurs)

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
