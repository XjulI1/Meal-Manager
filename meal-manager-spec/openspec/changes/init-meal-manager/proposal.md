# Proposal: Initialize Meal Manager Application

## Intent

Poser les fondations d'une application Nuxt 4 permettant à une famille de gérer son inventaire alimentaire, ses recettes, ses menus hebdomadaires et sa liste de courses, en respectant une architecture hexagonale par bounded context.

Ce change initial regroupe toutes les fondations en un seul lot cohérent — c'est le bootstrap du projet. Les évolutions futures (péremption, scan code-barres, IA, etc.) feront chacune l'objet d'un change séparé.

## Scope

### In scope

- **Plateforme** : projet Nuxt 4 (front + back via Nitro), Docker, MariaDB, Drizzle ORM, Nuxt UI
- **Authentification** : inscription et connexion par email + mot de passe, sessions via `nuxt-auth-utils`
- **Foyers** : un membre peut créer un foyer ou rejoindre un foyer existant via un code d'invitation
- **Inventaire** : CRUD des articles en placard et au frigo, avec unités normalisées (g, ml, unit)
- **Catalogue de recettes** : CRUD des recettes (titre, instructions, portions, ingrédients)
- **Planning de menus** : composition manuelle d'un menu sur une semaine donnée (petit-déjeuner, déjeuner, dîner × 7 jours)
- **Liste de courses** : génération à la demande à partir d'un menu, soustraction de l'inventaire, persistance comme snapshot cochables
- **Architecture hexagonale** : séparation `domain / application / infrastructure` par bounded context

### Out of scope (backlog)

Les éléments suivants sont **explicitement reportés** à des changes ultérieurs :

1. **Dates de péremption** + alertes — port `IExpirationTracker` prévu mais non implémenté
2. **Scan de code-barres** pour ajouter un article — port `IBarcodeResolver` prévu
3. **Décompte automatique** du stock à la cuisson d'une recette
4. **Génération automatique de menus** via agent IA — port `IMenuSuggester` prévu
5. **Génération de recettes** par IA à partir du stock — port `IRecipeGenerator` prévu
6. **Import de recettes** depuis URL — port `IRecipeImporter` prévu
7. **Mode hors ligne** (PWA + synchronisation)
8. **Multi-langue** (FR uniquement en v1)
9. **OAuth** (Google, GitHub, etc.) — port `IAuthProvider` permet d'ajouter sans casser le domaine
10. **Partage de recettes** entre foyers
11. **Historique de cuisson** et statistiques

## Approach

### Choix structurants

1. **Tout dans Nuxt 4** — pas de backend séparé. Nitro fait office d'API ; le code serveur vit dans `server/`, le code client dans `app/`. Cela simplifie le déploiement (une seule image Docker) et le partage de types via `shared/`.

2. **Drizzle plutôt que Prisma** — Drizzle est SQL-first et n'impose pas de client généré qui polluerait la couche infrastructure. Ses schémas TypeScript se mappent proprement vers des entités de domaine via des **mappers** dédiés, ce qui préserve l'isolation de la couche domaine.

3. **Bounded contexts** au lieu d'une architecture en couches techniques unique. Chaque contexte (`family`, `inventory`, `catalog`, `meal-planning`, `shopping`, `platform`) a sa propre tranche `domain/application/infrastructure`. Cela permet de faire évoluer un contexte sans risquer de casser les autres.

4. **Unités canoniques** — toutes les quantités stockées en `g`, `ml` ou `unit` (entiers). Les conversions vivent dans `shared/units/` et opèrent à la frontière (lors du parsing des DTO entrants et lors du rendu pour l'UI).

5. **Liste de courses dérivée** — pas une entité indépendante, mais le résultat d'un use case `GenerateShoppingListFromMenuUseCase`. Une fois générée, elle peut être persistée comme `ShoppingListSnapshot` (avec état coché/non coché par ligne) pour l'usage en magasin.

6. **Préparation des extensions futures** — les ports `IBarcodeResolver`, `IRecipeImporter`, `IMenuSuggester`, `IRecipeGenerator`, `IExpirationTracker` sont **définis dans le domaine** dès la v1, même si aucun adapter n'est branché. Ainsi, ajouter le scan ou l'IA plus tard ne demandera pas de refactoring du domaine.

### Découpage en deltas

Le change est découpé en 6 delta specs (toutes en `ADDED Requirements` puisque c'est un greenfield) :

| Domain | Responsabilité |
|---|---|
| `platform/spec.md` | Authentification, sessions, infrastructure |
| `family/spec.md` | Foyers, membres, invitations |
| `inventory/spec.md` | Articles en stock (placard + frigo) |
| `catalog/spec.md` | Recettes et leurs ingrédients |
| `meal-planning/spec.md` | Menus hebdomadaires |
| `shopping/spec.md` | Génération et suivi des listes de courses |

### Validation

Le change est considéré **terminé** quand :

- Toutes les tâches de `tasks.md` sont cochées
- `npm run test` passe (Vitest)
- `npm run build` produit une image Docker fonctionnelle
- Un parcours utilisateur complet est jouable manuellement : inscription → création foyer → ajout d'articles → création d'une recette → composition d'un menu → génération d'une liste de courses
