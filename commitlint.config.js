export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        // apps
        'browser',
        'never-forget-list',
        'obsidian-second-brain',
        'open-codex',
        'open-typora',
        'social-worker-ai',
        'the-own-lab',
        'ultra-terminal',
        // packages
        'claude-company-of-one',
        'claude-statusline',
        'documentation-framework',
        'ui',
        // scripts
        'scripts',
        // learn
        'learn',
        // root / cross-cutting
        'deps',
        'ci',
        'monorepo',
      ],
    ],
    'scope-empty': [1, 'never'], // warn if no scope
  },
};
