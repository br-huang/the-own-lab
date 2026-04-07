# Debug Pipeline — Full Orchestration Flow

## Task Creation (at pipeline start)

```
TaskCreate: "Stage 1/5: Reproduce (debugger)"
TaskCreate: "Stage 2/5: Diagnose (debugger)"
TaskCreate: "Stage 3/5: Fix (developer)"
TaskCreate: "Stage 4/5: Verify (qa)"
TaskCreate: "Stage 5/5: Document (devops)"
```

---

## Stage 1: REPRODUCE

- **Agent**: debugger
- **Action**: Gather info, create minimal reproduction, define "fixed" criteria
- **Output**: `REPRODUCE.md`
- **Gate**: Auto-proceed

---

## Stage 2: DIAGNOSE

- **Agent**: debugger
- **Action**: Root cause analysis — hypothesis, trace, verify, identify blast radius
- **Output**: `DIAGNOSIS.md`
- **Gate**: HARD GATE — user must confirm diagnosis before code changes

---

## Stage 3: FIX

- **Agent**: devops → developer
- **Action**:
  1. devops creates fix branch: `fix/{slug}`
  2. developer writes failing test (reproduces bug) → implements minimal fix → refactors
  3. Commit: `fix({scope}): {description}`
- **Output**: Bug fix with regression test
- **Gate**: Auto-proceed

---

## Stage 4: VERIFY

- **Agent**: qa
- **Action**: Confirm original reproduction passes, run full test suite, check blast radius
- **Output**: `VERIFY.md`
- **Gate**: SOFT GATE
  - All verifications pass → auto-proceed
  - Failure → HARD GATE (user decides: rediagnose / fix again / abort)

---

## Stage 5: DOCUMENT

- **Agent**: debugger + devops
- **Action**:
  1. debugger assesses postmortem need:
     - Bug could recur / affects critical path / took >30min → write `POSTMORTEM.md`
     - Simple one-off → skip postmortem
  2. devops performs:
     - Update `CHANGELOG.md` under `### Fixed`
     - Squash merge to target branch
     - Delete fix branch
     - Pipeline retrospective
- **Output**: `POSTMORTEM.md` (if warranted), updated `CHANGELOG.md`
- **Gate**: Auto-proceed
