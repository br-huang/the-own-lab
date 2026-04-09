#!/usr/bin/env bash
# brief-manager.sh — Read/write/archive pipeline briefs.
# Briefs are the single source of truth for agent-to-agent handoff.
# Agents read briefs/current.json, never full specs directly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=hooks/scripts/lib/common.sh
. "$SCRIPT_DIR/common.sh"

brief_current_path() {
  echo "$(company_of_one_briefs_dir)/current.json"
}

brief_init() {
  # Usage: brief_init <pipeline> <feature> <size>
  local pipeline="$1" feature="$2" size="$3"
  local brief_file
  brief_file="$(brief_current_path)"
  mkdir -p "$(dirname "$brief_file")"

  cat > "$brief_file" <<EOF
{
  "pipeline": "${pipeline}",
  "feature": "${feature}",
  "size": "${size}",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "requirements": null,
  "design": null,
  "plan": null,
  "test_results": null,
  "review_verdict": null,
  "decisions": []
}
EOF
  echo "Brief initialized: $brief_file"
}

brief_update() {
  # Usage: brief_update <field> <value>
  # field: requirements | design | plan | test_results | review_verdict
  # value: a short string (1-3 sentences, < 100 tokens)
  local field="$1" value="$2"
  local brief_file
  brief_file="$(brief_current_path)"

  if [ ! -f "$brief_file" ]; then
    echo "ERROR: No active brief" >&2
    return 1
  fi

  local tmp="$brief_file.tmp"
  python3 -c "
import json
with open('$brief_file') as f:
    brief = json.load(f)
brief['$field'] = '''$value'''
brief['updated'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
with open('$tmp', 'w') as f:
    json.dump(brief, f, indent=2)
" 2>/dev/null && mv "$tmp" "$brief_file"

  echo "Brief updated: $field"
}

brief_add_decision() {
  # Usage: brief_add_decision <decision_text>
  local decision="$1"
  local brief_file
  brief_file="$(brief_current_path)"

  if [ ! -f "$brief_file" ]; then
    echo "ERROR: No active brief" >&2
    return 1
  fi

  local tmp="$brief_file.tmp"
  python3 -c "
import json
with open('$brief_file') as f:
    brief = json.load(f)
brief['decisions'].append('$decision')
with open('$tmp', 'w') as f:
    json.dump(brief, f, indent=2)
" 2>/dev/null && mv "$tmp" "$brief_file"

  echo "Decision added to brief"
}

brief_read() {
  # Usage: brief_read — outputs current brief JSON
  local brief_file
  brief_file="$(brief_current_path)"
  if [ -f "$brief_file" ]; then
    cat "$brief_file"
  else
    echo "{}"
  fi
}

brief_archive() {
  # Usage: brief_archive — move current brief to history/
  local brief_file history_dir
  brief_file="$(brief_current_path)"
  history_dir="$(company_of_one_briefs_dir)/history"

  if [ ! -f "$brief_file" ]; then
    return 0
  fi

  mkdir -p "$history_dir"

  local pipeline feature date_str archive_name
  pipeline=$(python3 -c "import json; print(json.load(open('$brief_file')).get('pipeline','unknown'))" 2>/dev/null || echo "unknown")
  feature=$(python3 -c "import json; print(json.load(open('$brief_file')).get('feature','unknown'))" 2>/dev/null || echo "unknown")
  date_str="$(date +%Y-%m-%d)"
  archive_name="${date_str}-${pipeline}-${feature}.json"

  mv "$brief_file" "$history_dir/$archive_name"
  echo "Brief archived: $archive_name"
}

brief_cleanup_history() {
  # Usage: brief_cleanup_history [days]
  # Remove archived briefs older than N days (default: 90)
  local days="${1:-90}"
  local history_dir
  history_dir="$(company_of_one_briefs_dir)/history"

  if [ -d "$history_dir" ]; then
    find "$history_dir" -name "*.json" -mtime "+$days" -delete 2>/dev/null
    echo "Cleaned briefs older than $days days"
  fi
}

# Direct invocation
if [ "${1:-}" != "" ]; then
  cmd="$1"; shift
  case "$cmd" in
    init)            brief_init "$@" ;;
    update)          brief_update "$@" ;;
    add-decision)    brief_add_decision "$@" ;;
    read)            brief_read ;;
    archive)         brief_archive ;;
    cleanup)         brief_cleanup_history "$@" ;;
    *)               echo "Unknown command: $cmd" >&2; exit 1 ;;
  esac
fi
