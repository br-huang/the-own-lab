# Develop Pipeline — Full Orchestration Flow

## Task Creation (at pipeline start)

```
TaskCreate: "Stage 1: Requirements (product-owner)"
TaskCreate: "Stage 2: Design (architect)"
TaskCreate: "Stage 2.5: UI Wireframe (ui-designer)"   ← only if UI detected
TaskCreate: "Stage 3: Plan (architect)"
TaskCreate: "Stage 4: Implement (developer)"
TaskCreate: "Stage 5: Test (qa)"
TaskCreate: "Stage 6: Review (reviewer)"
TaskCreate: "Stage 7: Merge (devops)"
```

---

## Stage 1: REQUIREMENTS

- **Agent**: product-owner
- **Action**: Elicit requirements, ask clarifying questions ONE AT A TIME
- **Output**: `REQUIREMENTS.md`
- **Gate**: HARD GATE — user must confirm scope

---

## Stage 2: DESIGN

- **Agent**: architect
- **Action**: Scan codebase, propose architecture, produce Mermaid diagrams
- **Output**: `DESIGN.md` (with architecture diagram, data flow, component relationships)
- **Gate**: HARD GATE — user must approve technical approach

---

## Stage 2.5: UI WIREFRAME (conditional)

Only if UI work was detected during initialization.

- **Agent**: ui-designer
- **Action**: Create wireframes using Pencil MCP, define UI specifications
- **Output**: `UI-WIREFRAME.md`
- **Gate**: HARD GATE — user must approve UI before planning

---

## Stage 3: PLAN

- **Agent**: architect
- **Action**: Write file-level implementation plan (incorporates UI specs if Stage 2.5 ran)
- **Output**: `PLAN.md`
- **Gate**: Auto-proceed

---

## Stage 4: IMPLEMENT

- **Agent**: devops → developer
- **Action**:
  1. devops creates feature branch: `feature/{slug}`
  2. developer executes plan step by step (TDD: RED → GREEN → REFACTOR)
  3. Incremental commits on feature branch
- **Output**: Production code with tests
- **Gate**: Auto-proceed

---

## Stage 5: TEST

- **Agent**: qa
- **Action**: Run full test suite, verify each acceptance criterion, test edge cases
- **Output**: `TEST.md`
- **Gate**: SOFT GATE
  - All tests pass + all criteria met → auto-proceed
  - Any failure → escalate to HARD GATE (user decides: fix / skip / abort)

---

## Stage 6: REVIEW

- **Agent**: reviewer (+ developer for fix loop)
- **Action**: Code review + security scan against PLAN.md and TEST.md
- **Output**: `REVIEW.md`

### Review-Fix Loop

```
Round 1:
  reviewer → produces REVIEW.md
  ├── Critical issues found → HARD GATE (user decides)
  ├── Warnings only → developer auto-fixes warnings
  │                  → reviewer re-verifies (Round 2)
  └── Clean → auto-proceed to merge

Round 2 (max):
  reviewer → re-reviews fixes
  ├── Still has issues → HARD GATE (user decides)
  └── Clean → auto-proceed to merge
```

- Maximum 2 review rounds to prevent infinite loops
- Critical issues ALWAYS go to user (never auto-fixed)
- Developer only fixes warnings and info-level issues

**Gate**: HARD GATE after loop completes — user approves final state for merge

---

## Stage 7: MERGE

- **Agent**: devops
- **Action**:
  1. Final test verification
  2. Update `CHANGELOG.md` — append entry under `[Unreleased]` section:
     ```markdown
     ### Added
     - {feature description} (ISS-{N})
     ```
  3. Squash merge to target branch
  4. Delete feature branch
  5. Clean up worktree if used
  6. Pipeline retrospective → `docs/specs/.retro/`
- **Gate**: Auto-proceed (user already approved in Stage 6)
