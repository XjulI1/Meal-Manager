## Context

Le contexte `wine-cellar` modélise l'apogée d'un vin comme une **fourchette d'années** (`gardeMin`/`gardeMax`, `smallint unsigned` nullable), pas comme une date calendaire. Un filtre `drinkableInYear` existe déjà (`list-bottles.use-case.ts`) : buvable en `y` ⇔ `(gardeMin === null || gardeMin ≤ y)` ET `(gardeMax === null || gardeMax ≥ y)`.

Il n'y a **aucun composant calendrier** réutilisable dans l'app (dates gérées par `<input type="date">` natif et par la navigation semaine des menus). La granularité annuelle rend un calendrier jour/mois inadapté : on construit donc une **timeline par année** + un **dashboard de statut** plutôt qu'une grille mensuelle.

L'architecture est hexagonale par bounded context ; règle de dépendance `infrastructure → application → domain`, DI via `server/plugins/container.ts`, isolation foyer via `requireHouseholdMember()`.

## Goals / Non-Goals

**Goals:**
- Une page sous `/cave` combinant dashboard « à boire » (année courante) et timeline par année, regroupés par cuvée avec compteur de bouteilles en stock.
- Un calcul de statut d'apogée **pur** dans le domaine, réutilisable et testé unitairement.
- Réutiliser la sémantique `drinkableInYear` existante (une seule source de vérité pour « buvable en y »).
- Zéro migration DB, zéro nouvelle dépendance.

**Non-Goals:**
- Pas de date d'apogée jour/mois ni de nouveau champ sur `Wine`.
- Pas de calendrier mensuel/hebdomadaire.
- Pas de notifications/rappels (« bois ce vin ce mois-ci »).
- Pas de planification par bouteille (granularité = cuvée, décidée avec l'utilisateur).
- Pas de nouvelle action « boire » : on réutilise `exit-bottle` existant via le détail cuvée.

## Decisions

### D1 — Statut d'apogée : fonction pure du domaine
Un module `domain/value-objects/apogee-status.vo.ts` exporte `computeApogeeStatus(gardeMin, gardeMax, refYear): ApogeeStatus` et l'union de types. Les statuts (`dépassé`, `à venir`, `début d'apogée`, `au sommet`, `fin d'apogée`, `garde non renseignée`) sont dérivés là, sans I/O. La fenêtre buvable est subdivisée **proportionnellement** : les premiers 20 % → `début`, les derniers 20 % → `fin`, les 60 % centraux → `au sommet`. Ainsi les phases s'adaptent à la longueur de garde (≈1 an pour 4 ans, ≈2 ans pour 10 ans) au lieu d'un seuil fixe. Le calcul est en entiers (`distance × 100 ≤ 20 × span`) pour éviter toute dérive flottante. Deux règles de désambiguïsation : (a) les nuances ne sont tracées **que si les deux bornes sont connues** — sinon la cuvée buvable est `au sommet` ; (b) sur une fenêtre d'un an (`span === 0`), la fermeture l'emporte (`fin`).
*Alternative écartée (seuil fixe 1 an)* : ne distinguait pas une garde courte d'une garde longue — un vin de garde 10 ans passait « fin » aussi tard qu'un vin de 4 ans.
*Alternative écartée* : calculer le statut côté front. Rejeté — la règle métier doit vivre dans le domaine, testable sans UI, et cohérente avec `drinkableInYear`.

### D2 — Réutiliser `drinkableInYear`, ne pas le dupliquer
Extraire (ou réutiliser) le prédicat `isDrinkableInYear(gardeMin, gardeMax, y)` pour qu'`apogee-status` **et** `list-bottles` partagent la même logique. Si `list-bottles` porte la logique inline, la déplacer dans un helper de domaine et l'y réimporter (refactor sans changement de comportement).

### D3 — Agrégation via un use case dédié
`application/use-cases/get-apogee-calendar.use-case.ts` : lit les cuvées du foyer (`IWineRepository`), compte les bouteilles `in_stock` par cuvée (`IBottleRepository`), exclut les cuvées à stock nul, calcule le statut pour l'année courante et renvoie une structure plate `{ refYear, wines: [{ ...identité, gardeMin, gardeMax, bottleCount, status }] }`. Le groupage en buckets et la ventilation timeline se font côté **front** à partir de cette liste plate — le serveur reste simple et l'année de référence peut varier côté client sans nouvel appel.
*Alternative écartée* : renvoyer déjà les buckets et les années depuis le serveur. Rejeté — moins flexible (changer l'année de réf ⇒ nouvel appel), et la présentation est une responsabilité UI.

### D4 — Endpoint de lecture
`server/api/cave/apogee-calendar.get.ts` : `requireHouseholdMember()` → `event.context.container.getApogeeCalendarUseCase.execute({ householdId })` → validation de sortie via un DTO Zod `ApogeeCalendarViewSchema` dans `shared/dto/wine-cellar.ts`. L'année courante est calculée côté serveur (`new Date().getFullYear()`).

### D5 — Front : une page, deux sections
`app/pages/cave/calendrier.vue`. `useApiWineCellar().getApogeeCalendar()` récupère la liste plate ; deux `computed` dérivent (a) les buckets de statut pour le dashboard, (b) la map `année → cuvées buvables` pour la timeline (bornes : `refYear` → `max(gardeMax)`). Code couleur de robe cohérent avec `WineCellarGrid`/spec `wine-cellar-visualization` (couleur + libellé texte). Lien d'accès ajouté depuis `/cave`. Le clic sur une cuvée ouvre le détail existant (drawer de `cave/index.vue`) — factoriser si nécessaire, sinon naviguer vers la cuvée.

## Risks / Trade-offs

- **[Une cuvée apparaît sur plusieurs années dans la timeline]** → comportement voulu (fenêtre pluriannuelle) ; clarifié dans la spec. Afficher la fenêtre `gardeMin–gardeMax` sur la carte pour lever l'ambiguïté.
- **[Cuvées sans garde renseignée noient la vue]** → regroupées dans une section « garde non renseignée » distincte, hors timeline et hors buckets d'urgence.
- **[Comptage bouteilles = N+1 potentiel]** → si `IBottleRepository` ne propose pas déjà un comptage groupé par vin, ajouter une méthode de repo qui agrège en une requête (`GROUP BY wine_id WHERE status='in_stock'`) plutôt que de boucler par cuvée.
- **[Duplication de la règle « buvable en y »]** → mitigé par D2 (helper de domaine partagé).
- **[Année courante testable]** → l'année de réf est injectée dans le use case/param, jamais figée dans le domaine, pour rester testable (cf. mémoire projet : pas de `Date.now()` non injecté).

## Migration Plan

Aucune migration DB. Déploiement standard (feature front + endpoint lecture). Rollback = retrait de la page et de l'endpoint ; aucune donnée écrite, aucune donnée à nettoyer.

## Open Questions

- Le seuil « fenêtre bientôt fermée » à `gardeMax − y ≤ 1` (2 dernières années) convient-il, ou faut-il seulement la dernière année (`= 0`) ? — défaut retenu : `≤ 1`.
- Faut-il un sélecteur d'année de référence dans le dashboard (simuler « dans 2 ans ») ? — hors scope v1, mais l'archi (liste plate + calcul front) le permet sans changement serveur.
