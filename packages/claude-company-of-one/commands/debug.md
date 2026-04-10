---
name: debug
description: 'Systematic debugging pipeline: reproduce → diagnose → fix → verify → document. Use when investigating and fixing a bug with full traceability.'
---

# /debug — Systematic Debugging Pipeline

You are orchestrating the debugging pipeline for Claude 一人公司 (Company of One).
No guessing. No shotgun debugging. Systematic root cause analysis only.

## Before Starting

1. Initialize pipeline state: `bash hooks/scripts/lib/pipeline-state.sh init debug {bug} large 5`
2. Initialize brief: `bash hooks/scripts/lib/brief-manager.sh init debug {bug} large`
3. Agents read and write `briefs/current.json` as single source of truth
4. Full specs go to `${COMPANY_OF_ONE_PLUGIN_DATA}/projects/{key}/specs/` — never to the project repo

## Pipeline Stages

---

### Stage 1: REPRODUCE (Agent: debugger)

Invoke the **debugger** agent to reproduce and document the bug.

**Input**: User's bug report or error description
**Output**: `REPRODUCE.md` in the specs directory

The debugger agent will:

- Gather all available information (error messages, logs, user report)
- Create a minimal reproduction case
- Define expected vs. actual behavior
- Define "fixed" criteria (what must be true for the bug to be resolved)

Auto-proceed to Stage 2.

---

### Stage 2: DIAGNOSE (Agent: debugger)

Invoke the **debugger** agent to perform root cause analysis.

**Input**: REPRODUCE.md + codebase
**Output**: `DIAGNOSIS.md` in the specs directory

The debugger agent will:

- Form a hypothesis about the root cause
- Trace the code path from input to error
- Use binary search to narrow down the problem area
- Verify the hypothesis with evidence
- Identify the blast radius (what else might be affected)
- Recommend a specific fix

<HARD-GATE>
Present the DIAGNOSIS.md to the user.

"**Stage 2 Complete: Diagnosis**

Root cause identified:
{brief root cause summary}

Blast radius: {affected areas}
Recommended fix: {brief fix description}

Reply **'approved'** to proceed with the fix, or provide alternative direction."

DO NOT proceed to Stage 3 until the user confirms the diagnosis.
Fixing the wrong root cause creates new bugs — this gate exists for a reason.
</HARD-GATE>

---

### Stage 3: FIX (Agent: devops → developer)

**Step 3a**: Invoke the **devops** agent to create a fix branch.

- Create branch: `fix/{bug-slug}`

**Step 3b**: Invoke the **developer** agent to implement the fix.

**Input**: DIAGNOSIS.md (recommended fix)
**Output**: Bug fix with regression test

The developer agent will:

- Write a failing test that reproduces the bug (RED)
- Implement the minimum fix to make it pass (GREEN)
- Refactor if needed (REFACTOR)
- Commit with `fix({scope}): {description}`

Auto-proceed to Stage 4.

---

### Stage 4: VERIFY (Agent: qa)

Invoke the **qa** agent to verify the fix.

**Input**: REPRODUCE.md ("fixed" criteria) + fix code
**Output**: `VERIFY.md` in the specs directory

The qa agent will:

- Confirm the original reproduction case now passes
- Run the full test suite (check for regressions)
- Verify edge cases related to the bug
- Check the blast radius identified in DIAGNOSIS.md

<SOFT-GATE>
**If all verifications pass**: auto-proceed to Stage 5.

**If any verification fails**: STOP.

"**Stage 4: Verification Failed**

{Summary of failures}

Options:

- **'rediagnose'** — return to Stage 2 (root cause may be wrong)
- **'fix'** — return to Stage 3 (fix was incomplete)
- **'abort'** — stop the pipeline"

This becomes a HARD GATE.
</SOFT-GATE>

---

### Stage 5: DOCUMENT (Agent: devops + debugger)

**Step 5a**: Invoke the **debugger** agent to write a postmortem (for significant bugs).

**Input**: All pipeline artifacts
**Output**: `POSTMORTEM.md` in the specs directory (if warranted)

The debugger agent will assess whether a postmortem is warranted:

- If the bug could recur or affects critical paths → write postmortem
- If the bug was a simple typo or one-off → skip postmortem, note in retro only

**Step 5b**: Invoke the **devops** agent to merge and run retrospective.

- Squash merge to target branch
- Clean up fix branch
- Run pipeline retrospective

---

## Pipeline Complete

"**✓ /debug pipeline complete**

Bug: {bug title}
Root cause: {brief summary}
Branch: merged to {target branch}
Specs: `{specsDir}/{date}-fix-{bug}/`

Artifacts produced:

- REPRODUCE.md
- DIAGNOSIS.md
- VERIFY.md
- POSTMORTEM.md (if warranted)
- .retro/{date}-debug-{bug}.md"

---

## Strictness Overrides

If `userConfig.strictness == "fast"`:

- Stage 2 hard gate → soft gate (auto-proceed if diagnosis confidence is high)

If `userConfig.strictness == "strict"`:

- All stages become hard gates
