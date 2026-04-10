# docs/projects/ Documentation Guide

`docs/projects/` is the single source of truth for all project management artifacts. Never create `docs/` inside `apps/`, `packages/`, or `scripts/`.

## Structure

```
docs/projects/<project-name>/
├── CHANGELOG.md               ← version history
├── specs/                     ← feature specifications (snapshot)
│   └── YYYY-MM-DD-<slug>/
│       ├── REQUIREMENTS.md    ← required
│       ├── DESIGN.md
│       ├── PLAN.md
│       ├── REVIEW.md          ← optional
│       └── TEST.md            ← optional
├── wiki/                      ← persistent project knowledge (living)
│   └── <topic>.md
├── adr/                       ← architecture decision records (immutable)
│   └── NNN-<title>.md
└── issues/                    ← bug tracking (with frontmatter)
    └── NNN-<title>.md
```

## Document Types

| Type | When to write | Lifecycle | Example |
|------|--------------|-----------|---------|
| specs/ | Before starting a feature | Snapshot: write → implement → archive | `2026-04-09-add-dark-mode/PLAN.md` |
| wiki/ | Anytime knowledge accumulates | Living: keep up-to-date as project evolves | `rag-pipeline.md`, `deployment-guide.md` |
| adr/ | When making an architecture decision | Immutable: never delete, only supersede | `001-chose-electron-over-tauri.md` |
| issues/ | When a bug is discovered | Tracked: pending → processing → completed | `001-tab-crash-on-close.md` |
| CHANGELOG.md | When shipping a version | Append-only: newest entries at top | — |

## Naming Conventions

- **Spec directory**: `YYYY-MM-DD-<verb>-<feature-slug>` (e.g., `2026-04-09-add-dark-mode`)
- **Spec files**: uppercase `REQUIREMENTS.md`, `DESIGN.md`, `PLAN.md`, `REVIEW.md`, `TEST.md`
- **Wiki**: lowercase kebab-case `<topic>.md` (e.g., `rag-pipeline.md`)
- **ADR**: `NNN-<past-tense-verb>-<subject>.md` (e.g., `001-chose-electron-over-tauri.md`)
- **Issue**: `NNN-<descriptive-slug>.md` (e.g., `001-tab-crash-on-close.md`)

## Specs Workflow

```
REQUIREMENTS.md → DESIGN.md → PLAN.md → [implement] → REVIEW.md → TEST.md
```

- **REQUIREMENTS.md** — Goals, scope, acceptance criteria
- **DESIGN.md** — Architecture, data flow, interface definitions
- **PLAN.md** — Step-by-step implementation plan with file-level specificity
- **REVIEW.md** — Post-dev review: actual vs expected, trade-off notes
- **TEST.md** — Test strategy, edge cases, verification results

## Wiki Guidelines

Wiki pages are living documents distilled from completed specs and ongoing experience.

- One file per topic, not per feature
- Update existing pages rather than creating new ones for the same topic
- Good wiki topics: architecture overview, data flow, deployment, API reference, conventions

## Issue Template

Issues MUST have YAML frontmatter:

```markdown
---
issue: <short description>
status: pending | processing | completed
created_at: YYYY-MM-DD
---

## Problem

(Description + reproduction steps)

## Root Cause

(Analysis — fill in during investigation)

## Fix

(Solution applied — fill in after resolution)
```

Status transitions: `pending` → `processing` → `completed`. Never skip states.

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

## CHANGELOG Format

Follow [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [0.2.0] - 2026-04-10

### Added
- PDF ingestor with page-range support

### Fixed
- Empty vault crash on startup

## [0.1.0] - 2026-04-07

### Added
- Initial RAG core with local embeddings
```
