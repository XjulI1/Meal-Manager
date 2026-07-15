## MODIFIED Requirements

### Requirement: Référentiel de vins

Le système SHALL permettre à un membre du foyer de créer et modifier des références de vin (`Wine`). Une référence appartient à un foyer et porte :
- `name` (nom du vin) — **requis**, non vide.
- `domain` (domaine/producteur) — optionnel.
- `country` (pays) — optionnel, défaut « France ».
- `region` — optionnel, valeur d'une liste fermée de régions viticoles françaises (`bourgogne`, `bordeaux`, `beaujolais`, `vallee-du-rhone`, `vallee-de-la-loire`, `alsace`, `champagne`, `languedoc`, `provence`, `sud-ouest`, `jura`, `savoie`) ou `autre`.
- `appellation` — optionnel, texte libre.
- `vintage` (millésime) — optionnel, entier année (ex. 2022) ou « sans année ».
- `color` (robe) — **requis**, l'une de `rouge`, `blanc`, `rose`, `effervescent`.
- `gardeMin` / `gardeMax` — optionnels, entiers **année** ; si les deux sont fournis, `gardeMin ≤ gardeMax` (HTTP 400 sinon).
- `comment` — optionnel, texte libre.
- `photoUrl` — optionnel, URL d'une **photo d'étiquette**. Elle MAY être renseignée soit directement (URL externe), soit en joignant une **photo à uploader** (`labelPhoto`) à la création ou à la mise à jour : le système persiste alors la photo (voir « Stockage et service de la photo d'étiquette ») et enregistre l'URL servie dans `photoUrl`. `labelPhoto` et un `photoUrl` explicite sont mutuellement exclusifs. Le mécanisme `labelPhoto` est **indépendant du scan d'étiquette** : un membre peut fournir une photo à la main (sans passer par l'extraction IA), et une mise à jour avec `labelPhoto` **remplace** la photo existante du vin.
- `rating` — optionnel, entier 0–5.

#### Scenario: Créer une référence de vin
- **GIVEN** un membre authentifié d'un foyer
- **WHEN** il soumet `POST /api/cave/wines` avec `{ name: "Saint-Amour", color: "rouge", region: "beaujolais", vintage: 2023 }`
- **THEN** une référence de vin est créée dans son foyer
- **AND** `country` vaut « France » par défaut
- **AND** le système renvoie HTTP 201

#### Scenario: Robe manquante refusée
- **WHEN** un membre soumet un vin sans `color`
- **THEN** le système renvoie HTTP 400

#### Scenario: Fenêtre de garde incohérente refusée
- **WHEN** un membre soumet un vin avec `{ gardeMin: 2030, gardeMax: 2025 }`
- **THEN** le système renvoie HTTP 400

#### Scenario: Région hors liste refusée
- **WHEN** un membre soumet un vin avec `region: "toscane"`
- **THEN** le système renvoie HTTP 400

#### Scenario: Créer un vin avec une photo d'étiquette uploadée
- **GIVEN** un membre authentifié d'un foyer
- **WHEN** il soumet `POST /api/cave/wines` avec `{ name: "Saint-Amour", color: "rouge", labelPhoto: { mediaType: "image/jpeg", data: "<base64>" } }`
- **THEN** la photo est persistée pour ce foyer
- **AND** le vin créé a `photoUrl` pointant vers la photo servie
- **AND** le système renvoie HTTP 201

#### Scenario: Ajouter une photo à la main sans passer par le scan
- **GIVEN** un membre qui remplit le formulaire de vin sans utiliser le scan d'étiquette
- **WHEN** il joint une `labelPhoto` valide et soumet la création
- **THEN** la photo est persistée et `photoUrl` pointe vers la photo servie
- **AND** aucune extraction IA n'est déclenchée

#### Scenario: Remplacer la photo d'un vin existant
- **GIVEN** un vin du foyer avec une `photoUrl` déjà renseignée
- **WHEN** un membre soumet `PATCH /api/cave/wines/{id}` avec une nouvelle `labelPhoto`
- **THEN** la nouvelle photo est persistée
- **AND** `photoUrl` est mis à jour vers la nouvelle photo servie

#### Scenario: Mise à jour sans photo laisse photoUrl inchangé
- **GIVEN** un vin du foyer avec une `photoUrl` déjà renseignée
- **WHEN** un membre soumet `PATCH /api/cave/wines/{id}` sans `labelPhoto` ni `photoUrl`
- **THEN** `photoUrl` reste inchangé

## ADDED Requirements

### Requirement: Stockage et service de la photo d'étiquette

Le système SHALL persister la photo d'étiquette jointe à un vin et la servir en lecture. La photo n'est stockée **qu'au moment** de la création ou de la mise à jour d'un vin (jamais à la capture ou à l'extraction), de sorte qu'annuler la saisie ne laisse aucun fichier orphelin.

Le stockage MUST :
- N'accepter que les types image JPEG, PNG et WebP et rejeter (HTTP 400) tout autre type ou une image dépassant la taille autorisée, sans écrire de fichier.
- Écrire la photo sous une clé **opaque et non-devinable** (UUID), scopée au foyer propriétaire, et renvoyer une URL servie enregistrée dans `Wine.photoUrl`.
- Servir la photo en lecture via une route dédiée renvoyant le bon `Content-Type`, en se protégeant contre le path-traversal (clé validée, aucun accès hors du répertoire de stockage).

#### Scenario: Photo persistée et servie
- **GIVEN** un vin créé avec une `labelPhoto` valide
- **WHEN** un client requête l'URL enregistrée dans `photoUrl`
- **THEN** le système renvoie l'image avec le bon `Content-Type`

#### Scenario: Type de fichier non supporté refusé sans écriture
- **GIVEN** un membre soumettant un vin avec une `labelPhoto` d'un type non supporté (ex. `application/pdf`)
- **WHEN** le système traite la requête
- **THEN** il renvoie HTTP 400
- **AND** aucun fichier n'est écrit

#### Scenario: Annulation ne laisse pas de fichier orphelin
- **GIVEN** un membre qui scanne une étiquette et obtient un brouillon pré-rempli
- **WHEN** il ferme le formulaire sans valider la création du vin
- **THEN** aucune photo n'est persistée

#### Scenario: Tentative de path-traversal refusée
- **GIVEN** la route de service des photos
- **WHEN** une requête fournit une clé contenant `..` ou un chemin hors du répertoire de stockage
- **THEN** le système refuse l'accès (aucun fichier hors répertoire n'est servi)
