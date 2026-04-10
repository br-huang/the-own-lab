# Review Pipeline — Full Orchestration Flow

## Task Creation (at pipeline start)

```
TaskCreate: "Stage 1/3: Scan (reviewer)"
TaskCreate: "Stage 2/3: Deep Review (reviewer)"
TaskCreate: "Stage 3/3: Report (reviewer)"
```

---

## Stage 1: SCAN

- **Agent**: reviewer
- **Action**: Identify files to review (uncommitted changes, specific files, PR, or branch diff)
- **Gate**: Auto-proceed

---

## Stage 2: DEEP REVIEW

- **Agent**: reviewer
- **Action**: Apply full review checklist:
  - Logic & correctness
  - Security (secrets, injection, auth)
  - Maintainability (function size, naming, complexity)
  - Test coverage
- **Gate**: Auto-proceed

---

## Stage 3: REPORT

- **Agent**: reviewer
- **Action**: Present structured report to user
- **Output**: Printed to console (not saved to file — this is advisory)

```markdown
# Code Review Report

## Summary

- Files reviewed: {N}
- Issues: {N critical, N warning, N info}

## Critical Issues

...

## Warnings

...

## Suggestions

...

## What Went Well

...
```

- **Gate**: Auto-proceed — pipeline complete

---

## Notes

- This is an **advisory pipeline** — no code changes, no merge, no CHANGELOG
- No review-fix loop (the user decides what to act on)
- No retrospective (lightweight pipeline)
