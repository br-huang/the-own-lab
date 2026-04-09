#!/usr/bin/env bash
# pipeline-complete.sh — Called at the END of every pipeline.
# Handles: state finalization, brief archival, context update, pattern index rebuild.
# This is the runtime integrity guarantee.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=hooks/scripts/lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"
# shellcheck source=hooks/scripts/lib/pipeline-state.sh
. "$SCRIPT_DIR/lib/pipeline-state.sh"
# shellcheck source=hooks/scripts/lib/pattern-index.sh
. "$SCRIPT_DIR/lib/pattern-index.sh"
# shellcheck source=hooks/scripts/lib/brief-manager.sh
. "$SCRIPT_DIR/lib/brief-manager.sh"

PROJECT_DIR="$(company_of_one_project_dir)"
CONTEXT_FILE="$PROJECT_DIR/context.md"

# ── 1. Finalize pipeline state ───────────────────────────────
pipeline_state_complete
echo "--- Pipeline state finalized ---"

# ── 2. Archive brief ──────────────────────────────────────────
brief_archive
brief_cleanup_history 90
echo "--- Brief archived ---"

# ── 3. Update context.md ─────────────────────────────────────
update_project_context() {
  local now tech_stack recent_decisions
  now="$(date +%Y-%m-%d)"

  # Read current pipeline state for context
  local pipeline feature
  pipeline=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('pipeline','?'))" 2>/dev/null || echo "?")
  feature=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('feature','?'))" 2>/dev/null || echo "?")

  # Detect tech stack from project files (simple heuristic)
  tech_stack=""
  [ -f "package.json" ] && tech_stack+="Node.js, "
  [ -f "tsconfig.json" ] && tech_stack+="TypeScript, "
  [ -f "pyproject.toml" ] || [ -f "setup.py" ] && tech_stack+="Python, "
  [ -f "Cargo.toml" ] && tech_stack+="Rust, "
  [ -f "go.mod" ] && tech_stack+="Go, "
  [ -f "next.config.js" ] || [ -f "next.config.mjs" ] && tech_stack+="Next.js, "
  tech_stack="${tech_stack%, }"
  [ -z "$tech_stack" ] && tech_stack="Not detected"

  # Collect recent ADR decisions (last 5)
  recent_decisions=""
  if [ -d "docs/adr" ]; then
    for adr in $(find docs/adr -name "*.md" -type f 2>/dev/null | sort -r | head -5); do
      local adr_title
      adr_title=$(grep -m1 "^# " "$adr" | sed 's/^# //')
      recent_decisions+="- ${adr_title}\n"
    done
  fi
  [ -z "$recent_decisions" ] && recent_decisions="- None yet\n"

  # Write context file (max 30 lines)
  cat > "$CONTEXT_FILE" <<EOF
# Project Context
Updated: ${now}

## Tech Stack
${tech_stack}

## Recent Pipelines
- ${pipeline}: ${feature} (completed ${now})

## Recent Decisions
$(echo -e "$recent_decisions")
## Working Directory
$(pwd)
EOF

  echo "--- Project context updated: $CONTEXT_FILE ---"
}

update_project_context

# ── 4. Rebuild pattern index ─────────────────────────────────
pattern_index_rebuild
echo "--- Pattern index rebuilt ---"

echo "Pipeline completion routine finished."
