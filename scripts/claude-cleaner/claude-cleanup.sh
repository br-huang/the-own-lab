#!/bin/bash
# Claude Code .claude directory cleanup script (gum TUI edition)
# Requires: gum (https://github.com/charmbracelet/gum)

set -euo pipefail

CLAUDE_DIR="$HOME/.claude"
DRY_RUN=false

# ── Colors & Styles ──────────────────────────────────────────
RED="196"
GREEN="46"
YELLOW="220"
CYAN="87"
DIM="240"
PINK="212"

header() {
  gum style --bold --foreground "$CYAN" --border double --border-foreground "$DIM" \
    --padding "0 2" --margin "1 0" "$1"
}

label() {
  gum style --foreground "$DIM" "$1"
}

success() {
  gum style --foreground "$GREEN" "  ✓ $1"
}

skip() {
  gum style --foreground "$DIM" "  ⊘ $1"
}

warn() {
  gum style --foreground "$YELLOW" "  ⚠ $1"
}

# ── Dependency check ─────────────────────────────────────────
if ! command -v gum &>/dev/null; then
  echo "gum is required. Install: mise use -g gum@latest"
  exit 1
fi

if [ ! -d "$CLAUDE_DIR" ]; then
  gum style --foreground "$RED" "Nothing to clean: $CLAUDE_DIR does not exist."
  exit 0
fi

# ── Header ───────────────────────────────────────────────────
header "Claude Code Cleaner"
before_size=$(du -sh "$CLAUDE_DIR" 2>/dev/null | cut -f1)
label "  Target: $CLAUDE_DIR ($before_size)"
echo ""

# ── Claude running check ────────────────────────────────────
SKIP_SESSIONS=false
if pgrep -qf "claude" 2>/dev/null; then
  warn "Claude Code is running — session files will be skipped"
  SKIP_SESSIONS=true
fi

# ── Scan targets ─────────────────────────────────────────────
# Each item: "path|label|level"
#   level: 1=safe, 2=history, 3=deep projects
TARGETS=()

add_target() {
  local path="$1" label="$2" level="$3"
  if [ -e "$path" ]; then
    local size
    size=$(du -sh "$path" 2>/dev/null | cut -f1 | xargs)
    TARGETS+=("${path}|${label} (${size})|${level}")
  fi
}

# Level 1: Safe
add_target "$CLAUDE_DIR/cache"           "cache/"           1
add_target "$CLAUDE_DIR/paste-cache"     "paste-cache/"     1
add_target "$CLAUDE_DIR/shell-snapshots" "shell-snapshots/" 1
add_target "$CLAUDE_DIR/telemetry"       "telemetry/"       1
add_target "$CLAUDE_DIR/backups"         "backups/"         1
add_target "$CLAUDE_DIR/file-history"    "file-history/"    1
add_target "$CLAUDE_DIR/plans"           "plans/"           1
add_target "$CLAUDE_DIR/tasks"           "tasks/"           1
add_target "$CLAUDE_DIR/.DS_Store"       ".DS_Store"        1

if [ "$SKIP_SESSIONS" = false ]; then
  add_target "$CLAUDE_DIR/sessions"    "sessions/"    1
  add_target "$CLAUDE_DIR/session-env" "session-env/" 1
fi

# Level 2: History
add_target "$CLAUDE_DIR/history.jsonl" "history.jsonl (command history)" 2

# Level 3: Deep — old project data
if [ -d "$CLAUDE_DIR/projects" ]; then
  while IFS= read -r dir; do
    [ -z "$dir" ] && continue
    name=$(basename "$dir")
    add_target "$dir" "projects/$name (30+ days inactive)" 3
  done < <(find "$CLAUDE_DIR/projects" -mindepth 1 -maxdepth 1 -type d -mtime +30 2>/dev/null || true)
fi

if [ ${#TARGETS[@]} -eq 0 ]; then
  gum style --foreground "$GREEN" "Already clean — nothing to remove."
  exit 0
fi

# ── Choose cleanup level ─────────────────────────────────────
LEVEL=$(gum choose --header "Select cleanup level:" \
  "Quick   — cache & temp files only" \
  "Full    — + command history" \
  "Deep    — + inactive projects (30+ days)" \
  "Custom  — pick exactly what to remove")

case "$LEVEL" in
  "Quick"*)   MAX_LEVEL=1 ;;
  "Full"*)    MAX_LEVEL=2 ;;
  "Deep"*)    MAX_LEVEL=3 ;;
  "Custom"*)  MAX_LEVEL=0 ;;
esac

# ── Build selection ──────────────────────────────────────────
SELECTED_PATHS=()

if [ "$MAX_LEVEL" -gt 0 ]; then
  # Auto-select by level
  for item in "${TARGETS[@]}"; do
    IFS='|' read -r path label level <<< "$item"
    if [ "$level" -le "$MAX_LEVEL" ]; then
      SELECTED_PATHS+=("$path")
    fi
  done
else
  # Custom: let user pick with checkboxes
  OPTIONS=()
  for item in "${TARGETS[@]}"; do
    IFS='|' read -r path label level <<< "$item"
    OPTIONS+=("$label")
  done

  PICKED=$(printf '%s\n' "${OPTIONS[@]}" | gum choose --no-limit --header "Select items to remove:")

  if [ -z "$PICKED" ]; then
    gum style --foreground "$YELLOW" "Nothing selected. Exiting."
    exit 0
  fi

  while IFS= read -r picked_label; do
    for item in "${TARGETS[@]}"; do
      IFS='|' read -r path label level <<< "$item"
      if [ "$label" = "$picked_label" ]; then
        SELECTED_PATHS+=("$path")
        break
      fi
    done
  done <<< "$PICKED"
fi

if [ ${#SELECTED_PATHS[@]} -eq 0 ]; then
  gum style --foreground "$YELLOW" "Nothing to clean at this level."
  exit 0
fi

# ── Preview ──────────────────────────────────────────────────
echo ""
gum style --bold --foreground "$PINK" "Items to remove:"
for item in "${TARGETS[@]}"; do
  IFS='|' read -r path label level <<< "$item"
  for sel in "${SELECTED_PATHS[@]}"; do
    if [ "$path" = "$sel" ]; then
      echo "  $(gum style --foreground "$RED" "✗") $label"
      break
    fi
  done
done

echo ""
gum style --foreground "$DIM" "  Protected: settings.json, plugins/, projects/*/memory/"
echo ""

# ── Confirm ──────────────────────────────────────────────────
if ! gum confirm "Proceed with cleanup?"; then
  gum style --foreground "$YELLOW" "Cancelled."
  exit 0
fi

# ── Dry run toggle ───────────────────────────────────────────
if gum confirm --default=no "Dry run? (preview only, no deletion)"; then
  DRY_RUN=true
fi

# ── Execute ──────────────────────────────────────────────────
echo ""
for item in "${TARGETS[@]}"; do
  IFS='|' read -r path label level <<< "$item"
  for sel in "${SELECTED_PATHS[@]}"; do
    if [ "$path" = "$sel" ]; then
      if $DRY_RUN; then
        skip "[dry-run] $label"
      else
        rm -rf "$path"
        success "Removed $label"
      fi
      break
    fi
  done
done

# ── Summary ──────────────────────────────────────────────────
echo ""
after_size=$(du -sh "$CLAUDE_DIR" 2>/dev/null | cut -f1)
if $DRY_RUN; then
  gum style --bold --foreground "$YELLOW" --border rounded --padding "0 2" \
    "DRY RUN complete — no files were deleted" \
    "Current size: $before_size"
else
  gum style --bold --foreground "$GREEN" --border rounded --padding "0 2" \
    "Cleanup complete!" \
    "Before: $before_size → After: $after_size"
fi
