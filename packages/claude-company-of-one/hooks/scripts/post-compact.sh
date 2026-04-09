#!/usr/bin/env bash
# Post-Compact Hook — Claude 一人公司
# Restores pipeline state, active brief, and critical context after compaction.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=hooks/scripts/lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"
# shellcheck source=hooks/scripts/lib/pattern-index.sh
. "$SCRIPT_DIR/lib/pattern-index.sh"

PROJECT_DIR="$(company_of_one_project_dir)"

# Restore pipeline state if active
if [ -f "$PROJECT_DIR/pipeline.json" ]; then
  local_status=$(python3 -c "import json; print(json.load(open('$PROJECT_DIR/pipeline.json')).get('status',''))" 2>/dev/null || echo "")
  if [ "$local_status" = "active" ]; then
    echo "## Pipeline State Restored"
    cat "$PROJECT_DIR/pipeline.json"
    echo ""
  fi
fi

# Restore active brief
if [ -f "$PROJECT_DIR/briefs/current.json" ]; then
  echo "## Active Brief Restored"
  cat "$PROJECT_DIR/briefs/current.json"
  echo ""
  echo "Resume from the current stage. Do not repeat completed stages."
fi

# Reload high-confidence patterns
pattern_index_read_high_confidence

# Reload project context
if [ -f "$PROJECT_DIR/context.md" ]; then
  echo ""
  head -30 "$PROJECT_DIR/context.md"
fi
