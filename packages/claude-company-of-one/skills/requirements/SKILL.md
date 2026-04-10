---
name: requirements
description: 'Elicit and structure requirements through systematic questioning. Use when a feature needs to be scoped before design.'
---

# Requirements Elicitation

Systematic requirements gathering for the product-owner agent.

## Process

1. **Ask clarifying questions ONE AT A TIME** — Do not overwhelm with a list. Ask one question, wait for the answer, then ask the next. Each question should build on previous answers.
2. **Identify implicit requirements** — Listen for unstated assumptions. Surface them explicitly and confirm.
3. **Structure into template** — Once sufficient understanding is reached, produce the requirements document.

## Requirements Template

### Summary

A single paragraph describing what the feature does and why it exists.

### Acceptance Criteria

A numbered list of testable criteria. Each criterion must be verifiable with a concrete test — no subjective language.

- Bad: "The page should load quickly."
- Good: "The page loads in under 2 seconds on a 3G connection."

### Scope

**In scope:**

- Explicit list of what this feature includes.

**Out of scope:**

- Explicit list of what this feature does NOT include, especially things someone might assume are included.

### Constraints

Technical, business, or timeline constraints that affect implementation choices.

### Open Questions

Unresolved items that need answers before or during implementation.

## Template

Read the template before producing output:

```
Read ${CLAUDE_PLUGIN_ROOT}/templates/REQUIREMENTS.md
```

## Quality Checks

Before finalizing a requirements document, verify:

- [ ] Every acceptance criterion is testable with a concrete pass/fail condition.
- [ ] Scope is explicit — both in-scope and out-of-scope are defined.
- [ ] No technical implementation details have leaked into requirements (requirements describe WHAT, not HOW).
- [ ] Open questions are captured rather than silently assumed away.
