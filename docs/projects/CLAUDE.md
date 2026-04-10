# docs/projects/ Documentation Guide

`docs/projects/` is the single source of truth for all project management artifacts. Never create `docs/` inside `apps/`, `packages/`, or `scripts/`.

## Structure

```
docs/projects/<project-name>/
├── specs/                     ← feature specifications
│   └── YYYY-MM-DD-<slug>/
│       ├── REQUIREMENTS.md    ← required
│       ├── DESIGN.md
│       ├── PLAN.md
│       ├── REVIEW.md          ← optional
│       └── TEST.md            ← optional
├── adr/                       ← architecture decision records
│   └── NNN-<title>.md
└── issues/                    ← bug tracking
    └── NNN-<title>.md
```

## Document Types

| Type | Question it answers | Lifecycle |
|------|-------------------|-----------|
| specs/ | What does this feature do and how? | Write before dev → reference during → archive after |
| adr/ | Why did we choose A over B? | Write once at decision time, keep forever |
| issues/ | What broke and how was it fixed? | Create on discovery → close on fix |

## Naming Conventions

- **Spec directory**: `YYYY-MM-DD-<verb>-<feature-slug>` (e.g., `2026-04-09-add-dark-mode`)
- **Spec files**: uppercase `REQUIREMENTS.md`, `DESIGN.md`, `PLAN.md`, `REVIEW.md`, `TEST.md`
- **ADR**: `001-chose-electron-over-tauri.md` (zero-padded, past tense verb)
- **Issue**: `001-tab-crash-on-close.md` (zero-padded, descriptive)

## Specs Workflow

```
REQUIREMENTS.md → DESIGN.md → PLAN.md → [implement] → REVIEW.md → TEST.md
```

- **REQUIREMENTS.md** — Goals, scope, acceptance criteria
- **DESIGN.md** — Architecture, data flow, interface definitions
- **PLAN.md** — Step-by-step implementation plan with file-level specificity
- **REVIEW.md** — Post-dev review: actual vs expected, trade-off notes
- **TEST.md** — Test strategy, edge cases, verification results

## ADR Template

```markdown
# NNN-<title>

- Status: accepted | superseded by NNN
- Date: YYYY-MM-DD

## Context
(What problem did we face?)

## Decision
(What did we choose?)

## Consequences
(What are the trade-offs?)
```

Once written, ADRs are never deleted. Supersede with a new ADR and mark the old one as `superseded`.

## Issue Template

```markdown
# NNN-<title>

- Status: open | investigating | fixed
- Date: YYYY-MM-DD

## Problem
(Description + reproduction steps)

## Root Cause
(Analysis)

## Fix
(Solution applied)
```
