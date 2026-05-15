# Meal Manager — Project Context

Ce document décrit le contexte permanent du projet. Il complète les specs (qui décrivent le comportement) en fournissant le « pourquoi » et les contraintes durables.

## Vision

Une application web pour aider une famille à :

1. Connaître en temps réel ce qui est présent dans ses **placards** (sec, conserves) et son **frigo** (frais)
2. Centraliser ses **recettes** favorites
3. Composer des **menus à la semaine**
4. Générer automatiquement la **liste de courses** correspondante

## Utilisateurs

- **Foyer** : un foyer regroupe plusieurs membres adultes pouvant accéder à un inventaire commun et un planning commun.
- **Membre** : authentifié par email + mot de passe.
- L'application n'est **pas multi-tenant SaaS** : chaque déploiement sert une famille (ou un petit groupe). Pas de quotas, pas de facturation.

## Contraintes techniques

| Contrainte | Détail |
|---|---|
| Framework | Nuxt 4 — pas de backend séparé. Front et back dans le même projet. |
| Base de données | MariaDB (déjà disponible chez l'utilisateur). Pas d'autre dépendance de stockage. |
| Déploiement | Docker, image construite via Dockerfile dans le repo, déployée sur serveur personnel. |
| Hors ligne | Non pris en charge en v1. |
| Multi-langue | Français uniquement en v1 (locale `fr-FR`). |

## Principes d'architecture

### Architecture hexagonale par bounded context

Chaque contexte expose :

- **Domain** : entités, value objects, ports (interfaces), erreurs métier. **Aucune dépendance externe.**
- **Application** : use cases qui orchestrent le domaine via les ports.
- **Infrastructure** : adapters concrets (repositories Drizzle, contrôleurs HTTP, mappers).

Règle de dépendance : `infrastructure → application → domain`. Jamais l'inverse.

### Unités normalisées

Tous les ingrédients utilisent une **unité canonique** par dimension :

| Dimension | Unité canonique | Stockage |
|---|---|---|
| Masse | gramme (`g`) | entier |
| Volume | millilitre (`ml`) | entier |
| Pièce | unité (`unit`) | entier |

Les conversions (kg ↔ g, L ↔ ml, etc.) se font à la frontière (DTO ↔ Domain) via un Value Object `Quantity`. Le domaine ne manipule que les unités canoniques.

### Génération de liste de courses

La liste de courses est dérivée, jamais stockée comme source de vérité :

```
ShoppingList = Σ(Ingredients de chaque recette du menu × portions) − Inventory courant
```

Elle est calculée par un use case dédié et peut être persistée comme **snapshot** (l'utilisateur la coche en faisant ses courses), mais elle reste régénérable depuis le menu.

## Évolutions anticipées (backlog)

Les ports suivants sont conçus dès la v1 pour préparer ces extensions sans casser le domaine :

| Port | Préparé pour |
|---|---|
| `IBarcodeResolver` | Scan de code-barres |
| `IRecipeImporter` | Import de recettes depuis URL |
| `IMenuSuggester` | Génération automatique de menus (agent IA) |
| `IRecipeGenerator` | Création de recettes via IA à partir du stock |
| `IExpirationTracker` | Alertes de péremption |

## Conventions de code

- TypeScript strict (`strict: true`, `noUncheckedIndexedAccess: true`)
- ESLint + Prettier (config officielle Nuxt)
- Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.)
- Une PR = un change OpenSpec ou un sous-ensemble cohérent de tasks

## Hors scope (v1)

Voir le backlog dans `changes/init-meal-manager/proposal.md`. En résumé :

- Pas de gestion de péremption
- Pas de scan de code-barres
- Pas de décompte automatique du stock à la cuisson
- Pas de génération automatique de menus
- Pas d'import de recettes externes
- Pas de PWA / mode hors ligne
- Pas de partage de recettes entre foyers
