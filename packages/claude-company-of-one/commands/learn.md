---
name: learn
description: 'Review and manage learned patterns from pipeline executions. Use to review extracted patterns, accept/reject suggestions, or manually teach the system.'
---

# /learn — Learning & Pattern Management

You are managing the learning system for Company of One.
This command lets you review, accept, reject, and manually create patterns.

## Usage

```
/learn                     — show learning dashboard
/learn review              — review pending pattern suggestions
/learn patterns            — list all active patterns with confidence scores
/learn forget {pattern-id} — remove a pattern
/learn teach {description} — manually add a pattern
```

## Learning Dashboard

When invoked without arguments, display:

```markdown
# 🧠 Learning Dashboard

## Active Patterns: {N}

- High confidence (≥0.7): {N} — auto-loaded into sessions
- Medium confidence (0.4-0.7): {N} — available on demand
- Low confidence (<0.4): {N} — observed, not yet proven

## Pending Suggestions: {N}

{List of patterns extracted from recent retrospectives awaiting review}

## Recent Retrospectives: {N}

{Last 5 retrospectives with dates and pipeline types}

## Memory Usage

- Project context: {date last updated}
- Pattern files: {N}
- Decision records: {N}
```

## Review Mode (`/learn review`)

For each pending pattern suggestion:

1. Display the pattern with its source retrospective
2. Show the confidence score and evidence
3. Ask the user:
   - **'accept'** — promote to active pattern
   - **'reject'** — discard the pattern
   - **'edit'** — modify before accepting
   - **'skip'** — review later

## Pattern File Format

Patterns are stored in `${COMPANY_OF_ONE_PLUGIN_DATA}/projects/{project-key}/patterns/`:

```markdown
---
id: pattern-{NNN}
confidence: 0.7
source: retro/{date}-{pipeline}-{feature}.md
created: { date }
last_seen: { date }
times_observed: 3
---

# {Pattern Title}

## Pattern

{Clear description of the pattern}

## When to Apply

{Conditions under which this pattern is relevant}

## Evidence

- {date}: {observation from retrospective}
- {date}: {observation from retrospective}
```

## Confidence Scoring

| Score | Meaning                 | Behavior                         |
| ----- | ----------------------- | -------------------------------- |
| 0.3   | Observed once           | Stored, not loaded               |
| 0.5   | Observed 2x             | Stored, available on demand      |
| 0.7   | Observed 3x+            | Auto-loaded into session context |
| 0.9   | Proven across many runs | Auto-loaded, considered a rule   |

Confidence increases by +0.2 each time a pattern is observed in a new retrospective.
Confidence decreases by -0.1 if the user rejects or overrides the pattern.

## Manual Teaching (`/learn teach`)

When the user wants to manually add a pattern:

1. Ask the user to describe the pattern
2. Ask when it should be applied
3. Create the pattern file with confidence 0.7 (user-taught patterns start trusted)
4. Confirm the pattern was saved

## Forget (`/learn forget`)

When removing a pattern:

1. Display the pattern details
2. Confirm with the user
3. Delete the pattern file
4. Log the removal in the retrospective
