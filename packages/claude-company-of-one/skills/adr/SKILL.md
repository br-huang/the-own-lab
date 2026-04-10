---
name: adr
description: 'Write Architecture Decision Records for significant technical decisions. Use when a decision will affect future development.'
---

# Architecture Decision Records

Document significant technical decisions so future developers (and future pipeline runs) understand the reasoning.

## When to Write an ADR

- Choosing a technology, framework, or library
- Changing an architectural pattern (e.g., monolith to services, REST to GraphQL)
- Adding a significant dependency
- Changing the security model or authentication approach
- Any decision that constrains or enables future development directions

## ADR Format

### Header

```
# ADR-{NNN}: Title of Decision

Status: Proposed | Accepted | Deprecated | Superseded by ADR-{NNN}
Date: YYYY-MM-DD
```

### Context

What is the situation that motivates this decision? Describe the forces at play:

- Technical constraints
- Business requirements
- Team capabilities
- Timeline pressure

### Decision

State the decision clearly and concisely. Use active voice:
"We will use X for Y because Z."

### Consequences

#### Positive

- Benefits gained from this decision

#### Negative

- Trade-offs accepted

#### Risks

- What could go wrong and under what conditions

### Alternatives Considered

| Alternative | Pros | Cons | Reason Not Chosen |
| ----------- | ---- | ---- | ----------------- |
| Option A    | ...  | ...  | ...               |
| Option B    | ...  | ...  | ...               |

## Template

Read the template before producing the ADR (includes Mermaid diagrams):

```
Read ${CLAUDE_PLUGIN_ROOT}/templates/ADR.md
```

## Numbering

ADRs are numbered sequentially: `ADR-001`, `ADR-002`, etc. Numbers are never reused. If a decision is superseded, the original ADR is updated with a status change pointing to the new ADR.

## Storage

ADRs are the ONLY pipeline artifact that goes into the project repo. Store them in `docs/adr/` — this is git-tracked because architectural decisions have lasting impact on future development.

## Lifecycle

1. **Proposed** — Draft written, open for discussion
2. **Accepted** — Decision agreed upon and in effect
3. **Deprecated** — Decision no longer relevant (context changed)
4. **Superseded** — Replaced by a newer ADR (link to successor)
