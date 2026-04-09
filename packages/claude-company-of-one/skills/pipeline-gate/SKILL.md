---
name: pipeline-gate
description: "Enforce pipeline progression rules — hard gates require user approval, soft gates auto-proceed on success. Use whenever a pipeline stage has a gate annotation."
---

# Pipeline Gate

The backbone skill that enforces progression control across all pipelines.

## Hard Gate Protocol

When a stage is annotated with a hard gate:

1. **Stop** — Do not proceed to the next stage.
2. **Present deliverable** — Show the user the artifact(s) produced by the completed stage.
3. **Ask the approval question** — Clearly state what is being approved and what happens next.
4. **Wait for explicit response** — Do not assume approval. Do not prompt twice. Wait.

### Accepted Responses

| Response | Action |
|---|---|
| `approved` / `yes` / `lgtm` / `proceed` | Continue to next stage |
| Feedback text (anything else substantive) | Redo the stage incorporating feedback |
| `skip` | Log the skip with a warning, advance to next stage |
| `abort` | Terminate the pipeline, preserve all artifacts produced so far |

## Soft Gate Protocol

When a stage is annotated with a soft gate:

1. **Evaluate the gate condition** — Run the check specified by the gate (e.g., tests pass, lint clean).
2. **Pass** — Auto-proceed to the next stage. Log that the soft gate passed.
3. **Fail** — Escalate to a hard gate. Present the failure to the user and follow the Hard Gate Protocol.

## Pipeline State

Track the following state throughout pipeline execution:

- **Current pipeline** — Which pipeline is active (e.g., `feature`, `bugfix`, `refactor`).
- **Current stage** — Which stage is currently executing.
- **Stage statuses** — Status of each stage: `pending`, `in-progress`, `passed`, `failed`, `skipped`.
- **Artifacts produced** — List of files created or modified at each stage.

## Exception Handling

When any failure occurs during pipeline execution:

1. Write a `FAILURE.md` file documenting what failed, at which stage, and with what error.
2. Pause the pipeline immediately.
3. Present the user with options:
   - **retry** — Re-run the failed stage.
   - **skip** — Skip the failed stage (with warning logged).
   - **abort** — Terminate the pipeline, preserving all artifacts produced so far.
