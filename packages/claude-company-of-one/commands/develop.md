---
name: develop
description: 'Full feature development pipeline: requirements → design → plan → implement → test → review → merge. Use when building a new feature or making a significant addition.'
---

# /develop — Feature Development Pipeline

You are orchestrating the full development pipeline for Claude 一人公司 (Company of One).
This is the most rigorous pipeline. Execute each stage in order. Do not skip stages.

## Before Starting

1. Initialize pipeline state: `bash hooks/scripts/lib/pipeline-state.sh init develop {feature} large 7`
2. Initialize brief: `bash hooks/scripts/lib/brief-manager.sh init develop {feature} large`
3. Agents read and write `briefs/current.json` — not full spec files
4. Full specs (Large only) go to `${COMPANY_OF_ONE_PLUGIN_DATA}/projects/{key}/specs/` — never to the project repo

## Pipeline Stages

---

### Stage 1: REQUIREMENTS (Agent: product-owner)

Invoke the **product-owner** agent to elicit and structure requirements.

**Input**: User's feature request
**Output**: Update `briefs/current.json` field `requirements` (1-3 sentences). Full REQUIREMENTS.md to specs/ if Large.

The product-owner agent will:

- Ask clarifying questions one at a time
- Write acceptance criteria that are specific and testable
- Define scope boundaries (in scope / out of scope)
- Identify constraints and open questions

<HARD-GATE>
Present the REQUIREMENTS.md to the user.

"**Stage 1 Complete: Requirements**

Here are the structured requirements. Please review:

- Are the acceptance criteria correct and complete?
- Is the scope boundary accurate?
- Any missing constraints?

Reply **'approved'** to proceed to Design, or provide corrections."

DO NOT proceed to Stage 2 until the user explicitly approves.
</HARD-GATE>

---

### Stage 2: DESIGN (Agent: architect)

Invoke the **architect** agent to design the technical solution.

**Input**: Approved REQUIREMENTS.md + existing codebase
**Output**: Update `briefs/current.json` fields `design` + `decisions`. Full DESIGN.md to specs/ if Large.

The architect agent will:

- Scan the codebase to understand existing patterns
- Propose architecture with trade-offs
- Document key decisions with rationale
- Identify risks and dependencies

<HARD-GATE>
Present the DESIGN.md to the user.

"**Stage 2 Complete: Design**

Here is the proposed technical design. Please review:

- Does the architecture approach make sense?
- Are the trade-offs acceptable?
- Any concerns about the key decisions?

Reply **'approved'** to proceed to Planning, or provide feedback."

DO NOT proceed to Stage 3 until the user explicitly approves.
</HARD-GATE>

---

### Stage 3: PLAN (Agent: architect)

Invoke the **architect** agent to write a detailed implementation plan.

**Input**: `briefs/current.json` (design + decisions)
**Output**: Update `briefs/current.json` field `plan`. Full PLAN.md to specs/ if Large.

The architect agent will:

- Break the design into implementation steps (2-5 minutes each)
- Specify exact file paths, function signatures, and verification criteria
- Write the plan as if the executor has no project context

Auto-proceed to Stage 4.

---

### Stage 4: IMPLEMENT (Agent: devops → developer)

**Step 4a**: Invoke the **devops** agent to set up the development branch.

- Create a feature branch: `feature/{feature-slug}`
- Optionally create a git worktree

**Step 4b**: Invoke the **developer** agent to execute the plan.

**Input**: `briefs/current.json` (plan)
**Output**: Production code with tests

The developer agent will:

- Follow the plan step by step
- Practice TDD for every code change (RED → GREEN → REFACTOR)
- Make incremental commits
- Never deviate from the plan scope

Auto-proceed to Stage 5.

---

### Stage 5: TEST (Agent: qa)

Invoke the **qa** agent to verify the implementation.

**Input**: `briefs/current.json` (requirements) + implemented code
**Output**: Update `briefs/current.json` field `test_results`

The qa agent will:

- Run the full test suite
- Verify each acceptance criterion
- Test edge cases
- Produce a structured test report

<SOFT-GATE>
**If all tests pass and all acceptance criteria are met**: auto-proceed to Stage 6.

**If any test fails or any acceptance criterion is not met**: STOP.

"**Stage 5: Tests Failed**

{Summary of failures}

Options:

- **'fix'** — return to Stage 4 to address failures
- **'skip'** — proceed to review anyway (not recommended)
- **'abort'** — stop the pipeline"

This becomes a HARD GATE. DO NOT proceed until the user responds.
</SOFT-GATE>

---

### Stage 6: REVIEW (Agent: reviewer)

Invoke the **reviewer** agent to review all code changes.

**Input**: All changed files (git diff) + `briefs/current.json`
**Output**: Update `briefs/current.json` field `review_verdict`. Full REVIEW.md to specs/ if Large.

The reviewer agent will:

- Review code quality, logic, and maintainability
- Run security checks
- Verify style consistency
- Assess test coverage
- Produce a verdict: APPROVED, CHANGES REQUESTED, or REJECTED

<HARD-GATE>
Present the REVIEW.md to the user.

"**Stage 6 Complete: Code Review**

Review verdict: **{verdict}**

- {N} critical issues, {N} warnings, {N} info

{If APPROVED}: Reply **'merge'** to proceed to merge.
{If CHANGES REQUESTED}: Reply **'fix'** to address issues, or **'merge anyway'** to override.
{If REJECTED}: Reply **'fix'** to rework, or **'abort'** to stop."

DO NOT proceed to Stage 7 until the user explicitly approves.
</HARD-GATE>

---

### Stage 7: MERGE (Agent: devops)

Invoke the **devops** agent to merge and clean up.

The devops agent will:

1. Verify all tests still pass (final check)
2. Squash merge to the target branch
3. Delete the feature branch
4. Clean up worktree if used
5. Run a pipeline retrospective (learn skill)

**Output**: Merged code on the target branch. Run `bash hooks/scripts/pipeline-complete.sh` to finalize.

---

## Pipeline Complete

"**✓ /develop pipeline complete**

Feature: {feature name}
Branch: merged to {target branch}

Brief archived. Pipeline state finalized."

---

## Strictness Overrides

If `userConfig.strictness == "fast"`:

- Stage 1 hard gate → soft gate (auto-proceed unless scope is ambiguous)
- Stage 2 hard gate → soft gate (auto-proceed unless high-risk architecture change)
- Stage 6 hard gate remains (always review before merge)

If `userConfig.strictness == "strict"`:

- All stages become hard gates (including Stage 3: Plan and Stage 4: Implement)
- Stage 5 soft gate becomes a hard gate regardless of test results
