#!/usr/bin/env bash
# Session Start Hook — Claude 一人公司
# Minimal context injection. Static rules stay in skill files.
# All project data reads from per-project dir under plugin data.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=hooks/scripts/lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"
# shellcheck source=hooks/scripts/lib/pattern-index.sh
. "$SCRIPT_DIR/lib/pattern-index.sh"

PROJECT_DIR="$(company_of_one_project_dir)"
RUNTIME_LABEL="$(company_of_one_runtime_label)"

company_of_one_init_storage

# ── Minimal Routing Context (< 200 tokens) ──────────────────
cat <<CONTEXT
<company-of-one runtime="${RUNTIME_LABEL}">
Default to SMALL. Only upgrade when clearly needed.
- Small: just code it. No docs, no branch, no TaskCreate.
- Medium: inline plan + branch + TaskCreate 4 tasks. Brief only (briefs/current.json), no full docs.
- Large: read orchestrator skill + pipeline reference. Agents work in parallel waves.
State scripts: hooks/scripts/lib/pipeline-state.sh (init, wave-start, wave-complete, gate, complete)
Brief scripts: hooks/scripts/lib/brief-manager.sh (init, update, read, archive)
Agents read briefs/current.json as single source of truth — never read full specs directly.
</company-of-one>
CONTEXT

# ── Pipeline State (only if active/resuming) ─────────────────
if [ -f "$PROJECT_DIR/pipeline.json" ]; then
  local_status=$(python3 -c "import json; print(json.load(open('$PROJECT_DIR/pipeline.json')).get('status',''))" 2>/dev/null || echo "")
  if [ "$local_status" = "active" ]; then
    echo ""
    echo "<pipeline-resume>"
    cat "$PROJECT_DIR/pipeline.json"
    echo "</pipeline-resume>"
  fi
fi

# ── Active Brief (if pipeline in progress) ────────────────────
if [ -f "$PROJECT_DIR/briefs/current.json" ]; then
  echo ""
  echo "<active-brief>"
  cat "$PROJECT_DIR/briefs/current.json"
  echo "</active-brief>"
fi

# ── Memory: Pattern Index (reads index file, not pattern directory) ──
pattern_index_read_high_confidence

# ── Memory: Project Context (max 30 lines) ───────────────────
if [ -f "$PROJECT_DIR/context.md" ]; then
  echo ""
  echo "<project-context>"
  head -30 "$PROJECT_DIR/context.md"
  echo "</project-context>"
fi
