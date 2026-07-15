## 1. DTOs

- [x] 1.1 Créer `shared/dto/wine-label.ts` : `WineLabelImageMediaTypeSchema` (`image/jpeg|png|webp`), `MAX_LABEL_PHOTOS`, borne base64, `WineLabelImageSchema`, `ScanWineLabelSchema { images }`
- [x] 1.2 `WineLabelDraftSchema` : `{ name?, domain?, country?, region?, appellation?, vintage?, color?, gardeMin?, gardeMax?, suggestedBottleCount(default 1) }` (tous les attributs de vin optionnels)
- [x] 1.3 `shared/dto/wine-cellar.ts` : ajouter `WineLabelInputSchema { mediaType, data }` et champ optionnel `labelPhoto` sur `CreateWineSchema` / `UpdateWineSchema` (exclusif avec un `photoUrl` explicite)

## 2. Domaine wine-cellar (ports & erreurs)

- [x] 2.1 Port `domain/ports/wine-label-extractor.port.ts` : `WineLabelImageInput`, `IWineLabelExtractor.extractFromPhotos(images) → WineLabelDraftContent`
- [x] 2.2 Port `domain/ports/label-photo-storage.port.ts` : `StoredPhotoInput { householdId, mediaType, data }`, `ILabelPhotoStorage.store(input) → { url }`
- [x] 2.3 Erreur métier `domain/errors/wine-label-scan.error.ts` (`WineLabelScanError`)

## 3. Extraction IA (infrastructure)

- [x] 3.1 `infrastructure/adapters/wine-extract-tool.ts` : définition du tool `extract_wine` (input_schema couvrant name/domain/country/region/appellation/vintage/color/gardeMin/gardeMax)
- [x] 3.2 `infrastructure/adapters/anthropic-wine-label-extractor.ts` : images base64 → message user, `tool_choice` forcé, `output_config.effort`, sortie validée contre `WineLabelDraftSchema`, normalisation défensive région→`autre` / robe omise, `WineLabelScanError` si vide
- [x] 3.3 Config effort : `DEFAULT_LABEL_EFFORT = 'low'` + parsing `NUXT_ANTHROPIC_LABEL_EFFORT` (réutiliser `parseEffort`), clé/modèle Anthropic existants

## 4. Stockage de fichiers (infrastructure)

- [x] 4.1 `infrastructure/adapters/filesystem-label-photo-storage.ts` : décode base64, valide le type, écrit `${wineLabelDir}/<householdId>/<uuid>.<ext>`, renvoie `{ url: '/api/cave/label-photos/<householdId>/<uuid>.<ext>' }`
- [x] 4.2 Validation stricte de la clé (anti path-traversal) partagée avec la route de service
- [x] 4.3 `runtimeConfig.wineLabelDir` ← `NUXT_WINE_LABEL_DIR` (nuxt.config) ; défaut de dev hors-repo

## 5. Use cases wine-cellar

- [x] 5.1 `application/use-cases/scan-wine-label.use-case.ts` : `execute({ householdId, images })` → `IWineLabelExtractor.extractFromPhotos` → `WineLabelDraft`
- [x] 5.2 `CreateWineUseCase` : si `labelPhoto` présent → `ILabelPhotoStorage.store({ householdId, ... })` → `photoUrl = url`
- [x] 5.3 `UpdateWineUseCase` : idem (remplace `photoUrl` si `labelPhoto` fourni)
- [x] 5.4 Câbler extracteur, storage et use cases dans `server/plugins/container.ts`

## 6. Endpoints HTTP

- [x] 6.1 `POST /api/cave/scan-label` : `requireAiEnabled` → `ScanWineLabelSchema.safeParse` (400 si invalide, sans appel IA) → `container.scanWineLabel` ; `WineLabelScanError` → 400
- [x] 6.2 `GET /api/cave/label-photos/[...key].get.ts` : lit le fichier depuis `wineLabelDir`, `Content-Type` + `Cache-Control`, refuse le path-traversal
- [x] 6.3 Ajuster les routes `POST /api/cave/wines` et `PATCH /api/cave/wines/[id]` pour accepter `labelPhoto` (validation, mapping erreurs stockage → 400)

## 7. Front

- [x] 7.1 Factoriser la normalisation d'image (HEIC + downscale + base64) de `useApiRecipeChat` dans `app/utils/imageUpload.ts` partagé ; recâbler `useApiRecipeChat` dessus (pas de régression recette)
- [x] 7.2 `useApiWineCellar` : `scanLabel(images) → WineLabelDraft`, et transmission de `labelPhoto` à `createWine`/`updateWine`
- [x] 7.3 Bouton « Scanner une étiquette » sur `/cave` : ouvre **directement** le sélecteur photo/caméra (`accept="image/*"`, `capture="environment"`) — pas de modale intermédiaire — avec toast « Lecture de l'étiquette… » + état loading pendant l'extraction (réutilise `imageUpload`)
- [x] 7.4 `WineForm` : prop `prefill` (valeurs initiales de scan, distinctes de `initial` d'édition) + upload de photo à la main (bouton « Ajouter/Changer la photo », aperçu) ; transmission de `labelPhoto` dans le payload `submit`
- [x] 7.5 `app/pages/cave/index.vue` : bouton scan → `WineForm` pré-rempli → enchaînement `WineBottlesForm` (quantité pré-remplie via `suggestedBottleCount`)
- [x] 7.6 Affichage des photos : vignette dans les onglets « Vins » et « Bouteilles » (pastille couleur en fallback) + aperçu plein format au clic (modale lightbox) ; aperçu de la photo stockée dans `WineForm`

## 8. Config & Docker

- [x] 8.1 `docker-compose.yml` : volume nommé monté sur le répertoire des étiquettes ; `NUXT_WINE_LABEL_DIR`
- [ ] 8.2 `.env.example` : documenter `NUXT_WINE_LABEL_DIR` et `NUXT_ANTHROPIC_LABEL_EFFORT`

## 9. Tests

- [x] 9.1 Unit : normalisation région→`autre` / robe omise du brouillon ; validation clé anti path-traversal
- [x] 9.2 Integration : `ScanWineLabelUseCase` avec extracteur fake (brouillon renvoyé, rien persisté) ; gating IA 403 ; isolation foyer ; images invalides → 400 sans appel IA
- [x] 9.3 Integration : `CreateWineUseCase` persiste la photo via storage fake et renseigne `photoUrl` ; `labelPhoto` non supporté → erreur mappée 400
- [x] 9.4 Smoke HTTP : `POST /api/cave/scan-label` (400 sans image, 403 IA off), `GET /api/cave/label-photos/...` (200 + Content-Type, refus `..`)

## 10. Validation finale

- [x] 10.1 `pnpm lint && pnpm typecheck && pnpm test`
- [x] 10.2 `openspec validate add-wine-label-scan --strict`
- [ ] 10.3 Vérification manuelle : scan d'une vraie étiquette en dev → formulaire pré-rempli → vin créé avec photo servie
