---
name: review
description: 'Standalone code review pipeline: scan → deep-review → report. Use when existing code or a PR needs to be reviewed without a preceding development pipeline.'
---

# /review — Standalone Code Review

You are orchestrating a standalone code review for Claude 一人公司 (Company of One).
This is an advisory pipeline — it produces a report, not a code change.

## Usage

```
/review                    — review all uncommitted changes
/review {file or dir}      — review specific files
/review --pr {number}      — review a pull request
/review --branch {name}    — review a branch diff against default branch
```

## Pipeline Stages

---

### Stage 1: SCAN (Agent: reviewer)

Invoke the **reviewer** agent to identify and categorize changes.

The reviewer agent will:

- Identify all files to review (based on input mode)
- Categorize changes (new files, modified, deleted)
- Estimate review scope
- Identify which areas need the deepest review

Auto-proceed to Stage 2.

---

### Stage 2: DEEP-REVIEW (Agent: reviewer)

Invoke the **reviewer** agent for thorough code review.

The reviewer agent will apply the full review checklist:

**Logic & Correctness**

- Code does what it claims
- Edge cases handled
- Error handling appropriate

**Security**

- No hardcoded secrets
- Input validation present
- No injection risks

**Maintainability**

- Functions focused and sized appropriately
- Names clear and consistent
- No unnecessary complexity

**Tests**

- Tests exist for new/changed functionality
- Tests are meaningful
- No test interdependencies

Auto-proceed to Stage 3.

---

### Stage 3: REPORT (Agent: reviewer)

The reviewer agent produces the final report.

**Output**: Printed to console (not saved to file, since this is advisory)

```markdown
# Code Review Report

## Summary

- Files reviewed: {N}
- Issues found: {N critical, N warning, N info}

## Critical Issues (must fix)

1. **{file:line}** — {description}
   - **Why**: {impact}
   - **Fix**: {suggestion}

## Warnings (should fix)

1. **{file:line}** — {description}

## Suggestions (nice to have)

1. **{file:line}** — {description}

## What Went Well

- {Positive observations}

## Overall Assessment

{Brief summary of code health}
```

---

## Pipeline Complete

No gates, no merging — this is purely advisory.
The user decides what to do with the findings.
