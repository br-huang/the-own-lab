---
name: git-ops
description: 'Git branch, commit, and merge operations following project conventions. Use for all git workflow actions.'
---

# Git Operations

Standardized git workflow for branch management, commits, and merges.

## Branch Naming

Use the following prefixes based on the type of work:

| Prefix      | Purpose                                    |
| ----------- | ------------------------------------------ |
| `feature/`  | New functionality                          |
| `fix/`      | Bug fixes                                  |
| `refactor/` | Code restructuring without behavior change |
| `docs/`     | Documentation updates                      |
| `chore/`    | Maintenance, tooling, dependency updates   |

Branch names should be lowercase, hyphen-separated, and descriptive:
`feature/add-user-authentication`, `fix/null-pointer-in-parser`

## Commit Convention

Follow the conventional commit format:

```
type(scope): description

Optional body with additional context.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Rules:

- Description is lowercase, imperative mood, no trailing period
- Scope is optional but encouraged for clarity
- Body explains "why" not "what" when the change is non-obvious
- Every commit includes the Co-Authored-By line

## Merge Workflow

1. Verify all tests pass on the branch
2. Ensure the branch is up to date with the target branch
3. Squash merge to keep history clean
4. Delete the feature branch after merge
5. Confirm a clean worktree after merge completes

## Safety Rules

- **Never** force-push to the default branch (main/master)
- **Never** delete the default branch
- **Always** verify tests pass before merging
- **Always** review the diff before committing
- **Never** commit files containing secrets or credentials
- Prefer creating new commits over amending existing ones
- Review `.gitignore` when adding new file types
- Tag releases with semantic versioning (vX.Y.Z)
