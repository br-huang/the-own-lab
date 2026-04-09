#!/usr/bin/env bash

company_of_one_plugin_id() {
  echo "claude-company-of-one"
}

company_of_one_platform() {
  if [ -n "${COMPANY_OF_ONE_PLATFORM:-}" ]; then
    echo "$COMPANY_OF_ONE_PLATFORM"
    return
  fi

  if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] || [ -n "${CLAUDE_PLUGIN_DATA:-}" ]; then
    echo "claude"
    return
  fi

  if [ -n "${CODEX_PLUGIN_ROOT:-}" ] || [ -n "${CODEX_PLUGIN_DATA:-}" ]; then
    echo "codex"
    return
  fi

  echo "shared"
}

company_of_one_runtime_label() {
  case "$(company_of_one_platform)" in
    claude)
      echo "Claude Code"
      ;;
    codex)
      echo "Codex"
      ;;
    *)
      echo "the current coding runtime"
      ;;
  esac
}

company_of_one_plugin_root() {
  if [ -n "${COMPANY_OF_ONE_PLUGIN_ROOT:-}" ]; then
    echo "$COMPANY_OF_ONE_PLUGIN_ROOT"
    return
  fi

  if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ]; then
    echo "$CLAUDE_PLUGIN_ROOT"
    return
  fi

  if [ -n "${CODEX_PLUGIN_ROOT:-}" ]; then
    echo "$CODEX_PLUGIN_ROOT"
    return
  fi

  dirname "$(dirname "$(dirname "$0")")"
}

company_of_one_default_data_dir() {
  local plugin_id
  plugin_id="$(company_of_one_plugin_id)"

  case "$(company_of_one_platform)" in
    claude)
      echo "$HOME/.claude/plugin-data/$plugin_id"
      ;;
    codex)
      echo "$HOME/.codex/plugin-data/$plugin_id"
      ;;
    *)
      echo "$HOME/.company-of-one/plugin-data/$plugin_id"
      ;;
  esac
}

company_of_one_plugin_data() {
  if [ -n "${COMPANY_OF_ONE_PLUGIN_DATA:-}" ]; then
    echo "$COMPANY_OF_ONE_PLUGIN_DATA"
    return
  fi

  if [ -n "${CLAUDE_PLUGIN_DATA:-}" ]; then
    echo "$CLAUDE_PLUGIN_DATA"
    return
  fi

  if [ -n "${CODEX_PLUGIN_DATA:-}" ]; then
    echo "$CODEX_PLUGIN_DATA"
    return
  fi

  company_of_one_default_data_dir
}

company_of_one_project_key() {
  # Generate a human-readable + unique project key: slug-shorthash
  # e.g., 112-claude-company-of-one-a1b2c3d4
  local root slug hash
  root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  slug="$(basename "$root" | tr '[:upper:]' '[:lower:]')"
  hash="$(printf '%s' "$root" | shasum -a 256 | cut -c1-8)"
  echo "${slug}-${hash}"
}

company_of_one_project_dir() {
  # Per-project data directory under plugin data
  echo "$(company_of_one_plugin_data)/projects/$(company_of_one_project_key)"
}

company_of_one_memory_dir() {
  echo "$(company_of_one_project_dir)/patterns"
}

company_of_one_briefs_dir() {
  echo "$(company_of_one_project_dir)/briefs"
}

company_of_one_specs_dir() {
  echo "$(company_of_one_project_dir)/specs"
}

company_of_one_init_storage() {
  local project_dir
  project_dir="$(company_of_one_project_dir)"
  mkdir -p \
    "$project_dir/patterns" \
    "$project_dir/briefs/history" \
    "$project_dir/specs"

  # Update project index
  company_of_one_update_project_index
}

company_of_one_update_project_index() {
  local plugin_data project_key root now index_file
  plugin_data="$(company_of_one_plugin_data)"
  project_key="$(company_of_one_project_key)"
  root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  now="$(date +%Y-%m-%d)"
  index_file="$plugin_data/projects/.index.json"

  mkdir -p "$plugin_data/projects"

  python3 -c "
import json, os
index_path = '$index_file'
try:
    with open(index_path) as f:
        index = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    index = {}
index['$project_key'] = {
    'path': '$root',
    'lastActive': '$now'
}
with open(index_path, 'w') as f:
    json.dump(index, f, indent=2)
" 2>/dev/null
}
