#!/usr/bin/env bash
# Session Start Hook — Claude 一人公司
# Injects orchestrator context with task sizing, project memory, and patterns.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Shared runtime helpers let the same repo run under Claude and Codex.
# shellcheck source=hooks/scripts/lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

PLUGIN_ROOT="$(company_of_one_plugin_root)"
PLUGIN_DATA="$(company_of_one_plugin_data)"
MEMORY_DIR="$(company_of_one_memory_dir)"
RUNTIME_LABEL="$(company_of_one_runtime_label)"

company_of_one_init_storage

# ── Orchestrator Activation ──────────────────────────────────
cat <<ORCHESTRATOR
<company-of-one>
You are Company of One running inside ${RUNTIME_LABEL}.

WORKFLOW — follow this for EVERY user message that implies work:

1. DETECT intent: bug / feature / refactor / plan / review / non-pipeline
2. SIZE the task: Small / Medium / Large
3. EXECUTE the right flow:

SMALL (single file, clear, <2min):
  → Just do it. TDD. Commit. No docs, no branch, no TaskCreate.

MEDIUM (2-5 files, some design, 5-15min):
  → TaskCreate 4 tasks: "Brief Plan", "Implement", "Test & Review", "Merge"
  → Brief Plan: 3-5 bullets INLINE (no file). This is the only gate — user confirms.
  → Implement: create branch, TDD, incremental commits.
  → Test & Review: run tests + quick review inline. 1 fix round max.
  → Merge: squash merge + CHANGELOG update.

LARGE (cross-module, architectural, >15min):
  → TaskCreate all stages per pipeline reference.
  → Create docs/specs/ directory. Write full docs.
  → Read the pipeline reference file for detailed flow.
  → Full hard gates at Requirements, Design, Review.

CRITICAL RULES:
- Use TaskCreate IMMEDIATELY when starting Medium or Large pipelines.
- For Medium: create tasks in the SAME response as announcing the pipeline.
- For Small: NO TaskCreate, NO docs, NO announcements. Just code.
- NEVER write standalone docs (REQUIREMENTS.md, DESIGN.md) for Small/Medium tasks.
- NEVER read reference files for Small/Medium tasks.
- After each gate approval, IMMEDIATELY proceed to the next stage without waiting.

Agents: product-owner, architect, developer, qa, reviewer, debugger, devops, ui-designer
Commands (shortcuts): /develop, /debug, /refactor, /review, /plan, /learn
</company-of-one>
ORCHESTRATOR

# ── Project Context ──────────────────────────────────────────
if [ -f "$MEMORY_DIR/project-context.md" ]; then
  echo ""
  echo "## Project Context"
  cat "$MEMORY_DIR/project-context.md"
fi

# ── High-Confidence Patterns ─────────────────────────────────
PATTERN_COUNT=0
for pattern_file in "$MEMORY_DIR/patterns"/*.md; do
  [ -f "$pattern_file" ] || continue
  confidence=$(grep -m1 "^confidence:" "$pattern_file" 2>/dev/null | awk '{print $2}' || echo "0")
  confidence_int=$(echo "$confidence" | awk '{printf "%d", $1 * 10}')
  if [ "$confidence_int" -ge 7 ]; then
    if [ "$PATTERN_COUNT" -eq 0 ]; then
      echo ""
      echo "## Active Patterns"
    fi
    sed -n '/^---$/,/^---$/!p' "$pattern_file" | tail -n +1
    echo ""
    PATTERN_COUNT=$((PATTERN_COUNT + 1))
  fi
done

# ── Pipeline State Recovery ──────────────────────────────────
if [ -f "$PLUGIN_DATA/pipeline-state.json" ]; then
  echo ""
  echo "## Active Pipeline (resuming)"
  cat "$PLUGIN_DATA/pipeline-state.json"
fi
