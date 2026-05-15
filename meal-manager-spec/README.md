# Meal Manager

Application web de gestion de repas familiaux : inventaire (placard + frigo), recettes, menus hebdomadaires et liste de courses générée automatiquement.

> ⚠️ **Ce repo ne contient pour l'instant que la spécification OpenSpec.** Le code n'est pas encore implémenté. Voir [`openspec/`](./openspec/) pour la spécification complète.

## Démarrage rapide (spec)

```bash
# Installer la CLI OpenSpec (Node.js >= 20.19)
npm install -g @fission-ai/openspec@latest

# Valider la structure
openspec validate

# Lister les changes actifs
openspec list
```

## Démarrage rapide (implémentation, à venir)

Une fois le change `init-meal-manager` implémenté :

```bash
# Cloner
git clone <ce-repo> && cd meal-manager

# Installer
npm install

# Configurer
cp .env.example .env
# éditer .env (DATABASE_URL, NUXT_SESSION_PASSWORD…)

# Lancer la base de données et l'app
docker compose up
```

## Stack

- **Nuxt 4** (front + back via Nitro)
- **Vue 3** + Pinia
- **Nuxt UI**
- **Drizzle ORM** + MariaDB
- **Zod** (validation)
- **nuxt-auth-utils** (sessions)
- **Vitest** (tests)
- **Docker** (déploiement)

## Architecture

Hexagonale (ports & adapters), découpée en **bounded contexts** :

- `platform` — auth, sessions, infrastructure
- `family` — foyer et membres
- `inventory` — stocks placard + frigo
- `catalog` — recettes
- `meal-planning` — menus hebdomadaires
- `shopping` — liste de courses générée

Chaque contexte respecte la séparation `domain / application / infrastructure`. Voir [`openspec/changes/init-meal-manager/design.md`](./openspec/changes/init-meal-manager/design.md).

## Workflow de développement

1. Toute évolution significative passe par un **change OpenSpec** (`openspec/changes/<slug>/`).
2. Une fois la proposition acceptée, on implémente les `tasks.md`.
3. Quand le change est terminé et validé, on l'**archive** : ses deltas sont mergés dans `openspec/specs/` qui devient la nouvelle source de vérité.
4. Les changes archivés sont conservés sous `openspec/changes/archive/` pour l'historique.

Voir la [doc OpenSpec](https://github.com/Fission-AI/OpenSpec) pour les détails.

## Licence

MIT (à confirmer au moment de l'implémentation).
