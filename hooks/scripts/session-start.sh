#!/usr/bin/env bash
# Session Start Hook — Claude 一人公司
# Minimal context injection. Static rules stay in skill files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=hooks/scripts/lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

PLUGIN_DATA="$(company_of_one_plugin_data)"
MEMORY_DIR="$(company_of_one_memory_dir)"
RUNTIME_LABEL="$(company_of_one_runtime_label)"

company_of_one_init_storage

# ── Minimal Routing Context (< 200 tokens) ──────────────────
cat <<CONTEXT
<company-of-one runtime="${RUNTIME_LABEL}">
Default to SMALL. Only upgrade when clearly needed.
- Small: just code it. No docs, no branch, no TaskCreate.
- Medium: inline plan + branch + TaskCreate 4 tasks.
- Large: read orchestrator skill + pipeline reference. Agents work in parallel waves.
Orchestrator skill has details — read it only for Medium/Large.
</company-of-one>
CONTEXT

# ── Pipeline State (only if resuming) ────────────────────────
if [ -f "$PLUGIN_DATA/pipeline-state.json" ]; then
  echo ""
  echo "<pipeline-resume>"
  cat "$PLUGIN_DATA/pipeline-state.json"
  echo "</pipeline-resume>"
fi

# ── Memory Index (1-line summaries only) ─────────────────────
PATTERN_COUNT=0
for pattern_file in "$MEMORY_DIR/patterns"/*.md; do
  [ -f "$pattern_file" ] || continue
  confidence=$(grep -m1 "^confidence:" "$pattern_file" 2>/dev/null | awk '{print $2}' || echo "0")
  confidence_int=$(echo "$confidence" | awk '{printf "%d", $1 * 10}')
  if [ "$confidence_int" -ge 7 ]; then
    if [ "$PATTERN_COUNT" -eq 0 ]; then
      echo ""
      echo "<memory-index>"
    fi
    # Extract just the pattern title (first heading after frontmatter)
    pattern_id=$(grep -m1 "^id:" "$pattern_file" 2>/dev/null | awk '{print $2}' || echo "?")
    pattern_title=$(sed -n '/^---$/,/^---$/d;/^# /p' "$pattern_file" | head -1 | sed 's/^# //')
    echo "- ${pattern_id} (${confidence}): ${pattern_title}"
    PATTERN_COUNT=$((PATTERN_COUNT + 1))
  fi
done
if [ "$PATTERN_COUNT" -gt 0 ]; then
  echo "</memory-index>"
fi
