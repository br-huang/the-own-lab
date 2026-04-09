# Refactor Pipeline — Full Orchestration Flow

## Task Creation (at pipeline start)

```
TaskCreate: "Stage 1/5: Analyze (architect)"
TaskCreate: "Stage 2/5: Plan (architect)"
TaskCreate: "Stage 3/5: Execute (developer)"
TaskCreate: "Stage 4/5: Verify (qa)"
TaskCreate: "Stage 5/5: Review (reviewer)"
```

---

## Stage 1: ANALYZE

- **Agent**: architect
- **Action**: Code complexity analysis, identify smells, define scope, document behavior contracts
- **Output**: `ANALYSIS.md`
- **Gate**: HARD GATE — user must confirm refactoring scope (scope creep is the #1 risk)

---

## Stage 2: PLAN

- **Agent**: architect
- **Action**: Break refactoring into atomic steps, each preserving all tests (green-to-green)
- **Output**: `PLAN.md`
- **Gate**: Auto-proceed

---

## Stage 3: EXECUTE

- **Agent**: devops → developer
- **Action**:
  1. devops creates branch: `refactor/{slug}`
  2. developer executes plan:
     - Each step must keep all tests green (green-to-green requirement)
     - If any test fails after a step → STOP immediately and report
     - Commit after each successful step
     - Never change behavior — only structure
- **Output**: Refactored code
- **Gate**: Auto-proceed

---

## Stage 4: VERIFY

- **Agent**: qa
- **Action**: Verify behavior preservation against contracts from ANALYSIS.md
  - Run full test suite
  - Compare test results before/after (same pass/fail pattern)
  - Check for performance regressions
- **Output**: `VERIFY.md`
- **Gate**: SOFT GATE
  - All behavior preserved → auto-proceed
  - Any behavior change detected → HARD GATE (refactoring must NOT change behavior)

---

## Stage 5: REVIEW

- **Agent**: reviewer (+ developer for fix loop)
- **Action**: Review refactored code, verify goals achieved, check no behavior changed

### Review-Fix Loop

```
Round 1:
  reviewer → produces REVIEW.md
  ├── Critical issues → HARD GATE
  ├── Warnings only → developer auto-fixes → reviewer re-verifies (Round 2)
  └── Clean → proceed to merge

Round 2 (max):
  reviewer → re-reviews
  ├── Still has issues → HARD GATE
  └── Clean → proceed to merge
```

**Gate**: HARD GATE after loop — user approves final state

### Merge (part of Stage 5)

- **Agent**: devops
- **Action**:
  1. Update `CHANGELOG.md` under `### Changed`
  2. Squash merge to target branch
  3. Delete refactor branch
  4. Pipeline retrospective
