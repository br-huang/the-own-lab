#!/usr/bin/env bash
# pipeline-state.sh — Hard state management for pipeline execution.
# Called by orchestrator at every wave/stage transition.
# This is a MECHANISM, not a prompt convention.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=hooks/scripts/lib/common.sh
. "$SCRIPT_DIR/common.sh"

PROJECT_DIR="$(company_of_one_project_dir)"
STATE_FILE="$PROJECT_DIR/pipeline.json"

pipeline_state_init() {
  # Usage: pipeline_state_init <pipeline> <feature> <size> <wave_count>
  local pipeline="$1" feature="$2" size="$3" wave_count="$4"
  local now
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  mkdir -p "$(dirname "$STATE_FILE")"

  local waves="["
  for i in $(seq 1 "$wave_count"); do
    [ "$i" -gt 1 ] && waves+=","
    waves+="{\"id\":$i,\"status\":\"pending\",\"agents\":[]}"
  done
  waves+="]"

  cat > "$STATE_FILE" <<EOF
{
  "pipeline": "${pipeline}",
  "feature": "${feature}",
  "size": "${size}",
  "started": "${now}",
  "currentWave": 0,
  "waves": ${waves},
  "gates": [],
  "status": "active"
}
EOF
  echo "Pipeline state initialized: $STATE_FILE"
}

pipeline_state_wave_start() {
  # Usage: pipeline_state_wave_start <wave_number> <agent1> [agent2] [agent3]
  local wave_num="$1"
  shift
  local agents_json="["
  local first=true
  for agent in "$@"; do
    [ "$first" = true ] && first=false || agents_json+=","
    agents_json+="\"$agent\""
  done
  agents_json+="]"

  if [ ! -f "$STATE_FILE" ]; then
    echo "ERROR: No active pipeline state" >&2
    return 1
  fi

  # Update wave status and currentWave using a temp file (portable, no jq dependency)
  local tmp="$STATE_FILE.tmp"
  python3 -c "
import json, sys
with open('$STATE_FILE') as f:
    state = json.load(f)
wave_idx = $wave_num - 1
if wave_idx < len(state['waves']):
    state['waves'][wave_idx]['status'] = 'in_progress'
    state['waves'][wave_idx]['agents'] = json.loads('$agents_json')
state['currentWave'] = $wave_num
with open('$tmp', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null && mv "$tmp" "$STATE_FILE"

  echo "Wave $wave_num started: $*"
}

pipeline_state_wave_complete() {
  # Usage: pipeline_state_wave_complete <wave_number>
  local wave_num="$1"

  if [ ! -f "$STATE_FILE" ]; then
    echo "ERROR: No active pipeline state" >&2
    return 1
  fi

  local tmp="$STATE_FILE.tmp"
  python3 -c "
import json
with open('$STATE_FILE') as f:
    state = json.load(f)
wave_idx = $wave_num - 1
if wave_idx < len(state['waves']):
    state['waves'][wave_idx]['status'] = 'completed'
with open('$tmp', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null && mv "$tmp" "$STATE_FILE"

  echo "Wave $wave_num completed"
}

pipeline_state_gate() {
  # Usage: pipeline_state_gate <gate_name> <status>
  # status: approved | rejected | pending
  local gate_name="$1" gate_status="$2"
  local now
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  if [ ! -f "$STATE_FILE" ]; then
    echo "ERROR: No active pipeline state" >&2
    return 1
  fi

  local tmp="$STATE_FILE.tmp"
  python3 -c "
import json
with open('$STATE_FILE') as f:
    state = json.load(f)
# Update existing gate or append new one
found = False
for g in state['gates']:
    if g['name'] == '$gate_name':
        g['status'] = '$gate_status'
        g['at'] = '$now'
        found = True
        break
if not found:
    state['gates'].append({'name': '$gate_name', 'status': '$gate_status', 'at': '$now'})
with open('$tmp', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null && mv "$tmp" "$STATE_FILE"

  echo "Gate '$gate_name': $gate_status"
}

pipeline_state_complete() {
  # Usage: pipeline_state_complete
  if [ ! -f "$STATE_FILE" ]; then
    echo "ERROR: No active pipeline state" >&2
    return 1
  fi

  local now
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  local tmp="$STATE_FILE.tmp"
  python3 -c "
import json
with open('$STATE_FILE') as f:
    state = json.load(f)
state['status'] = 'completed'
state['completed'] = '$now'
with open('$tmp', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null && mv "$tmp" "$STATE_FILE"

  echo "Pipeline completed"
}

pipeline_state_read() {
  # Usage: pipeline_state_read — outputs current state JSON
  if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE"
  else
    echo "{}"
  fi
}

# Allow direct invocation: ./pipeline-state.sh <command> [args...]
if [ "${1:-}" != "" ]; then
  cmd="$1"
  shift
  case "$cmd" in
    init)     pipeline_state_init "$@" ;;
    wave-start)    pipeline_state_wave_start "$@" ;;
    wave-complete) pipeline_state_wave_complete "$@" ;;
    gate)     pipeline_state_gate "$@" ;;
    complete) pipeline_state_complete "$@" ;;
    read)     pipeline_state_read ;;
    *)        echo "Unknown command: $cmd" >&2; exit 1 ;;
  esac
fi
