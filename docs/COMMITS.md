# Conventions de commit

Ce projet suit la spécification [Conventional Commits 1.0](https://www.conventionalcommits.org/fr/v1.0.0/). Chaque message de commit décrit **l'intention** du changement, pas un journal de bord détaillé.

## Format

```
<type>(<scope>)<!>: <résumé impératif, ≤ 72 caractères>

<corps optionnel : pourquoi, contraintes, alternatives écartées>

<footer optionnel : BREAKING CHANGE, refs OpenSpec, refs PR>
```

- **Type** : obligatoire, en minuscules.
- **Scope** : optionnel, entre parenthèses. Pour ce projet, le scope correspond généralement au *bounded context* (`platform`, `family`, `inventory`, `catalog`, `meal-planning`, `shopping`) ou à une zone transverse (`deploy`, `db`, `ui`, `shared`, `docs`).
- **`!`** : indique un *breaking change* (équivalent au footer `BREAKING CHANGE:`).
- **Résumé** : à l'impératif présent (« ajoute », « corrige », pas « ajouté » ni « ajout »). Pas de point final.

## Types autorisés

| Type       | Quand l'utiliser |
|------------|------------------|
| `feat`     | Nouvelle fonctionnalité visible utilisateur ou API publique. |
| `fix`      | Correction de bug. |
| `refactor` | Réorganisation interne sans changement de comportement observable. |
| `perf`     | Amélioration de performance sans changement de comportement. |
| `test`     | Ajout ou correction de tests uniquement. |
| `docs`     | Documentation (README, `docs/`, commentaires significatifs). |
| `chore`    | Outillage, dépendances, scripts (`package.json`, `.nvmrc`, lockfile). |
| `build`    | Système de build, Dockerfile, CI au sens packaging. |
| `ci`       | Pipelines (GitHub Actions, hooks pre-commit). |
| `style`    | Formatage pur (Prettier, espaces). Évite ce type : préfère que `pnpm format` soit déjà passé dans le commit qui introduit la modification. |
| `revert`   | Annulation d'un commit précédent (référence le SHA annulé dans le corps). |

## Exemples

```text
feat(inventory): ajoute le filtrage par emplacement sur GET /api/inventory

Permet à l'UI inventaire d'afficher placard et frigo séparément sans
deuxième requête. Le filtre s'applique côté repository (clause WHERE).

Refs: init-meal-manager §7.11
```

```text
fix(platform): neutralise le timing attack sur LoginUserUseCase

Toujours hasher un dummy hash quand l'email est inconnu pour égaliser
le temps de réponse.

Refs: init-meal-manager §4.6
```

```text
refactor(shopping)!: extrait ShoppingListBuilder du use case

BREAKING CHANGE: GenerateShoppingListUseCase prend désormais
ShoppingListBuilder en dépendance. La composition root doit être
mise à jour.
```

```text
docs: documente les conventions de commit (Conventional Commits)

Refs: init-meal-manager §13.3
```

```text
chore(deps): met à jour drizzle-orm 0.36 → 0.37
```

## Règles complémentaires

1. **Un commit = une intention.** Si le résumé contient « et », découpe en deux commits.
2. **Lien OpenSpec.** Quand un commit implémente une tâche de `openspec/changes/<change>/tasks.md`, référence-la dans le footer (`Refs: <change> §<n.m>`). Cela facilite l'archivage du change.
3. **Pas de bruit.** Les commits de type `style` ou « WIP » doivent être squashés avant merge sur `main`.
4. **Pas d'identifiants outillage.** Ne mentionne pas le modèle / l'assistant utilisé pour produire le commit dans le message — l'historique git n'est pas l'endroit pour ça.
5. **Une PR = un change OpenSpec ou un sous-ensemble cohérent de tâches.** Le titre de PR suit lui aussi la convention (`feat(...): …`).

## Vérification

Aucune validation automatique (hook commitlint) n'est en place en v1 ; la cohérence repose sur la relecture en PR. Si tu veux activer un garde-fou local :

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

Puis brancher un hook `commit-msg` via Husky ou `simple-git-hooks`. Hors scope v1.
