import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import nx from '@nx/eslint-plugin';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  prettier,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          depConstraints: [
            { sourceTag: 'scope:app', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.nx/**',
      '**/target/**',
      '**/.build/**',
      'apps/open-codex/**',
    ],
  },
];
