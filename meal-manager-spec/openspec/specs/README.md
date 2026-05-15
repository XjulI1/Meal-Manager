# Specs (source of truth)

Ce répertoire contiendra les spécifications consolidées **après archivage** du change `init-meal-manager`.

Tant que `init-meal-manager` est actif, ce répertoire est vide. Les delta specs vivent dans `openspec/changes/init-meal-manager/specs/`.

Lorsque le change sera archivé (`/opsx:archive init-meal-manager`), chaque delta sera mergé ici sous la forme :

```
openspec/specs/
├── platform/spec.md
├── family/spec.md
├── inventory/spec.md
├── catalog/spec.md
├── meal-planning/spec.md
└── shopping/spec.md
```

Ces fichiers deviendront alors la **source de vérité** du système, et les changes ultérieurs (péremption, IA, scan, etc.) y appliqueront leurs propres deltas (ADDED / MODIFIED / REMOVED).
