## Context

La cave (`server/contexts/wine-cellar/`) suit l'architecture hexagonale du repo : entités/ports dans `domain/`, orchestration dans `application/use-cases/`, adapters Drizzle/externes dans `infrastructure/`. Le `Wine` porte déjà une colonne `photoUrl varchar(500)` (schéma `server/database/schema/wine-cellar.ts`) restée inexploitée. La page `/cave` (`app/pages/cave/index.vue`) ouvre des modales `WineForm` (création/édition de vin) et `WineBottlesForm` (ajout de N bouteilles), via `useApiWineCellar`.

Le contexte `catalog` fournit un **patron réutilisable** pour l'IA vision : `POST /api/recipes/import-photo` → `requireAiEnabled(event)` (403 si IA désactivée) → `ImportRecipeFromPhotosUseCase` → port `IRecipePhotoImporter` → adapter `AnthropicRecipePhotoImporter` qui envoie les images en base64 à Claude avec un **tool forcé** (`tool_choice: { type: 'tool' }`) et valide la sortie contre un schéma Zod. Côté front, `useApiRecipeChat` normalise chaque fichier : détection HEIC (`heic-to`), conversion JPEG, downscale canvas (≤ 1600 px), base64 sans préfixe `data:`. Les DTO d'image (`RecipeImageMediaTypeSchema`, `MAX_RECIPE_PHOTOS`, bornes base64) sont dans `shared/dto/recipe-chat.ts`.

Le besoin : répliquer ce patron pour la cave (extraire les attributs d'un **vin**, pas une recette) **et** ajouter ce que l'import recette n'a pas — la **persistance de la photo**, car aucune brique de stockage de fichiers n'existe aujourd'hui dans le projet (`photoUrl`/`imageUrl` ne sont que des `varchar` d'URL externes ; pas de S3/minio/multipart/`useStorage`).

Contraintes repo : domaine sans I/O (règle ESLint), I/O derrière des ports, `Quantity` pour les volumes (contenance de bouteille), IDs `char(36)` app, gating IA par compte (`getUserAiAccess`), locale `fr-FR`.

## Goals / Non-Goals

**Goals:**
- Photographier une étiquette et pré-remplir `WineForm` + une quantité de bouteilles via l'IA, sans rien persister avant validation.
- Conserver la photo d'étiquette rattachée au vin (`photoUrl`) via une brique de stockage propre, réutilisable plus tard (ingrédients, produits).
- Réutiliser au maximum le pipeline d'images existant (HEIC, downscale, DTO, gating IA) pour éviter la divergence.

**Non-Goals:**
- Pas de lecture de code-barres (une étiquette n'en porte pas d'exploitable — c'est de la vision, pas du scan `product-scanning`).
- Pas de caméra live intégrée en v1 (upload / prise de photo fichier uniquement — décidé avec l'utilisateur).
- Pas d'enrichissement web (millésime, note d'expert…) : on n'extrait que ce qui est lisible sur l'étiquette.
- Pas de refonte de `WineForm`/`WineBottlesForm` ni du flux vin→bouteilles ; on pré-remplit le formulaire existant.
- Pas de migration vers un stockage objet (S3) en v1 : filesystem sur volume suffit ; le port permet d'y passer sans toucher au domaine.

## Decisions

### D1 — Endpoint d'extraction : `POST /api/cave/scan-label`, brouillon non persisté
Miroir de `import-photo` côté cave :
- `requireAiEnabled(event)` → `{ householdId }` (403 si IA désactivée, 401 si non authentifié).
- Body validé par `ScanWineLabelSchema` (`{ images: WineLabelImage[] }`, 1..N images, mêmes bornes que les photos recette) ; payload invalide → 400 **sans** appel Anthropic.
- `event.context.container.scanWineLabel.execute({ householdId, images })` → `WineLabelDraft`.
- Erreur d'extraction → 400 (via une erreur métier `WineLabelScanError`, mappée comme `RecipePhotoImportError`).

Le brouillon n'est **jamais** persisté (pas de `Wine`, pas de bouteille, pas de photo écrite) : c'est une aide de saisie, comme le brouillon de recette.

### D2 — Port `IWineLabelExtractor` + adapter Anthropic, tool forcé
- Port `domain/ports/wine-label-extractor.port.ts` :
  ```
  interface WineLabelImageInput { mediaType: string; data: string /* base64 */ }
  interface IWineLabelExtractor { extractFromPhotos(images: ReadonlyArray<WineLabelImageInput>): Promise<WineLabelDraftContent> }
  ```
- Adapter `infrastructure/adapters/anthropic-wine-label-extractor.ts` : envoie les images en un seul message user, `tool_choice: { type: 'tool', name: 'extract_wine' }`, `output_config.effort` dédié. Tool `extract_wine` (fichier `wine-extract-tool.ts`) dont l'`input_schema` couvre `name, domain, country, region, appellation, vintage, color, gardeMin, gardeMax`. Sortie validée contre `WineLabelDraftSchema` (Zod) — si invalide, `WineLabelScanError`.
- **Mapping robe/région** : l'instruction impose à Claude de renvoyer `color ∈ {rouge,blanc,rose,effervescent}` et `region` dans la liste fermée `WINE_REGIONS` (slug) ou `autre`. Une normalisation défensive côté adapter/use case ramène toute valeur hors-liste à `autre` (région) et laisse `color` absente plutôt que d'inventer (la robe reste requise à la validation du formulaire, pas à l'extraction). On **n'invente jamais** : un champ non lisible est omis.

### D3 — Brique de stockage : port `ILabelPhotoStorage` + adapter filesystem
Aucune infra de fichiers n'existe → on l'introduit, minimale et derrière un port :
- Port `domain/ports/label-photo-storage.port.ts` :
  ```
  interface StoredPhotoInput { householdId: string; mediaType: string; data: string /* base64 */ }
  interface ILabelPhotoStorage { store(input: StoredPhotoInput): Promise<{ url: string }> }
  ```
- Adapter `FilesystemLabelPhotoStorage` : écrit le binaire dans `${NUXT_WINE_LABEL_DIR}/<householdId>/<uuid>.<ext>` (clé **opaque** UUID), renvoie une URL servie `/api/cave/label-photos/<householdId>/<uuid>.<ext>`. Répertoire configurable (défaut hors-repo, ex. `.data/wine-labels` en dev ; volume monté en Docker).
- **Service** : route Nitro `GET /api/cave/label-photos/[...key].get.ts` qui lit le fichier depuis le répertoire configuré et le renvoie avec le bon `Content-Type` + `Cache-Control`. Protection anti path-traversal (clé validée : `<uuid>/<uuid>.<ext>`, pas de `..`).
- **Isolation foyer** : les URLs contiennent le `householdId` et une clé UUID non-devinable. En v1 la route de service reste lisible par URL (les balises `<img>` ne portent pas d'en-tête d'auth) — trade-off assumé pour des étiquettes de vin (non sensibles), la non-devinabilité tenant lieu de protection. Documenté dans les risques ; une évolution possible (URL signées / vérif session) est laissée ouverte.

### D4 — Persistance à la création du vin (pas à la capture)
`photoUrl` est alimenté **au submit** du formulaire, jamais à la capture → pas de fichier orphelin si le membre annule.
- `CreateWineSchema` / `UpdateWineSchema` (`shared/dto/wine-cellar.ts`) acceptent un champ optionnel **`labelPhoto: { mediaType, data(base64) }`** (mutuellement exclusif avec `photoUrl` fourni directement).
- `CreateWineUseCase` / `UpdateWineUseCase` : si `labelPhoto` présent → `ILabelPhotoStorage.store({ householdId, ... })` → `photoUrl = url`. Sinon comportement actuel (photoUrl éventuel tel quel, ou vide).
- La photo capturée pour l'extraction est **réutilisée** côté client comme `labelPhoto` du submit (une seule capture sert au pré-remplissage ET à la persistance).

### D5 — DTOs
- Nouveau `shared/dto/wine-label.ts` :
  - `WineLabelImageMediaTypeSchema = z.enum(['image/jpeg','image/png','image/webp'])`, `MAX_LABEL_PHOTOS`, borne base64 (réutiliser les constantes recette ou les redéclarer localement pour découpler les capacités — on redéclare, en documentant l'alignement).
  - `WineLabelImageSchema`, `ScanWineLabelSchema { images: [...] }`.
  - `WineLabelDraftSchema` : `{ name?, domain?, country?, region?, appellation?, vintage?, color?, gardeMin?, gardeMax?, suggestedBottleCount }` — tous optionnels sauf un `suggestedBottleCount` défaut `1`. C'est un **brouillon** : la robe requise et les invariants (`gardeMin ≤ gardeMax`) sont validés par `CreateWineSchema` au submit, pas ici.
- `shared/dto/wine-cellar.ts` : ajout de `WineLabelInputSchema` (`{ mediaType, data }`) et champ `labelPhoto` optionnel sur `CreateWineSchema`/`UpdateWineSchema`.

### D6 — Config & Docker
- `anthropic-config.ts` (ou un équivalent wine-cellar) : `DEFAULT_LABEL_EFFORT` (`low`, comme la photo recette) + `NUXT_ANTHROPIC_LABEL_EFFORT`. Réutilise `anthropicApiKey`/`anthropicModel` existants du `runtimeConfig`.
- `runtimeConfig` : `wineLabelDir` ← `NUXT_WINE_LABEL_DIR`.
- `docker-compose.yml` : volume nommé monté sur le répertoire des étiquettes ; `.env.example` documente `NUXT_WINE_LABEL_DIR`.

### D7 — Front
- `app/pages/cave/index.vue` : bouton **« Scanner une étiquette »** en tête → ouvre une modale de capture (`WineLabelScanModal`).
- Modale : sélecteur de fichier (`accept="image/*"`, `capture="environment"` sur mobile), réutilise la normalisation d'image (HEIC + downscale + base64) — **factoriser** l'utilitaire aujourd'hui privé à `useApiRecipeChat` dans un `app/utils/imageUpload.ts` partagé, consommé par les deux flux. États : `preparing | interpreting | done | error`.
- Sur succès : `useApiWineCellar().scanLabel(images)` → `WineLabelDraft`. La modale ouvre alors `WineForm` **pré-rempli** (nouvelle prop `prefill`) et conserve l'image normalisée pour l'attacher comme `labelPhoto` au submit `createWine`.
- `WineForm` : accepte des valeurs initiales de pré-remplissage (distinctes de `initial` d'édition) et, optionnellement, transmet `labelPhoto` dans le payload `submit`.
- Après création du vin, on enchaîne sur le flux existant `WineBottlesForm` (quantité pré-remplie depuis `suggestedBottleCount`).

## Risks / Trade-offs

- **Nouvelle brique de stockage de fichiers** = première du projet → périmètre non trivial. Mitigation : adapter filesystem minimal derrière un port, testé avec un fake en mémoire (les tests n'écrivent pas de disque). Path-traversal couvert par validation stricte de la clé.
- **Service de photo lisible par URL** (pas d'auth sur `<img>`) → on s'appuie sur des clés UUID non-devinables ; acceptable pour des étiquettes de vin. Évolution (URL signées) laissée ouverte.
- **Extraction imparfaite** (étiquette floue, millésime absent) : le brouillon est une aide, tous les champs sont éditables avant submit ; on n'invente rien (champ omis). La validation stricte reste au submit (`CreateWineSchema`).
- **Coût / effort IA** : effort `low` par défaut (comme photo recette), surchargable par env.
- **Fichiers orphelins** évités en persistant au submit et non à la capture (D4). Reste le cas d'un vin supprimé → nettoyage disque non couvert en v1 (documenté ; volume borné).
- **Duplication des bornes d'image** entre `wine-label.ts` et `recipe-chat.ts** : choix de découpler les capacités ; on documente l'alignement pour éviter la dérive.

## Migration Plan

Aucune migration de schéma DB : `photoUrl` existe déjà. Étapes de déploiement :
1. Provisionner le répertoire de stockage (`NUXT_WINE_LABEL_DIR`) et, en Docker, monter le volume correspondant (persistant).
2. Renseigner `NUXT_ANTHROPIC_LABEL_EFFORT` si l'on veut surcharger l'effort (sinon défaut `low`).
3. Déployer ; la fonctionnalité est gated par compte (`ai_enabled`) → aucun impact pour les comptes sans IA.
4. Rollback : retirer le bouton/route ; les `photoUrl` déjà enregistrés restent servis tant que le volume et la route existent (sinon `<img>` cassée, sans autre effet).

## Open Questions

- **Périmètre du port de stockage** : le garder dans `wine-cellar/domain` (retenu, v1) ou le hisser dès maintenant en capacité `platform`/partagée réutilisable par les `imageUrl` d'ingrédients/produits ? Proposé : rester dans wine-cellar, extraire plus tard si un 2ᵉ consommateur apparaît.
- **Nettoyage des photos** de vins supprimés : hors périmètre v1 — à traiter si le volume devient un souci.
- **Plusieurs photos** (recto/verso) : le port accepte `N` images ; l'UI v1 en propose-t-elle plusieurs d'emblée ou une seule extensible ? Proposé : une, extensible (aligné sur `MAX_LABEL_PHOTOS`).
