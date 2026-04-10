---
name: execute-plan
description: 'Execute an implementation plan step by step with verification at each step. Use when implementing code from an approved plan.'
---

# Execute Plan

Execute an approved implementation plan with discipline and verification.

## Process

1. **Read the full plan before starting** — Understand the complete picture before touching any code. Note dependencies between steps and the overall goal.

2. **For each step:**
   - Read the step requirements carefully.
   - Write the test first (TDD — see the `tdd` skill).
   - Implement the code to pass the test.
   - Verify using the step's verification criteria.
   - Commit the working step.

3. **If a step is unclear — STOP and flag.** Never guess at intent. Ask for clarification. Guessing leads to rework.

4. **If a step fails verification — STOP and report.** Do not proceed to the next step with a broken foundation. Report what failed and why.

## Rules

- **Follow the plan exactly.** The plan was approved for a reason. If you disagree with the plan, raise it — do not silently deviate.
- **Do not deviate from scope.** If you notice something outside the plan that needs fixing, note it separately. Do not fix it now.
- **Do not "improve" beyond the plan.** No bonus features. No premature optimization. No "while I'm here" changes.
- **One commit per step.** Each step produces one atomic commit. This makes rollback and review straightforward.
