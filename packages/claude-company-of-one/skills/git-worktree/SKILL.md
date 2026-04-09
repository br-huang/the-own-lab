---
name: git-worktree
description: "Create and manage git worktrees for isolated development. Use when pipeline needs an isolated workspace."
---

# Git Worktree Management

Create and manage git worktrees for isolated, parallel development.

## When to Use

- Feature development that should not affect the current working tree
- Parallel pipeline executions that need separate workspaces
- Testing a fix while keeping the current branch state intact
- Comparing behavior across branches simultaneously

## Create a Worktree

```bash
git worktree add <path> <branch>
```

### Naming Convention

Place worktrees in a predictable location relative to the main repository:

```
../worktrees/<branch-name>
```

### Setup After Creation

1. Navigate to the new worktree directory
2. Install dependencies if needed (the worktree shares git history but not node_modules, venv, etc.)
3. Verify the correct branch is checked out
4. Run a quick sanity check (build or test) before starting work

## List Active Worktrees

```bash
git worktree list
```

Shows all worktrees, their paths, and which branch each has checked out.

## Cleanup

After the branch has been merged or the work is complete:

```bash
git worktree remove <path>
```

Then prune any stale references:

```bash
git worktree prune
```

## Safety Rules

- **Never** delete a worktree that has uncommitted changes — commit or stash first
- **Never** check out the same branch in multiple worktrees simultaneously
- Always verify the worktree is clean before removing it
- Clean up worktrees promptly after merge to avoid clutter
