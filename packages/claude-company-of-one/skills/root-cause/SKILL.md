---
name: root-cause
description: 'Systematic root cause analysis for bug diagnosis. Use when investigating the underlying cause of a bug.'
---

# Root Cause Analysis

A systematic methodology for diagnosing the underlying cause of bugs.

## Methodology

### 1. Gather Evidence

Collect all available information before forming any hypothesis:

- Error messages and their exact text
- Log output around the time of failure
- Stack traces with full call chains
- Steps to reproduce the bug reliably
- Environment details (OS, runtime version, configuration)

### 2. Form Hypothesis

Based on the evidence, identify candidate causes:

- What changed recently that could explain this?
- What assumptions does the failing code make?
- Where does the actual behavior diverge from the expected behavior?

### 3. Test Hypothesis

Validate or eliminate each hypothesis through direct investigation:

- Trace the code path from input to failure point
- Add targeted logging at decision points
- Write a failing test that captures the exact bug
- Use a debugger to inspect state at the moment of failure

### 4. Narrow Down

When the problem space is large, use binary search:

- Bisect commits to find the introducing change
- Comment out code sections to isolate the trigger
- Simplify the reproduction case to its minimal form
- Divide and conquer across layers (network, data, logic, presentation)

### 5. Verify

Confirm the root cause with definitive evidence:

- The failing test passes after the fix and only after the fix
- The explanation accounts for all observed symptoms
- No unexplained behaviors remain

## Principles

- **Never guess** — every conclusion must be supported by evidence
- **One variable at a time** — change only one thing when testing a hypothesis
- **Trust the evidence** — if the evidence contradicts your mental model, update the model
- **Don't fix symptoms** — a fix that masks the root cause will break again

## Blast Radius Analysis

Once the root cause is identified, assess the full impact:

- Identify all code paths that use the same pattern
- Check if the bug exists in related modules or services
- Determine if the same class of error could occur elsewhere
- Quantify the scope: how many users, features, or data paths are affected

## Template

Read the template before producing the diagnosis:

```
Read ${CLAUDE_PLUGIN_ROOT}/templates/DIAGNOSIS.md
```

## Output

Produce a structured `DIAGNOSIS.md` following the template above, containing:

1. **Root Cause** — Clear, concise statement of why the bug occurs
2. **Evidence** — Specific logs, traces, or code that prove the root cause
3. **Affected Code** — All files and functions impacted, with `file:line` references
4. **Recommended Fix** — The proposed change and why it addresses the root cause
5. **Regression Risk** — What could break as a result of the fix, and how to guard against it
