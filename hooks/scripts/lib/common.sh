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

company_of_one_memory_dir() {
  echo "$(company_of_one_plugin_data)/memory"
}

company_of_one_init_storage() {
  local memory_dir
  memory_dir="$(company_of_one_memory_dir)"
  mkdir -p "$memory_dir/patterns" "$memory_dir/decisions" "$memory_dir/retros"
}
