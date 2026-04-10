---
name: postmortem
description: 'Write blameless postmortems for significant bugs. Use after a bug fix to capture lessons learned.'
---

# Postmortem

Write blameless postmortems to capture lessons learned from significant bugs.

## When to Write a Postmortem

- The bug could recur if the underlying pattern is not addressed
- The bug affects critical paths (auth, data integrity, payments, etc.)
- Diagnosis took more than 30 minutes
- The investigation revealed a systemic issue beyond the immediate bug

## Postmortem Structure

### Timeline

Chronological account of the incident:

- When the bug was introduced (commit, PR, deploy)
- When the bug was detected and by whom/what
- Key investigation steps and findings
- When the fix was applied and verified

### Root Cause

Clear explanation of why the bug occurred. Link to the root cause analysis (DIAGNOSIS.md) if one was produced.

### Fix Applied

What was changed and why:

- The specific code changes made
- Why this fix addresses the root cause (not just the symptom)
- Any temporary mitigations applied while the permanent fix was developed

### Lessons Learned

What this incident teaches about the codebase, process, or tooling:

- What went well during diagnosis and response
- What made diagnosis harder than it needed to be
- What signals were available but missed

### Action Items

Concrete preventive measures to reduce the likelihood of recurrence:

- Each item must be specific and actionable
- Bad: "Be more careful when writing queries"
- Good: "Add parameterized query lint rule to CI pipeline"
- Assign an owner or note if the item is for the next pipeline run
- Prioritize by impact: what prevents the most similar bugs

## Template

Read the template before producing the postmortem:

```
Read ${CLAUDE_PLUGIN_ROOT}/templates/POSTMORTEM.md
```

## Tone

- **Blameless** — focus on systems and processes, not individuals
- Assume everyone acted with the best information they had at the time
- Ask "what allowed this to happen" not "who caused this"
- The goal is learning, not accountability

## Integration

Link postmortem findings to the `learn` skill for pattern extraction. Patterns identified in postmortems should feed into the project's learning system to improve future pipeline runs.
