---
name: plan
description: "Architecture planning pipeline: gather requirements → design → document. Use when planning a feature or system without writing code."
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
**Output**: `REQUIREMENTS.md` in the specs directory

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

**Input**: Approved requirements + existing codebase
**Output**: `DESIGN.md` in the specs directory

The architect agent will:
- Scan the codebase to understand current architecture
- Propose 2-3 approaches with trade-offs
- Analyze each approach against the success criteria
- Recommend one approach with clear rationale

Auto-proceed to Stage 3.

---

### Stage 3: DOCUMENT (Agent: architect)

Invoke the **architect** agent to produce formal documentation.

**Output**: `ADR.md` (Architecture Decision Record) in the specs directory

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
|--------|------|------|-----------------|
| {A} | ... | ... | ... |

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
Specs: `{specsDir}/{date}-plan-{topic}/`

Artifacts produced:
- REQUIREMENTS.md
- DESIGN.md
- ADR.md

These documents can be used as input to `/develop` when you're ready to implement."
