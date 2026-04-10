---
name: refactor
description: 'Refactoring pipeline: analyze → plan → execute → verify → review. Use when restructuring code without changing external behavior.'
---

# /refactor — Refactoring Pipeline

You are orchestrating the refactoring pipeline for Claude 一人公司 (Company of One).
Refactoring changes structure, never behavior. Every step must preserve existing functionality.

## Before Starting

1. Initialize pipeline state: `bash hooks/scripts/lib/pipeline-state.sh init refactor {slug} large 5`
2. Initialize brief: `bash hooks/scripts/lib/brief-manager.sh init refactor {slug} large`
3. Agents read and write `briefs/current.json` as single source of truth
4. Full specs go to `${COMPANY_OF_ONE_PLUGIN_DATA}/projects/{key}/specs/` — never to the project repo

## Pipeline Stages

---

### Stage 1: ANALYZE (Agent: architect)

Invoke the **architect** agent to analyze the code targeted for refactoring.

**Input**: User's refactoring request + codebase
**Output**: `ANALYSIS.md` in the specs directory

The architect agent will:

- Analyze code complexity and coupling
- Identify code smells and technical debt
- Assess risk (what could break)
- Define the refactoring scope explicitly
- Document what must NOT change (behavior contracts)

```markdown
# Analysis: {refactor target}

## Current State

{Description of current code structure and its problems}

## Code Smells Identified

- {Smell 1}: {location and severity}

## Complexity Metrics

- {Metric}: {value and assessment}

## Scope

### Will Change

- `{file}` — {what structural change}

### Must NOT Change (Behavior Contracts)

- {Behavior 1} — must remain identical
- {API surface} — must remain compatible

## Risk Assessment

- {Risk}: {likelihood and impact}
```

<HARD-GATE>
Present the ANALYSIS.md to the user.

"**Stage 1 Complete: Analysis**

Refactoring scope:

- {N} files affected
- Risk level: {low/medium/high}
- Behavior contracts: {N} behaviors that must be preserved

Reply **'approved'** to proceed with planning, or adjust the scope."

DO NOT proceed to Stage 2 until the user confirms the scope.
Scope creep in refactoring is the most common failure mode.
</HARD-GATE>

---

### Stage 2: PLAN (Agent: architect)

Invoke the **architect** agent to write the refactoring plan.

**Input**: Approved ANALYSIS.md
**Output**: `PLAN.md` in the specs directory

The architect agent will:

- Break refactoring into atomic steps
- Each step must preserve all tests (green-to-green)
- Include rollback strategy for each step
- Specify verification at each step

Auto-proceed to Stage 3.

---

### Stage 3: EXECUTE (Agent: devops → developer)

**Step 3a**: Invoke the **devops** agent to create a refactor branch.

- Create branch: `refactor/{slug}`

**Step 3b**: Invoke the **developer** agent to execute the refactoring.

**Input**: PLAN.md
**Output**: Refactored code

The developer agent will:

- Execute steps in order
- Run ALL tests after EVERY step (green-to-green requirement)
- If any test fails after a step, STOP immediately and report
- Commit after each successful step
- Never change behavior — only structure

Auto-proceed to Stage 4.

---

### Stage 4: VERIFY (Agent: qa)

Invoke the **qa** agent to verify behavior preservation.

**Input**: Behavior contracts from ANALYSIS.md + refactored code
**Output**: `VERIFY.md` in the specs directory

The qa agent will:

- Run the full test suite
- Verify every behavior contract from ANALYSIS.md
- Compare test results before and after (same pass/fail pattern)
- Check for performance regressions (if applicable)

<SOFT-GATE>
**If all tests pass and all behavior contracts hold**: auto-proceed to Stage 5.

**If any behavior change detected**: STOP.

"**Stage 4: Behavior Change Detected**

{Details of what changed}

This is a refactoring pipeline — behavior must NOT change.

Options:

- **'fix'** — return to Stage 3 to correct
- **'abort'** — revert all changes"

This becomes a HARD GATE.
</SOFT-GATE>

---

### Stage 5: REVIEW (Agent: reviewer)

Invoke the **reviewer** agent to review the refactored code.

**Input**: All changed files (git diff), ANALYSIS.md, VERIFY.md
**Output**: `REVIEW.md` in the specs directory

The reviewer agent will:

- Verify the refactoring achieves the stated goals
- Check that no behavior was changed
- Assess if the code is actually simpler/better
- Look for missed opportunities

<HARD-GATE>
Present the REVIEW.md to the user.

"**Stage 5 Complete: Review**

Review verdict: **{verdict}**

- Refactoring goals achieved: {yes/partially/no}
- Behavior preserved: {confirmed}

Reply **'merge'** to proceed, **'fix'** to address issues, or **'abort'** to discard."

DO NOT proceed to merge until the user explicitly approves.
</HARD-GATE>

---

### Merge (Agent: devops)

Invoke the **devops** agent to merge and clean up.

- Squash merge to target branch
- Clean up refactor branch
- Run pipeline retrospective

---

## Pipeline Complete

"**✓ /refactor pipeline complete**

Target: {refactoring description}
Branch: merged to {target branch}
Specs: `{specsDir}/{date}-refactor-{slug}/`

Artifacts produced:

- ANALYSIS.md
- PLAN.md
- VERIFY.md
- REVIEW.md
- .retro/{date}-refactor-{slug}.md"
