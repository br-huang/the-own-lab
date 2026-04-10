---
name: learn
description: 'Pipeline retrospective and pattern extraction for continuous learning. Use after every pipeline completion to capture lessons.'
---

# Learn

Pipeline retrospective and pattern extraction for continuous improvement.

## Retrospective Process

### 1. Review Pipeline Execution

Examine the completed pipeline run end to end:

- Which stages were executed and in what order
- Where gates passed or failed and why
- Key decisions made during execution
- Friction points — what took longer or was harder than expected

### 2. Identify Patterns

Look for recurring themes across this and previous runs:

- What worked well and should be reinforced
- What did not work and should be changed
- What was repeated manually and could be automated
- What assumptions proved wrong

### 3. Extract Patterns

Create or update pattern files with structured observations:

- Name the pattern clearly (e.g., "test-before-refactor", "validate-input-boundaries")
- Describe when the pattern applies
- Document what to do and what to avoid
- Assign a confidence score (see below)

### 4. Update Project Context

Keep the project knowledge base current:

- Tech stack changes (new dependencies, version upgrades)
- Convention changes (coding style, naming, file structure)
- Key decisions made (link to ADRs where applicable)

## Retrospective Template

Read the template before producing the retrospective:

```
Read ${CLAUDE_PLUGIN_ROOT}/templates/RETRO.md
```

## Pattern Confidence Scoring

Patterns earn confidence through repeated observation:

| Event                       | Score Change |
| --------------------------- | ------------ |
| First observation           | 0.3          |
| Each additional observation | +0.2         |
| Maximum confidence          | 0.9          |
| User rejects the pattern    | -0.1         |

A pattern at 0.3 is a tentative observation. A pattern at 0.7+ is well-established and should be actively applied in future runs.

## Memory Structure

Pattern and context data is stored per-project:

```
${COMPANY_OF_ONE_PLUGIN_DATA}/projects/{project-key}/
  pipeline.json    # Flow control (stage, status, timestamps)
  context.md       # Project knowledge (tech stack, conventions)
  patterns/        # Extracted patterns with confidence scores
    index.json     # Pattern index (session-start reads only this)
  briefs/          # Agent handoff (current.json + history/)
```

## Session Hooks Integration

- **SessionStart** — Load high-confidence patterns (≥0.7) + active brief + project context
- **PreCompact** — Ensure pipeline state is persisted
- **PostCompact** — Restore pipeline state, active brief, patterns, and context

## Guard Rails

- **Advisory only** — Patterns inform suggestions but do not override user decisions
- **User approval required** — Any change to project rules or conventions requires explicit user confirmation
- **No cross-project leakage** — Patterns are scoped to the project; they do not bleed across unrelated repositories
- **Transparency** — When a pattern influences a recommendation, cite it so the user can evaluate and override
