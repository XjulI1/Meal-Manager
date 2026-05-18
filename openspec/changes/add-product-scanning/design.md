# Design: Scan caméra de produits (enrichissement, rangement, consommation)

## Context

Le change `add-ingredients-catalog` a livré toute la fondation produit + code-barres :
- Agrégats `Ingredient` et `Product` foyer-scoped.
- VO `Barcode` avec validation GTIN (EAN-8 / EAN-13 / UPC-A normalisé → EAN-13).
- Port `IBarcodeResolver` (déclaré dans `inventory/domain/ports/`) câblé à l'adapter `IngredientBarcodeResolver` (impl. côté `ingredients`).
- Endpoint `GET /api/barcodes/[code]` qui retourne `{ ingredient, product }`.

Côté inventaire, `InventoryItem` reste minimaliste : `ingredientId`, `quantity`, `location`, `createdAt`, `updatedAt`. Pas de DLC (volontairement repoussé), et **pas de contrainte d'unicité** : `AddInventoryItemUseCase` crée systématiquement une nouvelle ligne, donc 2 ajouts successifs avec le même `(ingredientId, location)` produisent 2 lignes distinctes. Côté utilisateur, c'est incompréhensible : « j'ai 2 paquets de pâtes » devrait être **une ligne avec un compteur**, pas deux lignes de 500 g.

Ce change s'occupe de trois choses :
1. Corriger le modèle inventaire : une ligne unique par `(ingredientId, location)`, sémantique upsert/increment.
2. Ajouter deux use cases inventory qui exploitent enfin les produits du catalogue : ajout par scan, consommation par scan.
3. Livrer toute la couche UI scan caméra (composable, modal, dialog multi-modes, intégrations).

Aucun utilisateur n'est en production : la contrainte d'unicité peut être ajoutée sèchement, quitte à imposer un `db:reset` sur les bases de dev existantes qui auraient des doublons.

## Goals / Non-Goals

**Goals :**
- Brancher enfin la chaîne scan → résolution → action utilisateur.
- Trois modes utilisateur clairs (`enrich`, `stock-in`, `consume`) avec une seule modal de scan partagée.
- Modèle inventaire **simple et déterministe** : une seule ligne par `(ingredientId, location)`. Plus de question de « quelle ligne décrémenter ? » dans la majorité des cas.
- Pas de saisie manuelle d'EAN : si la caméra ne peut pas, on ne fait pas (refus explicite côté UX).
- Conserver l'isolation hexagonale : pas d'import direct de `~/server/contexts/ingredients/**` dans `~/server/contexts/inventory/**`.
- Pré-remplissage agressif côté front : la quantité et la location sont **dérivées** du produit/ingrédient chaque fois que possible ; l'utilisateur n'a qu'à confirmer.
- Bundle initial du front non impacté par la lib fallback (chargement dynamique).

**Non-Goals :**
- DLC sur les lignes d'inventaire (gardé pour un change futur).
- Saisie manuelle d'EAN au clavier (UX dégradée intentionnellement).
- Scan multi-produits en rafale (file d'attente d'EAN, validation groupée).
- Cocher la liste de courses au scan / ajout liste de courses au scan.
- Lookup OpenFoodFacts (l'EAN inconnu déclenche un formulaire de création produit, point final v1).
- OCR de la DLC depuis la photo du produit.
- Tests E2E (Playwright reste hors scope v1).
- Auto-merge des lignes existantes au changement de `location` (trop magique ; on renvoie 409).

## Decisions

### D1. Sémantique upsert sur `AddInventoryItemUseCase` + contrainte DB

**Décision :** `AddInventoryItemUseCase` bascule de `create` à `upsert/increment`. Logique :

1. Cherche une ligne `(householdId, ingredientId, location)` existante via `findByIngredientAndLocation`.
2. Si trouvée → incrémente `quantity` (en canonical unit) et rafraîchit `updatedAt`. Retourne `{ item, created: false }`.
3. Sinon → crée une nouvelle ligne. Retourne `{ item, created: true }`.

Côté DB, on ajoute `UNIQUE INDEX inventory_items_household_ingredient_location_uq (household_id, ingredient_id, location)`. La contrainte agit comme garde-fou : si deux requêtes concurrentes tombent dans le path « créer » simultanément, MySQL en rejette une avec `ER_DUP_ENTRY` ; le repo intercepte cette erreur et relance l'upsert (1 retry max). C'est suffisant pour la concurrence v1 (foyer = ~4 personnes).

**Alternatives :**
- *Garder `create` strict et faire l'upsert côté client.* Rejeté : duplique la logique métier, deux frontends devraient l'implémenter identiquement.
- *Faire un vrai `INSERT … ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)` en MySQL.* Plus performant (1 round-trip), mais on perd le `created: boolean` et le mapper devient plus complexe. Rejeté en v1, peut être optimisé plus tard si besoin.
- *Auto-merger les doublons existants au moment de la migration.* Rejeté — aucun utilisateur en prod, `db:reset` est acceptable et plus prévisible.

**Raison :** modèle utilisateur clair (« 1 ligne par produit dans le placard »), évite la complexité du multi-lots, contrainte DB qui empêche le drift.

### D2. Réponse HTTP : 201 vs 200, champ `created`

**Décision :** `POST /api/inventory` et `POST /api/inventory/from-scan` retournent :
- HTTP **201** si la ligne a été créée (`created: true`).
- HTTP **200** si elle a été incrémentée (`created: false`).

Dans les deux cas, le body inclut `{ item: InventoryItemView, created: boolean }`.

**Alternative :** toujours 200, juste exposer `created` dans le body. Plus simple mais perd la sémantique REST. Décision : on garde la sémantique HTTP correcte, le surcoût est nul.

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

### D4. Consume : priorité à la `location` par défaut, débordement déterministe

**Décision :** `ConsumeInventoryItemByBarcodeUseCase` ordonne les lignes du même `ingredientId` ainsi :

1. La ligne à `ingredient.storage` (la location par défaut) en premier.
2. Les autres lignes par `createdAt ASC` (la plus ancienne d'abord).

Le débordement entre lignes est autorisé (consommer 600 g quand la ligne pantry fait 500 g → vide pantry et entame fridge de 100 g). Quand une ligne atteint zéro, elle est supprimée (cohérent avec `Adjust Quantity` existant).

Si la quantité totale demandée > somme des lignes disponibles : HTTP 400 (sans modifier l'état).

**Alternatives :**
- *Décrémenter seulement la ligne à `ingredient.storage`, refuser le débordement.* Plus simple mais frustrant — l'utilisateur ayant exceptionnellement mis ses pâtes au frigo se retrouve coincé.
- *Demander à l'utilisateur de choisir la location quand N > 1.* Rejeté — dans 95 % des cas il n'y a qu'une ligne (la location par défaut). Forcer un picker à chaque scan est lourd. Mode `preview` couvre le cas où l'utilisateur veut voir avant.
- *FIFO sur `createdAt` sans priorité à `storage`.* Rejeté — moins intuitif (« pourquoi a-t-il décrémenté le pot du frigo alors que j'ai le même au placard ? »).

**Raison :** 95 % des consommations ne concernent qu'une seule ligne (le cas par défaut). L'ordre déterministe couvre proprement les 5 % restants sans saouler l'utilisateur avec un choix.

### D5. Mode `preview` sur `consume-by-barcode`

**Décision :** l'endpoint `POST /api/inventory/consume-by-barcode` accepte `preview: true`. En mode preview, il **ne modifie pas l'état** mais retourne la liste des lignes candidates (ordonnées comme en D4, quantité qui serait retirée par ligne, somme totale, et un `fullyConsumed: boolean`). Le client peut afficher cette liste et permettre à l'utilisateur de confirmer.

Sans `preview` (mode normal), le serveur applique automatiquement la stratégie D4.

**Alternative :** toujours forcer une preview si N > 1. Rejeté — rend le 95 % des cas (une seule ligne) inutilement verbeux.

**Raison :** le preview est la version « j'aimerais voir avant de cliquer ». Le mode normal couvre le scan rapide « je sors un yaourt, décrémente ». Le client appelle `preview: true` uniquement quand `GET /api/inventory` lui révèle plusieurs lignes pour l'ingrédient résolu.

### D6. Update : conflit explicite sur changement de `location`

**Décision :** dans `UpdateInventoryItemUseCase`, si le client demande à changer `location` vers une valeur où **une autre ligne** existe déjà pour le même `(householdId, ingredientId)`, le système retourne HTTP 409 Conflict.

L'utilisateur doit alors :
- soit consommer/supprimer manuellement l'une des deux lignes,
- soit ajuster les quantités à la main (deux `PATCH` séparés sur les deux lignes).

**Alternative :** auto-merger les deux lignes (somme des quantités, suppression de la source). Rejeté — comportement magique qui surprendrait : un `PATCH` sur une ligne supprime une autre ligne ailleurs. Trop dangereux pour la v1.

**Raison :** explicite > magique. Le 409 est rare en pratique (l'utilisateur déplace rarement la location d'un item), et le message d'erreur peut guider vers l'action manuelle.

### D7. Modal unifiée + dialog multi-modes

**Décision :** une seule `ScanModal.vue` (vidéo + viewfinder + état) qui émet `scan(code: string)`. Au-dessus, un `ScanResultDialog.vue` reçoit le code, appelle `GET /api/barcodes/:code` et bascule sur le bon formulaire selon le `mode` reçu en prop : `enrich | stock-in | consume`. Le mode est décidé par le call site (bouton appelant).

**Alternative :** trois pages dédiées (`/scan/enrich`, `/scan/stock`, `/scan/consume`). Rejeté — flow utilisateur cassé (perte de contexte, navigation lourde sur mobile).

**Raison :** garde l'utilisateur sur sa page de travail. Une seule surface UI à maintenir pour la caméra. Le `ScanResultDialog` est petit et purement orchestration.

### D8. Caméra : `BarcodeDetector` natif + fallback dynamique

**Décision :** `useBarcodeScanner()` :
1. Détecte `'BarcodeDetector' in window` (Chrome Android, Chrome desktop avec flag).
2. Si présent → utilise le détecteur natif (formats : `ean_13`, `ean_8`, `upc_a`).
3. Sinon → `await import('@zxing/browser')` (dynamic import, ne pèse pas sur le bundle initial) et lance `BrowserMultiFormatReader`.
4. Le composable expose une API uniforme : `start(videoEl) → stop() → onScan(callback)`.

Permissions : si `getUserMedia` est refusé, le composable expose un état `permission: 'denied'` que la modal affiche avec un message clair.

**Alternative :** toujours zxing pour simplifier. Rejeté — pèse ~80 KB gzip pour rien sur les browsers qui ont déjà l'API native.

**Raison :** UX optimale sur le cas majoritaire (Android Chrome), fallback fiable sur iOS Safari. Le dynamic import résout le coût bundle.

### D9. HTTPS obligatoire en production

**Décision :** `getUserMedia` exige un contexte sécurisé. Pas de fallback ni de polyfill. La modal détecte `window.isSecureContext === false` et affiche un message « HTTPS requis ». Localhost reste considéré comme sécurisé pour le dev.

**Raison :** contrainte navigateur, non négociable. Documenté dans le README.

### D10. Pas de saisie manuelle d'EAN, jamais

**Décision :** aucun champ texte « saisir un code-barre » dans l'UI scan. Si la caméra ne marche pas (permission, hardware, contexte non sécurisé), la modal affiche une erreur et l'utilisateur peut soit revenir en arrière, soit utiliser le formulaire d'ajout d'ingrédient/inventaire classique (déjà disponible).

**Alternative :** ajouter un champ texte fallback. Rejeté par décision utilisateur — ouvrirait la porte à des EAN tapés à la main, source de bugs (typos, faux EAN, EAN d'un autre pays).

**Raison :** décision produit assumée. Le scan est un raccourci ; sans caméra, l'utilisateur a déjà tous les outils manuels par ailleurs.

### D11. Endpoints dédiés vs extension des routes existantes

**Décision :** deux nouvelles routes (`POST /api/inventory/from-scan`, `POST /api/inventory/consume-by-barcode`). On **n'étend pas** `POST /api/inventory` pour accepter un `productId` à la place d'un `ingredientId`.

**Alternative :** un seul `POST /api/inventory` polymorphe (productId XOR ingredientId). Rejeté — schéma Zod plus complexe (union discriminée), couplage des deux flows dans le même use case, et perte de clarté pour les clients.

**Raison :** chaque endpoint a une sémantique claire (« j'ajoute par scan » vs « j'ajoute manuellement »), les schémas restent simples, les tests sont indépendants. Note : la route existante `POST /api/inventory` voit quand même sa réponse évoluer (champ `created`, statut 200 possible) en raison du passage à l'upsert — c'est un changement de contrat documenté.

## Risks / Trade-offs

- **Migration de la contrainte unique sur des bases de dev avec doublons** → Mitigation : documenter `db:reset` dans le README ; ajouter un message clair si la migration échoue (`ER_DUP_ENTRY` au moment de l'`ALTER TABLE`). En prod, pas d'utilisateurs donc non concerné.
- **Concurrence sur l'upsert** : deux scans simultanés du même produit (par deux membres du foyer) peuvent tomber dans le path `create` avant l'INSERT → MySQL en rejette un avec `ER_DUP_ENTRY` → Mitigation : le repo intercepte cette erreur et relance la logique upsert (1 retry). C'est documenté dans la requirement.
- **`BarcodeDetector` ne reconnaît pas tous les formats sur tous les Android** → Mitigation : exposer le format `[EAN-13, EAN-8, UPC-A]` au constructeur ; si la lecture échoue 3 fois, on bascule sur le fallback zxing même quand l'API native est disponible.
- **Caméra arrière mal sélectionnée sur certains téléphones** → Mitigation : tenter `facingMode: { exact: 'environment' }`, fallback `facingMode: 'environment'`, dernier recours laisser le navigateur choisir. Exposer un bouton « changer de caméra » qui itère sur `enumerateDevices()`.
- **Lib zxing pèse même en dynamic import** → Mitigation : split déjà natif via `import()`, chargée seulement quand `BarcodeDetector` est absent. Mesurer après intégration ; si > 100 KB gzip, envisager `@zxing/library` seul (sans le wrapper browser).
- **EAN détecté avec faux positif** (le détecteur trouve un code dans une image en arrière-plan) → Mitigation : la modal demande deux lectures consécutives identiques avant d'émettre. Coût UX : ~200 ms de latence, acceptable.
- **Multi-tenancy** : un EAN scanné dans le foyer A ne doit jamais résoudre dans le foyer B → couvert par la requirement existante d'`ingredients`. Le port `IProductLookup.findById` MUST aussi filtrer sur `householdId`.
- **Sémantique d'upsert peu intuitive côté API** : un client qui appelle `POST` deux fois pourrait s'attendre à 2 ressources distinctes → Mitigation : champ `created: boolean` explicite dans la réponse + code 200 vs 201 + documentation dans le DTO. Les use cases existants (recettes, ingrédients) restent en `create` strict.

## Migration Plan

1. Lancer `pnpm db:generate` après modification du schéma → migration qui ajoute la contrainte unique.
2. Sur les bases de dev existantes : `pnpm db:reset` (ou `docker compose down -v`). Documenté dans le README.
3. Déployer le code serveur : la route existante `POST /api/inventory` change de comportement (upsert) ; les nouvelles routes scan deviennent disponibles.
4. Déployer le code front : les boutons scan apparaissent. La page `/inventory` peut continuer de fonctionner sans modification d'UX, mais le comportement « ajouter 2 fois la même chose » crée maintenant 1 seule ligne (à signaler dans la release note).
5. Rollback : `DROP INDEX inventory_items_household_ingredient_location_uq` + redéploiement du code antérieur. Sûr (aucune donnée perdue).

## Open Questions

Aucune en suspens : tous les choix de modélisation ont été validés par l'utilisateur en amont de la proposal (Product 1↔N Barcode, ingrédient porte `storage`, pas de DLC, pas de saisie manuelle d'EAN, ligne unique par `(ingredientId, location)`). Les choix techniques ci-dessus (port `IProductLookup`, dynamic import zxing, endpoints dédiés, 409 sur changement de location vers un conflit) sont pris ici sans question ouverte ; ils peuvent être revus si une difficulté concrète émerge à l'implémentation.
