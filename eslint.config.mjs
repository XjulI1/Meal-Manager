// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

/**
 * Hexagonal architecture boundary: the `domain` layer of any bounded context
 * MUST NOT depend on frameworks or infrastructure. Violations fail CI.
 */
const DOMAIN_FORBIDDEN_PATTERNS = [
  'drizzle-orm',
  'drizzle-orm/*',
  'mysql2',
  'mysql2/*',
  'h3',
  'h3/*',
  '#imports',
  'nuxt',
  'nuxt/*',
  '@nuxt/*',
  'vue',
  'vue/*',
  '~/server/database/*',
  '~~/server/database/*',
]

export default withNuxt([
  {
    // Worktrees créés sous .claude/worktrees/ (isolation d'agents) sont des
    // checkouts git indépendants avec leur propre historique ; les scanner
    // ferait échouer le lint sur le contenu d'une autre branche en cours.
    ignores: ['.claude/worktrees/**'],
  },
  {
    files: ['server/contexts/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: DOMAIN_FORBIDDEN_PATTERNS,
              message:
                'Domain layer must not depend on frameworks or infrastructure. Define a port in domain/ports and implement it in infrastructure/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
