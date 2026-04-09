#!/usr/bin/env bash
# pattern-index.sh — Build and query pattern index.
# Called by pipeline-complete and session-start.
# Index is the ONLY thing session-start reads — never individual pattern files.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=hooks/scripts/lib/common.sh
. "$SCRIPT_DIR/common.sh"

PROJECT_DIR="$(company_of_one_project_dir)"
PATTERNS_DIR="$PROJECT_DIR/patterns"
INDEX_FILE="$PATTERNS_DIR/index.json"

pattern_index_rebuild() {
  # Scan patterns/ directory and rebuild index from frontmatter.
  # This is the single source of truth for session-start injection.
  mkdir -p "$PATTERNS_DIR"

  local entries="["
  local first=true

  for pattern_file in "$PATTERNS_DIR"/*.md; do
    [ -f "$pattern_file" ] || continue

    local pid confidence title last_seen
    pid=$(grep -m1 "^id:" "$pattern_file" 2>/dev/null | sed 's/^id: *//' || echo "unknown")
    confidence=$(grep -m1 "^confidence:" "$pattern_file" 2>/dev/null | awk '{print $2}' || echo "0.3")
    title=$(sed -n '/^---$/,/^---$/d;/^# /p' "$pattern_file" | head -1 | sed 's/^# //')
    last_seen=$(grep -m1 "^last_seen:" "$pattern_file" 2>/dev/null | sed 's/^last_seen: *//' || echo "unknown")

    [ "$first" = true ] && first=false || entries+=","
    entries+="{\"id\":\"$pid\",\"confidence\":$confidence,\"title\":\"$title\",\"lastSeen\":\"$last_seen\",\"file\":\"$(basename "$pattern_file")\"}"
  done

  entries+="]"
  echo "$entries" > "$INDEX_FILE"
  echo "Pattern index rebuilt: $(echo "$entries" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null || echo '?') patterns"
}

pattern_index_read_high_confidence() {
  # Output high-confidence patterns (>= 0.7) as 1-line summaries.
  # This is what session-start injects — minimal tokens.
  if [ ! -f "$INDEX_FILE" ]; then
    return 0
  fi

  python3 -c "
import json
with open('$INDEX_FILE') as f:
    patterns = json.load(f)
high = [p for p in patterns if p.get('confidence', 0) >= 0.7]
if high:
    print('<memory-index>')
    for p in sorted(high, key=lambda x: -x['confidence']):
        print(f\"- {p['id']} ({p['confidence']}): {p['title']}\")
    print('</memory-index>')
" 2>/dev/null
}

pattern_index_add() {
  # Usage: pattern_index_add <id> <title> <source_retro>
  # Creates a new pattern file with confidence 0.3 and rebuilds index.
  local pid="$1" title="$2" source="$3"
  local now
  now="$(date +%Y-%m-%d)"

  mkdir -p "$PATTERNS_DIR"
  cat > "$PATTERNS_DIR/${pid}.md" <<EOF
---
id: ${pid}
confidence: 0.3
source: ${source}
created: ${now}
last_seen: ${now}
times_observed: 1
---

# ${title}

## Pattern
{To be filled by learn skill}

## When to Apply
{To be filled by learn skill}

## Evidence
- ${now}: First observed in ${source}
EOF

  pattern_index_rebuild
  echo "Pattern added: $pid — $title (confidence: 0.3)"
}

pattern_index_bump() {
  # Usage: pattern_index_bump <id>
  # Increase confidence by 0.2 (max 0.9), update last_seen.
  local pid="$1"
  local pattern_file="$PATTERNS_DIR/${pid}.md"
  local now
  now="$(date +%Y-%m-%d)"

  if [ ! -f "$pattern_file" ]; then
    echo "ERROR: Pattern $pid not found" >&2
    return 1
  fi

  python3 -c "
import re
with open('$pattern_file') as f:
    content = f.read()
# Bump confidence
conf_match = re.search(r'confidence: ([\d.]+)', content)
if conf_match:
    old = float(conf_match.group(1))
    new = min(0.9, old + 0.2)
    content = content.replace(f'confidence: {conf_match.group(1)}', f'confidence: {new}')
# Update last_seen
content = re.sub(r'last_seen: .+', 'last_seen: $now', content)
# Bump times_observed
obs_match = re.search(r'times_observed: (\d+)', content)
if obs_match:
    content = content.replace(f'times_observed: {obs_match.group(1)}', f'times_observed: {int(obs_match.group(1))+1}')
with open('$pattern_file', 'w') as f:
    f.write(content)
" 2>/dev/null

  pattern_index_rebuild
  echo "Pattern $pid confidence bumped"
}

# Direct invocation
if [ "${1:-}" != "" ]; then
  cmd="$1"; shift
  case "$cmd" in
    rebuild)              pattern_index_rebuild ;;
    read-high-confidence) pattern_index_read_high_confidence ;;
    add)                  pattern_index_add "$@" ;;
    bump)                 pattern_index_bump "$@" ;;
    *)                    echo "Unknown command: $cmd" >&2; exit 1 ;;
  esac
fi
