## 1. Domaine — statut d'apogée (pur)

- [x] 1.1 Ajouter un helper de domaine `isDrinkableInYear(gardeMin, gardeMax, y)` dans `server/contexts/wine-cellar/domain/` et refactorer `list-bottles.use-case.ts` pour l'utiliser (aucun changement de comportement)
- [x] 1.2 Créer `domain/value-objects/apogee-status.vo.ts` : type union `ApogeeStatus` (`depasse` | `a-venir` | `bientot-fermee` | `au-sommet` | `garde-non-renseignee`) + `computeApogeeStatus(gardeMin, gardeMax, refYear)` pur, réutilisant `isDrinkableInYear` ; seuil « bientôt fermée » = `gardeMax − y ≤ 1`
- [x] 1.3 Tests unitaires `tests/unit/` couvrant tous les scénarios de la spec (au sommet, bientôt fermée, dépassé, à venir, bornes ouvertes, garde non renseignée)

## 2. Application — use case d'agrégation

- [x] 2.1 Créer `application/use-cases/get-apogee-calendar.use-case.ts` : entrée `{ householdId, refYear }` ; charge les cuvées (`IWineRepository.list…`) et les bouteilles via `IBottleRepository.listInStock(householdId)`, groupe le comptage par `wineId` en mémoire, exclut les cuvées à stock nul, calcule `computeApogeeStatus` par cuvée
- [x] 2.2 Sortie : `{ refYear, wines: [{ id, name, domain, color, region, vintage, gardeMin, gardeMax, bottleCount, status }] }` (liste plate ; buckets/timeline dérivés côté front)
- [x] 2.3 Test d'intégration `tests/integration/` avec repositories en mémoire : regroupement par cuvée, exclusion des cuvées sans stock, isolation foyer

## 3. DTO & HTTP

- [x] 3.1 Ajouter `ApogeeCalendarViewSchema` (+ `ApogeeCalendarWineSchema`, enum `ApogeeStatus`) dans `shared/dto/wine-cellar.ts`
- [x] 3.2 Créer la route `server/api/cave/apogee-calendar.get.ts` : `requireHouseholdMember()`, `refYear = new Date().getFullYear()`, appel `event.context.container.getApogeeCalendarUseCase.execute(...)`, validation de sortie via le DTO
- [x] 3.3 Câbler le use case dans le container : instanciation dans `server/plugins/container.ts` et typage dans `server/types/container.ts`

## 4. Front — page calendrier d'apogée

- [x] 4.1 Étendre `app/composables/useApiWineCellar.ts` avec `getApogeeCalendar()` typé via le DTO
- [x] 4.2 Créer `app/pages/cave/calendrier.vue` : appel du composable + `computed` dérivant (a) buckets de statut pour le dashboard, (b) map `année → cuvées buvables` pour la timeline (`refYear` → `max(gardeMax)`), (c) section « garde non renseignée »
- [x] 4.3 Dashboard « à boire » : buckets ordonnés (bientôt fermée, au sommet, à venir, dépassé, garde non renseignée), carte cuvée avec nom + robe (code couleur + libellé) + compteur bouteilles, masquage des buckets vides
- [x] 4.4 Timeline par année : une section par année listant les cuvées buvables (fenêtre `gardeMin–gardeMax` affichée), cuvée pouvant apparaître sur plusieurs années
- [x] 4.5 Clic sur une cuvée → ouverture du détail existant (drawer de `cave/index.vue` factorisé, ou navigation vers la cuvée) permettant l'action « boire » (sortie bouteille) existante
- [x] 4.6 Ajouter le lien de navigation vers `/cave/calendrier` depuis la page cave

## 5. Vérification

- [x] 5.1 `pnpm lint` + `pnpm typecheck` verts (dont règle d'isolation domaine)
- [x] 5.2 `pnpm test` vert (unitaires statut + intégration use case)
- [x] 5.3 `pnpm exec openspec validate add-wine-apogee-calendar --strict` vert
- [x] 5.4 Vérif manuelle en dev : page `/cave/calendrier` affiche dashboard + timeline cohérents avec les données de cave
