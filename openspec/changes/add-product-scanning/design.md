# Design: Scan caméra de produits (enrichissement, rangement, consommation)

## Context

Le change `add-ingredients-catalog` a livré toute la fondation produit + code-barres :
- Agrégats `Ingredient` et `Product` foyer-scoped.
- VO `Barcode` avec validation GTIN (EAN-8 / EAN-13 / UPC-A normalisé → EAN-13).
- Port `IBarcodeResolver` (déclaré dans `inventory/domain/ports/`) câblé à l'adapter `IngredientBarcodeResolver` (impl. côté `ingredients`).
- Endpoint `GET /api/barcodes/[code]` qui retourne `{ ingredient, product }`.

Côté inventaire, `InventoryItem` reste pour l'instant minimaliste : `ingredientId`, `quantity`, `location`, `createdAt`, `updatedAt`. **Pas de DLC** — ce qui bloque à la fois l'usage « ranger ses courses » (où la DLC est l'info que l'utilisateur veut saisir en priorité) et le FIFO « scanner ce que je consomme » (qui exige de savoir quel lot part en premier).

Ce change s'occupe de trois choses :
1. Combler le trou DLC sur `InventoryItem` (champ + pré-remplissage serveur depuis `ingredient.shelfLifeDays`).
2. Ajouter deux use cases inventory qui exploitent enfin les produits du catalogue : ajout par scan, consommation par scan FIFO.
3. Livrer toute la couche UI scan caméra (composable, modal, dialog multi-modes, intégrations).

Aucun utilisateur n'est en production : on peut introduire la colonne DLC sans backfill (NULL = DLC inconnue, gérée explicitement par le FIFO).

## Goals / Non-Goals

**Goals :**
- Brancher enfin la chaîne scan → résolution → action utilisateur.
- Trois modes utilisateur clairs (`enrich`, `stock-in`, `consume`) avec une seule modal de scan partagée.
- Pas de saisie manuelle d'EAN : si la caméra ne peut pas, on ne fait pas (refus explicite côté UX).
- Conserver l'isolation hexagonale : pas d'import direct de `~/server/contexts/ingredients/**` dans `~/server/contexts/inventory/**`.
- FIFO sur DLC pour la consommation par scan, avec NULLs (DLC inconnue) traités en fin de file.
- Pré-remplissage agressif côté serveur : la DLC, le storage et la quantité sont **dérivés** de l'ingrédient/produit chaque fois que possible ; l'utilisateur n'a qu'à confirmer.
- Bundle initial du front non impacté par la lib fallback (chargement dynamique).

**Non-Goals :**
- Saisie manuelle d'EAN au clavier (UX dégradée intentionnellement).
- Scan multi-produits en rafale (file d'attente d'EAN, validation groupée). Pertinent pour décharger un caddie entier ; gardé pour plus tard.
- Cocher la liste de courses au scan / ajout liste de courses au scan.
- Lookup OpenFoodFacts (l'EAN inconnu déclenche un formulaire de création produit, point final v1). Adapter prêt à venir : le port `IBarcodeResolver` accepte déjà plusieurs implémentations chaînables.
- OCR de la DLC depuis la photo du produit.
- Tests E2E (Playwright reste hors scope v1).
- Backfill des `InventoryItem` existants avec une DLC fictive.

## Decisions

### D1. DLC sur l'item, pas sur l'ingrédient ni sur le produit

**Décision :** ajouter `expirationDate?: Date` sur `InventoryItem` (colonne `expiration_date date NULL`). L'ingrédient garde `shelfLifeDays` (durée par défaut, utilisée pour calculer la suggestion).

**Alternatives :**
- DLC sur le produit. Rejeté : la DLC est propre à un exemplaire physique (un yaourt acheté aujourd'hui vs un acheté demain ont des DLC différentes mais le même `productId`).
- Pas de DLC du tout, calculer à la lecture depuis `createdAt + shelfLifeDays`. Rejeté : ne reflète pas la DLC réelle imprimée sur l'emballage, qui est souvent plus longue ou plus courte que `shelfLifeDays`.

**Raison :** la DLC appartient à l'instance (le pot), pas à la classe (le produit) ni au concept (l'ingrédient). `shelfLifeDays` reste utile comme **valeur par défaut** que le serveur calcule (`today + shelfLifeDays`) quand le client n'envoie pas de DLC. L'utilisateur peut toujours saisir la vraie DLC depuis l'emballage.

### D2. Pré-remplissage serveur, pas client

**Décision :** le pré-calcul `today + shelfLifeDays` se fait dans **`AddInventoryItemUseCase`** (cas générique) et dans **`AddInventoryItemFromProductScanUseCase`** (cas scan). Le client envoie `expirationDate?` ; si absent et que l'ingrédient a un `shelfLifeDays`, le serveur calcule.

**Alternative :** pré-calculer côté client (le front a `shelfLifeDays` via `useApiBarcodes`). Rejeté — duplique la logique, plus de chances d'incohérence, et le serveur reste seul juge de l'horloge (timezone, drift).

**Raison :** cohérent avec l'architecture (les use cases sont la frontière métier). Le client est déchargé de calculer une date. Tests plus simples (un seul endroit à couvrir).

### D3. Port dédié `IProductLookup` côté inventory

**Décision :** créer un nouveau port `IProductLookup` dans `server/contexts/inventory/domain/ports/product-lookup.port.ts` :

```ts
export interface ProductSummary {
  id: string
  ingredientId: string
  packSize: number       // canonical unit value
  packUnit: 'g' | 'ml' | 'unit'
}
export interface IProductLookup {
  findById(productId: string, householdId: string): Promise<ProductSummary | null>
}
```

L'implémentation vit dans `server/contexts/ingredients/infrastructure/product-lookup.adapter.ts` (déjà le pattern utilisé par `IngredientLookup`). Câblée dans `server/plugins/container.ts`.

**Alternatives :**
- Réutiliser `IBarcodeResolver`. Rejeté : il prend un `barcode`, pas un `productId`. Le front a déjà résolu et possède le `productId`.
- Importer directement le repo produit depuis ingredients. **Interdit** par la règle ESLint d'isolation.
- Faire le scan côté serveur (envoyer le `barcode` plutôt que le `productId`). Plus simple mais double appel réseau (résolution + ajout) ou logique cachée (résoudre dans `from-scan`). On prend l'approche `productId` car le front a déjà besoin du résultat de la résolution pour afficher le formulaire pré-rempli.

**Raison :** respect strict de l'isolation hexagonale (déjà ESLint-enforced), pattern cohérent avec `IIngredientLookup` existant.

### D4. FIFO sur DLC, NULLs en dernier

**Décision :** `ConsumeInventoryItemByBarcodeUseCase` ordonne les lots du même `ingredientId` par :
1. `expirationDate ASC` (le plus proche en premier)
2. `NULLs LAST` (DLC inconnue = on l'utilise quand on a épuisé les lots datés)
3. `createdAt ASC` (en cas d'égalité de DLC)

Le débordement entre lots est autorisé (consommer 600 g quand le lot 1 fait 500 g → vide le lot 1 et entame le lot 2 de 100 g). Quand un lot atteint zéro, il est supprimé (cohérent avec le use case `AdjustQuantity` existant).

Si la quantité totale demandée > somme des lots disponibles : HTTP 400 (sans modifier l'état).

**Alternatives :**
- LIFO (le plus récent). Rejeté : ne minimise pas le gaspillage.
- Refuser le débordement (forcer l'utilisateur à choisir un seul lot). Rejeté — UX médiocre, on rajouterait une étape pour rien dans le cas le plus courant.
- NULLs **first** (consommer en premier ce dont la DLC est inconnue). Rejeté — l'inconnu doit servir de variable d'ajustement, pas être prioritaire.

**Raison :** comportement attendu par l'utilisateur (« on consomme d'abord ce qui périme »). Le débordement est sûr car traçable dans la réponse de l'API (liste des lots impactés).

### D5. Mode `preview` sur `consume-by-barcode`

**Décision :** l'endpoint `POST /api/inventory/consume-by-barcode` accepte `preview: true`. En mode preview, il **ne modifie pas l'état** mais retourne la liste candidate (lots ordonnés FIFO, quantité qui serait retirée par lot, somme totale, et un `wouldBeFullyConsumed: boolean`). Le client peut afficher cette liste et permettre une sélection explicite.

Sans `preview` (mode normal), si plusieurs lots correspondent à la quantité demandée, le serveur applique le FIFO automatiquement. L'utilisateur peut aussi forcer un seul lot via `lotId?: string`.

**Alternative :** toujours forcer une sélection si N > 1. Rejeté — rend le 80 % des cas (un seul lot) inutilement verbeux.

**Raison :** le preview est la version « j'aimerais voir avant de cliquer ». Le mode normal couvre le scan rapide « je sors un yaourt, décrémente ». `lotId` couvre « je veux ce lot précis » (utile si l'utilisateur voit l'emballage et veut être explicite).

### D6. Modal unifiée + dialog multi-modes

**Décision :** une seule `ScanModal.vue` (vidéo + viewfinder + état) qui émet `scan(code: string)`. Au-dessus, un `ScanResultDialog.vue` reçoit le code, appelle `GET /api/barcodes/:code` et bascule sur le bon formulaire selon le `mode` reçu en prop : `enrich | stock-in | consume`. Le mode est décidé par le call site (bouton appelant).

**Alternative :** trois pages dédiées (`/scan/enrich`, `/scan/stock`, `/scan/consume`). Rejeté — flow utilisateur cassé (perte de contexte, navigation lourde sur mobile).

**Raison :** garde l'utilisateur sur sa page de travail. Une seule surface UI à maintenir pour la caméra. Le `ScanResultDialog` est petit et purement orchestration.

### D7. Caméra : `BarcodeDetector` natif + fallback dynamique

**Décision :** `useBarcodeScanner()` :
1. Détecte `'BarcodeDetector' in window` (Chrome Android, Chrome desktop avec flag).
2. Si présent → utilise le détecteur natif (formats : `ean_13`, `ean_8`, `upc_a`).
3. Sinon → `await import('@zxing/browser')` (dynamic import, ne pèse pas sur le bundle initial) et lance `BrowserMultiFormatReader`.
4. Le composable expose une API uniforme : `start(videoEl) → stop() → onScan(callback)`.

Permissions : si `getUserMedia` est refusé, le composable expose un état `permission: 'denied'` que la modal affiche avec un message clair.

**Alternative :** toujours zxing pour simplifier. Rejeté — pèse ~80 KB gzip pour rien sur les browsers qui ont déjà l'API native.

**Raison :** UX optimale sur le cas majoritaire (Android Chrome), fallback fiable sur iOS Safari. Le dynamic import résout le coût bundle.

### D8. HTTPS obligatoire en production

**Décision :** `getUserMedia` exige un contexte sécurisé. Pas de fallback ni de polyfill. La modal détecte `window.isSecureContext === false` et affiche un message « HTTPS requis ». Localhost reste considéré comme sécurisé pour le dev.

**Raison :** contrainte navigateur, non négociable. Documenté dans le README.

### D9. Pas de saisie manuelle d'EAN, jamais

**Décision :** aucun champ texte « saisir un code-barre » dans l'UI scan. Si la caméra ne marche pas (permission, hardware, contexte non sécurisé), la modal affiche une erreur et l'utilisateur peut soit revenir en arrière, soit utiliser le formulaire d'ajout d'ingrédient/inventaire classique (déjà disponible).

**Alternative :** ajouter un champ texte fallback. Rejeté par décision utilisateur — ouvrirait la porte à des EAN tapés à la main, source de bugs (typos, faux EAN, EAN d'un autre pays).

**Raison :** décision produit assumée. Le scan est un raccourci ; sans caméra, l'utilisateur a déjà tous les outils manuels par ailleurs.

### D10. Endpoints dédiés vs extension des routes existantes

**Décision :** deux nouvelles routes (`POST /api/inventory/from-scan`, `POST /api/inventory/consume-by-barcode`). On **n'étend pas** `POST /api/inventory` pour accepter un `productId` à la place d'un `ingredientId`.

**Alternative :** un seul `POST /api/inventory` polymorphe (productId XOR ingredientId). Rejeté — schéma Zod plus complexe (union discriminée), couplage des deux flows dans le même use case, et perte de clarté pour les clients.

**Raison :** chaque endpoint a une sémantique claire (« j'ajoute par scan » vs « j'ajoute manuellement »), les schémas restent simples, les tests sont indépendants.

### D11. Migration : pas de backfill, NULL = DLC inconnue

**Décision :** la migration ajoute `expiration_date date NULL`. Les items existants restent NULL. Le code traite NULL comme « DLC inconnue » (affichage : « DLC inconnue », FIFO : NULLs en dernier).

**Alternative :** backfill avec `created_at + ingredient.shelf_life_days`. Rejeté — fausserait l'info (un yaourt créé il y a 3 mois aurait une DLC dans le futur). Mieux vaut être honnête.

**Raison :** comportement explicite > comportement deviné. Cohérent avec « pas d'utilisateurs en prod » mais évite tout risque même en cas de réutilisation.

## Risks / Trade-offs

- **`BarcodeDetector` ne reconnaît pas tous les formats sur tous les Android** → Mitigation : exposer le format `[EAN-13, EAN-8, UPC-A]` au constructeur ; si la lecture échoue 3 fois, on bascule sur le fallback zxing même quand l'API native est disponible.
- **Caméra arrière mal sélectionnée sur certains téléphones** → Mitigation : tenter `facingMode: { exact: 'environment' }`, fallback `facingMode: 'environment'`, dernier recours laisser le navigateur choisir. Exposer un bouton « changer de caméra » qui itère sur `enumerateDevices()`.
- **Lib zxing pèse même en dynamic import** → Mitigation : split déjà natif via `import()`, chargée seulement quand `BarcodeDetector` est absent. Mesurer après intégration ; si > 100 KB gzip, envisager `@zxing/library` seul (sans le wrapper browser).
- **NULL DLC en queue FIFO peut surprendre** → Mitigation : la réponse de l'endpoint `consume-by-barcode` inclut toujours la liste ordonnée des lots impactés, donc l'utilisateur voit ce qui a été décrémenté. Le composant affiche un badge « DLC inconnue » pour les lots NULL.
- **EAN détecté avec faux positif** (le détecteur trouve un code dans une image en arrière-plan) → Mitigation : la modal demande deux lectures consécutives identiques avant d'émettre. Coût UX : ~200 ms de latence, acceptable.
- **Multi-tenancy** : un EAN scanné dans le foyer A ne doit jamais résoudre dans le foyer B → couvert par la requirement existante d'`ingredients`. Le port `IProductLookup.findById` MUST aussi filtrer sur `householdId`.
- **Migration `pnpm db:generate`** peut produire un diff inattendu si des migrations locales n'ont pas été appliquées → Mitigation : tasks.md exige de partir d'une base propre, et le PR description listera explicitement la migration générée.

## Migration Plan

1. Ajouter la colonne DB via `pnpm db:generate` (devrait produire un `ALTER TABLE inventory_items ADD COLUMN expiration_date DATE NULL`).
2. Déployer le code serveur : les routes existantes acceptent `expirationDate` optionnelle, les nouvelles routes scan deviennent disponibles.
3. Déployer le code front : les boutons scan apparaissent. Les pages existantes continuent de fonctionner sans modification d'UX (le champ DLC apparaît comme optionnel dans le formulaire inventory).
4. Rollback : `DROP COLUMN expiration_date` + redéploiement. Aucune donnée critique perdue (DLC peut être ressaisie). Mais : si des items ont déjà été créés avec DLC, ces données seraient perdues — préférer un déploiement en avant (forward-fix) en cas de bug.

## Open Questions

Aucune en suspens : tous les choix de modélisation et d'UX ont été validés par l'utilisateur en amont de la proposal (Product 1↔N Barcode, ingrédient porte `storage` et `shelfLifeDays`, pas de saisie manuelle d'EAN, FIFO sur DLC, modal unifiée). Les choix techniques ci-dessus (port `IProductLookup`, dynamic import zxing, endpoints dédiés) sont pris ici sans question ouverte ; ils peuvent être revus si une difficulté concrète émerge à l'implémentation.
