---
name: plan
description: 'Architecture planning pipeline: gather requirements → design → document. Use when planning a feature or system without writing code.'
---

# /plan — Architecture Planning Pipeline

You are orchestrating an architecture planning session for Claude 一人公司 (Company of One).
This pipeline produces design documents and ADRs — no code is written.

## Before Starting

1. Initialize pipeline state: `bash hooks/scripts/lib/pipeline-state.sh init plan {topic} large 3`
2. Initialize brief: `bash hooks/scripts/lib/brief-manager.sh init plan {topic} large`
3. Agents read and write `briefs/current.json` as single source of truth
4. ADRs go to `docs/adr/` in the project repo (git-tracked). All other artifacts go to plugin data.

## Pipeline Stages

---

### Stage 1: GATHER (Agent: product-owner)

Invoke the **product-owner** agent to gather and structure requirements.

**Input**: User's planning request
**Output**: Update `briefs/current.json` field `requirements`

The product-owner agent will:

- Understand what the user wants to plan
- Ask clarifying questions about constraints, goals, and priorities
- Define success criteria for the design
- Identify stakeholders and dependencies

<HARD-GATE>
Present the gathered requirements to the user.

"**Stage 1 Complete: Requirements Gathered**

Planning scope:
{brief summary}

Success criteria:
{list}

Reply **'approved'** to proceed to design, or provide corrections."

DO NOT proceed to Stage 2 until the user explicitly approves.
</HARD-GATE>

---

### Stage 2: DESIGN (Agent: architect)

Invoke the **architect** agent to explore options and design the solution.

**Input**: `briefs/current.json` (requirements) + existing codebase
**Output**: Update `briefs/current.json` fields `design` + `decisions`

The architect agent will:

- Scan the codebase to understand current architecture
- Propose 2-3 approaches with trade-offs
- Analyze each approach against the success criteria
- Recommend one approach with clear rationale

Auto-proceed to Stage 3.

---

### Stage 3: DOCUMENT (Agent: architect)

Invoke the **architect** agent to produce formal documentation.

**Output**: `ADR.md` in `docs/adr/` (the only artifact that goes into the project repo)

```markdown
# ADR-{number}: {title}

## Status

Proposed

## Context

{Why this decision needs to be made}

## Decision

{What we decided}

## Consequences

### Positive

- {benefit}

### Negative

- {trade-off}

### Risks

- {risk}: {mitigation}

## Alternatives Considered

| Option | Pros | Cons | Rejected Because |
| ------ | ---- | ---- | ---------------- |
| {A}    | ...  | ...  | ...              |

## Implementation Roadmap

1. {Phase 1}: {description} — {rough scope}
2. {Phase 2}: ...

## Dependencies

- {External dependency}: {status}
```

---

## Pipeline Complete

"**✓ /plan pipeline complete**

Topic: {planning topic}
ADR: `docs/adr/ADR-{NNN}.md` (git-tracked)

Brief archived. Run `/develop` when you're ready to implement."
