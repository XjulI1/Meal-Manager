# Meal Manager — OpenSpec

Spec-driven development pour l'application **Meal Manager** : gestion d'inventaire (placards + frigo), recettes, menus hebdomadaires et liste de courses pour une famille.

## Stack cible

- **Nuxt 4** (front + back via Nitro) — structure `app/` + `server/` + `shared/`
- **Vue 3** + Composition API
- **Nuxt UI** (design system officiel)
- **Pinia** (state management front)
- **Drizzle ORM** + driver `mysql2`
- **MariaDB** (base de données)
- **Zod** (validation aux frontières)
- **nuxt-auth-utils** (sessions email/mot de passe)
- **Vitest** (tests unitaires et d'intégration)
- **Docker** (déploiement)

## Architecture

Architecture hexagonale (ports & adapters) découpée en **bounded contexts** :

| Contexte | Responsabilité |
|---|---|
| `family` | Comptes utilisateurs, foyer, membres |
| `inventory` | Stocks placards et frigo |
| `catalog` | Recettes |
| `meal-planning` | Menus de la semaine |
| `shopping` | Liste de courses (générée depuis menu − inventory) |
| `platform` | Auth, sessions, infrastructure transverse |

Chaque contexte suit la séparation `domain / application / infrastructure`. Le domaine ne dépend de rien (ni Vue, ni Nuxt, ni Drizzle).

## Structure OpenSpec

```
openspec/
├── README.md                       # Ce fichier
├── project.md                      # Contexte projet partagé
├── specs/                          # Spécifications consolidées (source de vérité)
│   └── (vide tant que init-meal-manager n'est pas archivé)
└── changes/
    └── init-meal-manager/          # Change initial — pose les fondations
        ├── proposal.md
        ├── design.md
        ├── tasks.md
        └── specs/                  # Delta specs (toutes en ADDED puisque greenfield)
            ├── family/spec.md
            ├── inventory/spec.md
            ├── catalog/spec.md
            ├── meal-planning/spec.md
            ├── shopping/spec.md
            └── platform/spec.md
```

## Backlog (hors scope v1)

Documenté dans `proposal.md`, à proposer comme changes ultérieurs :

1. Dates de péremption + alertes
2. Scan de code-barres pour l'ajout d'articles
3. Décompte automatique du stock à la cuisson d'une recette
4. Génération automatique de menus via agent IA
5. Import de recettes depuis URL
6. Mode hors ligne (PWA + sync)

## Démarrage

```bash
# Installation
npm install -g @fission-ai/openspec@latest

# À la racine du projet
openspec validate         # Valide la structure
openspec list             # Liste les changes actifs
```

Une fois `init-meal-manager` implémenté et vérifié :

```bash
# Via l'assistant IA
/opsx:archive init-meal-manager
```

Les delta specs seront mergés dans `openspec/specs/` et deviendront la source de vérité.
