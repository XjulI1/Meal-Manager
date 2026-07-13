## Why

Ajouter une bouteille à la cave demande aujourd'hui de remplir `WineForm` à la main : nom, domaine, région, appellation, millésime, robe, fenêtre de garde. C'est fastidieux, surtout quand on rentre plusieurs bouteilles d'affilée, alors que toute l'information figure sur l'étiquette. Par ailleurs la colonne `photoUrl` du vin existe depuis l'origine mais reste vide (« upload non fourni en v1 ») : on n'a aucune trace visuelle du vin.

On veut donc pouvoir **photographier l'étiquette**, laisser **l'IA pré-remplir le formulaire d'ajout**, et **conserver la photo** rattachée au vin.

## What Changes

- **Nouveau flux « Scanner une étiquette »** sur la page `/cave` : un bouton en tête de page ouvre une capture photo (upload / prise de photo fichier), réutilisant le pipeline HEIC + downscale de l'import photo de recettes existant.
- **Extraction IA** : la (ou les) photo(s) sont envoyées à un nouvel endpoint `POST /api/cave/scan-label` qui appelle Claude vision (tool forcé) et renvoie un **brouillon de vin structuré** (`WineLabelDraft`) — jamais persisté. Endpoint scoped foyer et **gated par l'accès IA** (`requireAiEnabled`, HTTP 403 si désactivé), comme l'assistant recettes.
- **Pré-remplissage** : le brouillon pré-remplit `WineForm` (nom, domaine, région mappée sur la liste fermée, appellation, millésime, robe, garde) plus une **quantité de bouteilles** par défaut. Rien n'est créé tant que le membre n'a pas validé le formulaire existant.
- **Persistance de la photo d'étiquette** : `photoUrl` du vin est désormais alimentable. La photo validée est stockée via une **nouvelle brique de stockage de fichiers** (port `ILabelPhotoStorage` + adapter filesystem sur un répertoire configurable, monté comme volume en Docker) et servie par une route Nitro ; l'URL servie est enregistrée dans `photoUrl` **au moment de la création/mise à jour du vin** (pas à la capture → aucun fichier orphelin).

## Capabilities

### New Capabilities

- `wine-label-scan` : extraction IA des attributs d'un vin à partir d'une ou plusieurs photos d'étiquette, renvoyée comme brouillon structuré pour pré-remplir le formulaire d'ajout.

### Modified Capabilities

- `wine-collection` : le `Wine` peut désormais porter une **photo d'étiquette persistée** (`photoUrl` alimenté par upload à la création/mise à jour) ; ajout des règles de stockage et de service de cette photo (scoping foyer, formats et taille acceptés).

## Impact

- **Nouveau contexte / capacité** : `wine-label-scan` — port `IWineLabelExtractor` (domain `wine-cellar`), adapter `AnthropicWineLabelExtractor` (infrastructure), use case `ScanWineLabelUseCase`.
- **Stockage de fichiers** : port `ILabelPhotoStorage` (domain `wine-cellar`) + adapter `FilesystemLabelPhotoStorage` (infrastructure) écrivant dans un répertoire configurable ; route Nitro de service.
- **Use cases wine-cellar** : `CreateWineUseCase` / `UpdateWineUseCase` acceptent une photo d'étiquette optionnelle et la persistent via `ILabelPhotoStorage`.
- **DTOs** : nouveau `shared/dto/wine-label.ts` (image d'entrée, `WineLabelDraft`) ; `shared/dto/wine-cellar.ts` — `CreateWineSchema`/`UpdateWineSchema` acceptent un `labelPhoto` optionnel.
- **Endpoints HTTP** : `POST /api/cave/scan-label` (extraction), route de service des photos, ajustement des routes create/update wine.
- **Config** : `NUXT_ANTHROPIC_*` (effort dédié `label`), `NUXT_WINE_LABEL_DIR` (répertoire de stockage) ; `docker-compose.yml` (volume), `.env.example`.
- **DI** : `server/plugins/container.ts` (extracteur IA, storage, use cases mis à jour).
- **Front** : `app/pages/cave/index.vue` (bouton + modale de scan), nouveau composant/composable de capture, `WineForm` accepte des valeurs initiales de pré-remplissage + upload photo, `useApiWineCellar` (scan-label, envoi photo).
- **Tests** : unit (mapping robe/région du brouillon), integration (use case scan avec extracteur fake, create wine persistant la photo via storage fake, gating IA 403, isolation foyer, validation d'images 400).
