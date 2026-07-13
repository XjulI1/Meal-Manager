## ADDED Requirements

### Requirement: Extraction IA d'une étiquette de vin

Le système SHALL permettre à un membre authentifié d'un foyer d'extraire les attributs d'un vin à partir d'une ou plusieurs photos d'étiquette, via `POST /api/cave/scan-label`, en s'appuyant sur l'API Claude vision d'Anthropic.

L'endpoint MUST être scoped au foyer de l'appelant (`requireHouseholdMember()`) et MUST être gated par l'accès IA du compte (voir la capacité `platform` — HTTP 403 quand l'IA est désactivée). Une requête non authentifiée MUST renvoyer HTTP 401.

L'appelant MAY joindre entre 1 et un maximum borné d'images de la **même** étiquette (recto/verso). L'endpoint MUST valider les images à la frontière : il MUST rejeter (HTTP 400) une requête sans image, au-delà du maximum, d'un type non supporté (seuls JPEG, PNG et WebP sont acceptés) ou dépassant la taille autorisée. Un échec de validation MUST NOT appeler l'API Anthropic.

L'extraction MUST NOT créer, modifier ni supprimer de vin, de bouteille ou de fichier. Sa seule sortie est un **brouillon de vin** structuré (voir « Brouillon de vin »), utilisé côté client pour pré-remplir le formulaire d'ajout. Aucune photo n'est persistée à cette étape.

#### Scenario: Extraction depuis une photo d'étiquette
- **GIVEN** un membre authentifié d'un foyer dont le compte a l'IA activée
- **WHEN** il soumet `POST /api/cave/scan-label` avec une photo lisible d'étiquette
- **THEN** le système interprète l'image via Claude vision
- **AND** renvoie un brouillon de vin (attributs lisibles + quantité de bouteilles suggérée)
- **AND** aucun vin, bouteille ni fichier n'est persisté

#### Scenario: IA désactivée bloque l'extraction
- **GIVEN** un membre authentifié dont le compte a l'IA désactivée (défaut)
- **WHEN** il appelle `POST /api/cave/scan-label`
- **THEN** le système renvoie HTTP 403
- **AND** aucun appel n'est fait à l'API Anthropic

#### Scenario: Requête non authentifiée refusée
- **GIVEN** une requête sans session valide
- **WHEN** elle appelle `POST /api/cave/scan-label`
- **THEN** le système renvoie HTTP 401

#### Scenario: Aucune image fournie refusée
- **GIVEN** un membre avec IA activée
- **WHEN** il appelle `POST /api/cave/scan-label` sans image
- **THEN** le système renvoie HTTP 400
- **AND** aucun appel n'est fait à l'API Anthropic

#### Scenario: Trop d'images ou média non supporté refusé
- **GIVEN** un membre avec IA activée
- **WHEN** il soumet plus d'images que le maximum autorisé, une image trop volumineuse ou un type non supporté (ex. un PDF)
- **THEN** le système renvoie HTTP 400
- **AND** aucun appel n'est fait à l'API Anthropic

#### Scenario: Photo HEIC d'iPhone acceptée via conversion client
- **GIVEN** un membre avec IA activée
- **WHEN** il sélectionne une photo HEIC/HEIF d'étiquette
- **THEN** le client la convertit en JPEG avant l'envoi
- **AND** l'endpoint reçoit un type accepté et procède à l'extraction

### Requirement: Brouillon de vin

Quand l'extraction aboutit, le système SHALL renvoyer un **brouillon de vin** structuré plutôt que de persister quoi que ce soit.

Un brouillon de vin contient (tous les attributs de vin étant optionnels — un champ non lisible est omis, jamais inventé) :
- `name`, `domain`, `country`, `appellation` — texte libre.
- `region` — une valeur de la liste fermée des régions viticoles (`WINE_REGIONS`) ou `autre` ; toute valeur hors-liste MUST être ramenée à `autre`.
- `color` — l'une de `rouge`, `blanc`, `rose`, `effervescent` quand elle est déterminable, omise sinon.
- `vintage` — millésime entier quand lisible.
- `gardeMin` / `gardeMax` — années de garde quand indiquées.
- `suggestedBottleCount` — entier ≥ 1, défaut `1`.

Le brouillon MUST être renvoyé au client pour pré-remplir le formulaire d'ajout de vin (`WineForm`) et la quantité de bouteilles. La persistance n'a lieu que via le flux existant de création de vin, après revue et validation par le membre — les invariants stricts (robe requise, `gardeMin ≤ gardeMax`) sont vérifiés à ce moment-là, pas à l'extraction.

#### Scenario: Le brouillon pré-remplit le formulaire, pas la base
- **GIVEN** un brouillon de vin renvoyé par l'extraction
- **WHEN** le client le reçoit
- **THEN** il l'utilise pour pré-remplir `WineForm` et la quantité de bouteilles
- **AND** un vin n'est créé que lorsque le membre soumet le flux de création existant

#### Scenario: Robe et région mappées sur les listes fermées
- **GIVEN** une étiquette d'un vin rouge de la vallée du Rhône
- **WHEN** l'extraction traite l'image
- **THEN** le brouillon a `color = rouge`
- **AND** `region = vallee-du-rhone`

#### Scenario: Région hors-liste ramenée à autre
- **GIVEN** une étiquette d'un vin étranger (ex. Toscane)
- **WHEN** l'extraction traite l'image
- **THEN** le brouillon a `region = autre`

#### Scenario: Attribut illisible omis, jamais inventé
- **GIVEN** une étiquette sans millésime lisible
- **WHEN** l'extraction traite l'image
- **THEN** le brouillon ne renseigne pas `vintage`
- **AND** aucune valeur n'est inventée
