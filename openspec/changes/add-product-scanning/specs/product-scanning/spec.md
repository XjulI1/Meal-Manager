## ADDED Requirements

### Requirement: Camera-Based Barcode Scanner
The system SHALL provide a browser-based barcode scanner that reads EAN-8, EAN-13 and UPC-A from the device camera, with no manual barcode entry in the UI.

The scanner MUST:
- Encapsulate camera access in a composable `useBarcodeScanner()` exposing `start(videoEl)`, `stop()`, and an event `onScan(callback)`.
- Use the native `BarcodeDetector` API when available (with formats `ean_13`, `ean_8`, `upc_a`).
- Fall back to a dynamically imported `@zxing/browser` when `BarcodeDetector` is absent. The fallback MUST be loaded via `import()` so the initial bundle is not impacted on browsers that already support the native API.
- Prefer the rear camera (`facingMode: { exact: 'environment' }`, then `facingMode: 'environment'`, then default).
- Require two consecutive identical reads before emitting a scan event (de-duplication of false positives).
- Expose a state machine: `initializing | ready | scanning | scanned | error`.
- Surface a `permission` state (`granted | denied | prompt`) so the UI can render a clear refusal message.
- Detect non-secure contexts (`window.isSecureContext === false`) and surface an explicit error (`insecure-context`) without attempting to start the camera.

The UI MUST NOT include any text input for manually typing a barcode.

#### Scenario: Native BarcodeDetector is used when available
- **GIVEN** a browser that exposes `window.BarcodeDetector`
- **WHEN** `useBarcodeScanner().start(videoEl)` is called
- **THEN** the composable uses the native detector
- **AND** the zxing fallback module is not loaded

#### Scenario: Zxing fallback when BarcodeDetector is absent
- **GIVEN** a browser without `window.BarcodeDetector` (e.g., Safari iOS)
- **WHEN** the scanner starts
- **THEN** the composable dynamically imports `@zxing/browser` and uses `BrowserMultiFormatReader`

#### Scenario: Rear camera is preferred
- **GIVEN** a device with both front and rear cameras
- **WHEN** the scanner starts
- **THEN** it requests `facingMode: { exact: 'environment' }` first
- **AND** falls back to `facingMode: 'environment'` if that fails

#### Scenario: Permission denied surfaces a clear state
- **GIVEN** the user denies camera access
- **WHEN** the scanner attempts to start
- **THEN** the composable exposes `permission: 'denied'`
- **AND** the modal displays a refusal message
- **AND** no manual barcode entry fallback is offered

#### Scenario: Insecure context is detected
- **GIVEN** the page is served over plain HTTP (not localhost)
- **WHEN** the scanner attempts to start
- **THEN** the composable exposes `error: 'insecure-context'`
- **AND** the modal displays an "HTTPS required" message

#### Scenario: De-duplication of false positives
- **GIVEN** the detector returns a barcode on a single frame
- **WHEN** the next frame does not detect the same barcode
- **THEN** no scan event is emitted
- **AND** the scanner waits for two consecutive identical reads before emitting

#### Scenario: No manual barcode entry input exists
- **GIVEN** the scan modal is open
- **WHEN** inspecting the rendered DOM
- **THEN** no `<input>` element accepting a barcode value is present

### Requirement: Scan Result Dialog with Three Modes
The system SHALL provide a `ScanResultDialog` that receives a scanned barcode and routes the user to one of three flows based on a `mode` prop: `enrich`, `stock-in`, `consume`.

The dialog MUST:
- Call `GET /api/barcodes/:code` with the scanned code as soon as it opens.
- In `enrich` mode: open a product creation form (reusing `ProductForm` and `IngredientPicker`); if the barcode is already known, propose editing the existing product instead.
- In `stock-in` mode: open a pre-filled inventory add form (quantity = `product.packSize`, unit = `product.packUnit`, location = `ingredient.storage`); if the barcode is unknown, propose switching to `enrich` mode.
- In `consume` mode: open the consumption form. If the ingredient has lines in a single `location` (the common case), submit directly. If the ingredient has lines in multiple locations, call `consume-by-barcode` with `preview: true` first and display the candidate list (default storage line first, then the other locations) before confirmation.
- Never call the inventory-modifying endpoints from the dialog itself when the user has not confirmed; the dialog is a UI layer over the composables, and side-effects only happen on submit.

#### Scenario: Enrich mode with unknown barcode opens product creation
- **GIVEN** the dialog is opened with `mode: 'enrich'` and a barcode unknown to the household
- **WHEN** the dialog mounts
- **THEN** a product creation form opens with the scanned barcode prefilled in the barcodes list
- **AND** the user can select an existing ingredient or create a new one inline

#### Scenario: Enrich mode with known barcode proposes editing
- **GIVEN** the dialog is opened with `mode: 'enrich'` and a barcode already attached to a product
- **WHEN** the dialog mounts
- **THEN** it displays the existing product details
- **AND** offers an "Edit this product" action that opens the product update form

#### Scenario: Stock-in mode pre-fills from product and ingredient
- **GIVEN** a known barcode whose product has `packSize: 500`, `packUnit: 'g'` and ingredient `storage: 'pantry'`
- **WHEN** the dialog opens in `stock-in` mode
- **THEN** the inventory add form is pre-filled with quantity `500 g` and location `pantry`
- **AND** the user can adjust either before submitting

#### Scenario: Stock-in mode with unknown barcode proposes enrich
- **GIVEN** the dialog is opened with `mode: 'stock-in'` and an unknown barcode
- **WHEN** the resolution returns 404
- **THEN** the dialog displays "This product is not in your catalog yet"
- **AND** offers an action "Create the product first" that switches to `enrich` mode keeping the same barcode

#### Scenario: Consume mode with a single matching line
- **GIVEN** a known barcode and exactly one inventory line for the resolved ingredient (one location)
- **WHEN** the dialog opens in `consume` mode and the user submits a quantity
- **THEN** the dialog calls `POST /api/inventory/consume-by-barcode` (without `preview`)
- **AND** the line is decremented

#### Scenario: Consume mode with multiple locations displays preview
- **GIVEN** a known barcode and two inventory lines for the resolved ingredient (different locations, e.g., pantry + fridge)
- **WHEN** the dialog opens in `consume` mode
- **THEN** it first calls `POST /api/inventory/consume-by-barcode` with `preview: true`
- **AND** displays the candidate list ordered with the default storage location first, then the others
- **AND** the user can confirm to apply the default cascade

### Requirement: Mode Triggers from Pages
The system SHALL expose scan entry points from the relevant pages, each with a fixed `mode`:
- `/inventory` page: two buttons "Scanner pour ranger" (`mode: 'stock-in'`) and "Scanner pour consommer" (`mode: 'consume'`).
- `/ingredients` page: a button "Scanner un nouveau produit" (`mode: 'enrich'`, no preselected ingredient).
- `/ingredients/[id]` page: a button "Scanner un nouveau produit pour cet ingrédient" (`mode: 'enrich'`, ingredient preselected to the page's id).

The mode is determined entirely by the call site; the scanner itself is mode-agnostic.

#### Scenario: Inventory page has both stock-in and consume buttons
- **GIVEN** the `/inventory` page is rendered
- **WHEN** the buttons row is inspected
- **THEN** a "Scanner pour ranger" button is present
- **AND** a "Scanner pour consommer" button is present

#### Scenario: Ingredient detail page preselects the ingredient
- **GIVEN** the `/ingredients/ing-42` page is open
- **WHEN** the "Scanner un nouveau produit pour cet ingrédient" button is clicked and a barcode is scanned in enrich mode
- **THEN** the product creation form opens with `ingredientId: 'ing-42'` preselected
- **AND** the user cannot change the ingredient without an explicit action

### Requirement: Scan-Related API Surface (Front Composables)
The system SHALL provide typed front-end composables for the scan flows:
- `useApiBarcodes()` wrapping `GET /api/barcodes/:code` → returns `ScanResult | null`.
- `useApiBarcodes()` wrapping `POST /api/inventory/from-scan` → returns the created `InventoryItemView`.
- `useApiBarcodes()` wrapping `POST /api/inventory/consume-by-barcode` (with optional `preview`) → returns either the consumption result (impacted lots, quantities removed) or the FIFO-ordered candidate list (preview mode).

All composables MUST use the Zod-validated DTOs from `shared/dto/scan.dto.ts` for both request and response typing.

#### Scenario: useApiBarcodes resolves a known barcode
- **GIVEN** a known barcode `3038359002564`
- **WHEN** `useApiBarcodes().resolve('3038359002564')` is called
- **THEN** the composable returns a `ScanResult` with `{ ingredient, product }`

#### Scenario: useApiBarcodes returns null for unknown barcode
- **GIVEN** a barcode not in the household catalog
- **WHEN** `useApiBarcodes().resolve(<code>)` is called
- **THEN** the composable returns `null` (after handling the HTTP 404 internally)
