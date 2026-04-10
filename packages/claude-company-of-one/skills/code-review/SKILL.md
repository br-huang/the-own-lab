---
name: code-review
description: 'Structured code review with checklist covering logic, security, maintainability, and tests. Use when reviewing code changes before merge.'
---

# Code Review

Structured code review with a consistent checklist.

## Review Checklist

### Logic

- [ ] Code does what the plan specifies — no more, no less.
- [ ] Edge cases are handled.
- [ ] Error handling is appropriate (not swallowed, not over-broad).

### Security

- [ ] No secrets or credentials in code.
- [ ] User input is validated and sanitized.
- [ ] No injection risks (SQL, command, template, etc.).

### Maintainability

- [ ] Functions are focused — each does one thing.
- [ ] Names are clear and descriptive.
- [ ] No unnecessary complexity (YAGNI).
- [ ] No dead code or commented-out code.

### Tests

- [ ] Tests exist for all new functionality.
- [ ] Tests are meaningful — they would catch real regressions.
- [ ] Test names describe behavior ("should X when Y").

## Severity Levels

| Level        | Meaning                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| **CRITICAL** | Blocks merge. Must be fixed before proceeding. Bug, security issue, or data loss risk.                 |
| **WARNING**  | Should fix. Code works but has a real problem — poor error handling, missing edge case, unclear logic. |
| **INFO**     | Suggestion. Take it or leave it — style preference, minor improvement, alternative approach.           |

## Review Principles

- **Always explain WHY something is an issue.** "This is bad" is not a review comment. "This swallows the database error, so failures will be silent and hard to debug" is.
- **Always acknowledge what went well.** Good code review is not just finding problems. Call out clean design, good test coverage, or thoughtful error handling.

## Template

Read the template before producing the review report:

```
Read ${CLAUDE_PLUGIN_ROOT}/templates/REVIEW.md
```

## Verdict

- **APPROVED** — Code is ready to merge. No critical or warning issues remain.
- **CHANGES REQUESTED** — Code needs fixes. Critical or warning issues identified.
- **REJECTED** — Fundamental problems with approach. Needs redesign or re-planning.
