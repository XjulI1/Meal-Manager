## ADDED Requirements

### Requirement: Enrichissement IA d'une référence de vin

Le système SHALL permettre à un membre du foyer de déclencher, **à la demande**, un enrichissement d'une référence de vin (`Wine`) via l'API Anthropic **avec recherche web**. L'enrichissement recherche, pour la cuvée identifiée par ses attributs connus (`name`, `domain`, `country`, `region`, `appellation`, `vintage`, `color`) :

- la **fenêtre de garde** (années d'apogée), renseignée dans les champs existants `gardeMin` / `gardeMax` ;
- le **profil aromatique** (`aromas`, texte libre) ;
- les **accords mets/vin** (`foodPairings`, texte libre).

Le résultat SHALL être **écrit directement sur le vin** et l'horodatage `aiEnrichedAt` SHALL être positionné à l'instant de l'enrichissement. L'endpoint `POST /api/cave/wines/[id]/enrich` SHALL être scoped foyer via `requireHouseholdMember` : un vin d'un autre foyer SHALL renvoyer HTTP 404. L'IA ne SHALL PAS inventer d'information : un champ pour lequel la recherche ne donne rien de fiable est **omis** et laisse la valeur existante inchangée.

#### Scenario: Enrichissement réussi d'un vin
- **GIVEN** un membre authentifié d'un foyer et un vin de ce foyer
- **WHEN** il soumet `POST /api/cave/wines/{id}/enrich`
- **THEN** le système interroge l'API Anthropic avec recherche web
- **AND** persiste sur le vin les champs trouvés (`gardeMin`/`gardeMax`, `aromas`, `foodPairings`)
- **AND** positionne `aiEnrichedAt` à l'instant courant
- **AND** renvoie HTTP 200 avec la vue du vin enrichi

#### Scenario: Vin d'un autre foyer
- **WHEN** un membre soumet `POST /api/cave/wines/{id}/enrich` pour un vin qui n'appartient pas à son foyer
- **THEN** le système renvoie HTTP 404
- **AND** aucun appel à l'API Anthropic n'est effectué

#### Scenario: Champ non trouvé laissé inchangé
- **GIVEN** un vin dont `gardeMin`/`gardeMax` sont déjà renseignés manuellement
- **WHEN** l'enrichissement ne trouve pas de fenêtre de garde fiable pour la cuvée
- **THEN** `gardeMin`/`gardeMax` conservent leur valeur existante
- **AND** les champs effectivement trouvés (`aromas`, `foodPairings`) sont mis à jour

#### Scenario: Fenêtre de garde incohérente rejetée
- **WHEN** l'enrichissement produirait `gardeMin > gardeMax`
- **THEN** l'invariant de cohérence de la fenêtre de garde s'applique (comme à la création/édition manuelle)
- **AND** le résultat incohérent n'est pas persisté

### Requirement: Re-déclenchement à la demande

Le système SHALL permettre de **relancer** l'enrichissement d'un vin déjà enrichi. Un nouvel enrichissement SHALL écraser les champs trouvés par la nouvelle recherche et mettre à jour `aiEnrichedAt`. Aucun enrichissement automatique ou périodique NE SHALL être déclenché : l'appel à l'IA n'a lieu que sur action explicite de l'utilisateur (maîtrise du coût).

#### Scenario: Relance d'un enrichissement
- **GIVEN** un vin déjà enrichi (`aiEnrichedAt` renseigné)
- **WHEN** le membre relance `POST /api/cave/wines/{id}/enrich`
- **THEN** les champs trouvés sont ré-écrits avec le nouveau résultat
- **AND** `aiEnrichedAt` reflète la nouvelle date

#### Scenario: Pas d'enrichissement sans action utilisateur
- **WHEN** un vin est simplement consulté ou listé
- **THEN** aucun appel à l'API Anthropic n'est effectué

### Requirement: Restitution des données d'enrichissement

La vue d'un vin (`WineView`) SHALL exposer les champs `aromas`, `foodPairings` et `aiEnrichedAt`. À l'ouverture du détail d'un vin, l'interface SHALL présenter une **fiche complète** regroupant les attributs du vin (robe, domaine, région, appellation, millésime, pays, note, commentaire, photo d'étiquette lorsqu'ils sont renseignés) ET le bloc d'enrichissement IA. Le bloc IA SHALL afficher, pour un vin enrichi, la période de garde, le profil aromatique et les accords mets/vin, un badge « Recherché le … » basé sur `aiEnrichedAt`, et un bouton permettant de lancer ou relancer la recherche. Lorsqu'un vin a été enrichi mais qu'un champ (période de garde, arômes ou accords) n'a pas été trouvé par la recherche, l'interface SHALL l'indiquer explicitement (« Non déterminé·e par la recherche ») plutôt que de masquer la ligne.

#### Scenario: Affichage d'un vin enrichi
- **GIVEN** un vin dont `aiEnrichedAt`, `aromas` et `foodPairings` sont renseignés
- **WHEN** le membre ouvre la modale détail du vin
- **THEN** les attributs du vin (robe, domaine, région, appellation, millésime, pays, note, commentaire renseignés) sont affichés
- **AND** le profil aromatique et les accords mets/vin sont affichés
- **AND** un badge indique la date de dernière recherche
- **AND** un bouton « Relancer » est proposé

#### Scenario: Affichage d'un vin jamais enrichi
- **GIVEN** un vin dont `aiEnrichedAt` est vide
- **WHEN** le membre ouvre la modale détail du vin
- **THEN** aucun badge de date n'est affiché
- **AND** un bouton « Rechercher via l'IA » est proposé

#### Scenario: Champ non trouvé signalé après enrichissement
- **GIVEN** un vin enrichi (`aiEnrichedAt` renseigné) dont `gardeMin`/`gardeMax` sont vides
- **WHEN** le membre ouvre la modale détail du vin
- **THEN** la période de garde est affichée comme « Non déterminée par la recherche »
- **AND** la même règle s'applique aux arômes et aux accords mets/vin absents
