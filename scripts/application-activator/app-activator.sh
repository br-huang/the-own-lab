#!/usr/bin/env bash
set -euo pipefail

# ─── Application Activator ───────────────────────────────────────────
# A gum-powered TUI for launching and managing macOS applications.
# Requires: gum, yq (managed via mise)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.yaml"

# ─── Colors & Styles ─────────────────────────────────────────────────
ACCENT="#7C3AED"
SUCCESS="#22C55E"
ERROR="#EF4444"
DIM="#6B7280"

header() {
  gum style \
    --foreground "$ACCENT" \
    --border double \
    --border-foreground "$ACCENT" \
    --align center \
    --width 50 \
    --margin "1 0" \
    --padding "0 2" \
    "Application Activator" \
    "Manage & launch your apps"
}

msg_success() { gum style --foreground "$SUCCESS" "  $1"; }
msg_error()   { gum style --foreground "$ERROR"   "  $1"; }
msg_dim()     { gum style --foreground "$DIM"     "  $1"; }

# ─── App Discovery ───────────────────────────────────────────────────
list_apps() {
  local source="${1:-all}"
  case "$source" in
    setapp)
      ls -1d /Applications/Setapp/*.app 2>/dev/null | xargs -I{} basename "{}" .app
      ;;
    system)
      ls -1d /Applications/*.app 2>/dev/null | xargs -I{} basename "{}" .app | grep -v "^Setapp$"
      ;;
    all)
      list_apps system
      list_apps setapp
      ;;
  esac | sort
}

app_source() {
  local app="$1"
  if [[ -d "/Applications/Setapp/${app}.app" ]]; then
    echo "SetApp"
  elif [[ -d "/Applications/${app}.app" ]]; then
    echo "System"
  else
    echo "Unknown"
  fi
}

app_path() {
  local app="$1"
  if [[ -d "/Applications/Setapp/${app}.app" ]]; then
    echo "/Applications/Setapp/${app}.app"
  elif [[ -d "/Applications/${app}.app" ]]; then
    echo "/Applications/${app}.app"
  fi
}

is_running() {
  pgrep -xq "$1" 2>/dev/null || osascript -e "tell application \"System Events\" to (name of processes) contains \"$1\"" 2>/dev/null | grep -q "true"
}

# ─── Profile Management ──────────────────────────────────────────────
list_profiles() {
  yq '.profiles | keys | .[]' "$CONFIG_FILE"
}

profile_description() {
  yq ".profiles.$1.description" "$CONFIG_FILE"
}

profile_apps() {
  yq ".profiles.$1.apps[]" "$CONFIG_FILE"
}

# ─── Actions ──────────────────────────────────────────────────────────
do_launch_single() {
  local apps
  apps=$(list_apps all)

  local selected
  selected=$(echo "$apps" | gum filter \
    --placeholder "Search apps..." \
    --header "Select an app to launch" \
    --indicator ">" \
    --height 0) || return

  [[ -z "$selected" ]] && return

  local path
  path=$(app_path "$selected")
  local src
  src=$(app_source "$selected")

  gum spin --title "Launching ${selected}..." -- open -a "$path"
  msg_success "${selected} launched  (${src})"
  sleep 1
}

do_launch_multi() {
  local apps
  apps=$(list_apps all)

  local selected
  selected=$(echo "$apps" | gum filter \
    --no-limit \
    --placeholder "Search & select multiple apps (Tab to select)..." \
    --header "Select apps to launch (Tab = toggle, Enter = confirm)" \
    --height 0) || return

  [[ -z "$selected" ]] && return

  local count=0
  while IFS= read -r app; do
    local path
    path=$(app_path "$app")
    open -a "$path" &
    ((count++))
  done <<< "$selected"
  wait

  msg_success "Launched ${count} apps"
  sleep 1
}

do_launch_profile() {
  local profiles
  profiles=$(list_profiles)

  # Build display list with descriptions
  local display_list=""
  while IFS= read -r p; do
    local desc
    desc=$(profile_description "$p")
    display_list+="${p}  ${desc}"$'\n'
  done <<< "$profiles"
  display_list="${display_list%$'\n'}"

  local selected
  selected=$(echo "$display_list" | gum choose \
    --header "Select a profile to launch") || return

  [[ -z "$selected" ]] && return

  # Extract profile name (first word)
  local profile_name
  profile_name=$(echo "$selected" | awk '{print $1}')

  local apps
  apps=$(profile_apps "$profile_name")

  if ! gum confirm "Launch all apps in '${profile_name}' profile?"; then
    return
  fi

  local count=0
  local failed=0
  while IFS= read -r app; do
    local path
    path=$(app_path "$app")
    if [[ -n "$path" ]]; then
      open -a "$path" &
      ((count++))
    else
      msg_error "Not found: ${app}"
      ((failed++))
    fi
  done <<< "$apps"
  wait

  msg_success "Launched ${count} apps from '${profile_name}'"
  [[ $failed -gt 0 ]] && msg_error "${failed} apps not found"
  sleep 1
}

do_manage_running() {
  # Get running GUI apps
  local running
  running=$(osascript -e '
    tell application "System Events"
      set appNames to name of every application process whose background only is false
      set output to ""
      repeat with appName in appNames
        set output to output & appName & linefeed
      end repeat
      return output
    end tell
  ' 2>/dev/null | sed '/^$/d' | sort)

  if [[ -z "$running" ]]; then
    msg_dim "No running apps detected"
    sleep 1
    return
  fi

  local selected
  selected=$(echo "$running" | gum filter \
    --no-limit \
    --placeholder "Search running apps..." \
    --header "Select running apps (Tab = toggle)" \
    --height 0) || return

  [[ -z "$selected" ]] && return

  local action
  action=$(gum choose \
    --header "What to do with selected apps?" \
    "Quit" \
    "Force Quit" \
    "Restart") || return

  case "$action" in
    "Quit")
      while IFS= read -r app; do
        osascript -e "tell application \"$app\" to quit" 2>/dev/null &
      done <<< "$selected"
      wait
      msg_success "Quit signal sent"
      ;;
    "Force Quit")
      if gum confirm "Force quit selected apps? Unsaved data may be lost."; then
        while IFS= read -r app; do
          pkill -x "$app" 2>/dev/null || killall "$app" 2>/dev/null || true
        done <<< "$selected"
        msg_success "Force quit complete"
      fi
      ;;
    "Restart")
      while IFS= read -r app; do
        local path
        path=$(app_path "$app")
        osascript -e "tell application \"$app\" to quit" 2>/dev/null
        sleep 1
        if [[ -n "$path" ]]; then
          open -a "$path" &
        else
          open -a "$app" &
        fi
      done <<< "$selected"
      wait
      msg_success "Restarted selected apps"
      ;;
  esac
  sleep 1
}

do_browse_apps() {
  local source
  source=$(gum choose \
    --header "Browse apps by source" \
    "All Apps" \
    "SetApp Apps" \
    "System Apps") || return

  local filter_source
  case "$source" in
    "All Apps")    filter_source="all" ;;
    "SetApp Apps") filter_source="setapp" ;;
    "System Apps") filter_source="system" ;;
  esac

  local apps
  apps=$(list_apps "$filter_source")

  if [[ -z "$apps" ]]; then
    msg_dim "No apps found"
    sleep 1
    return
  fi

  local selected
  selected=$(echo "$apps" | gum filter \
    --placeholder "Browse ${source}..." \
    --header "${source}" \
    --height 0) || return

  [[ -z "$selected" ]] && return

  local src
  src=$(app_source "$selected")
  local path
  path=$(app_path "$selected")
  local running_status="Not running"
  is_running "$selected" && running_status="Running"

  gum style \
    --border rounded \
    --border-foreground "$ACCENT" \
    --padding "1 2" \
    --margin "1 0" \
    "  ${selected}" \
    "" \
    "  Source:  ${src}" \
    "  Path:    ${path}" \
    "  Status:  ${running_status}"

  local action
  action=$(gum choose \
    --header "Action" \
    "Launch" \
    "Back") || return

  if [[ "$action" == "Launch" ]]; then
    gum spin --title "Launching ${selected}..." -- open -a "$path"
    msg_success "${selected} launched"
  fi
  sleep 1
}

do_edit_profiles() {
  local action
  action=$(gum choose \
    --header "Profile Management" \
    "View profiles" \
    "Add app to profile" \
    "Remove app from profile" \
    "Create new profile" \
    "Delete profile" \
    "Open config in editor") || return

  case "$action" in
    "View profiles")
      local profiles
      profiles=$(list_profiles)
      while IFS= read -r p; do
        local desc
        desc=$(profile_description "$p")
        local apps
        apps=$(profile_apps "$p" | sed 's/^/    /')
        gum style \
          --border rounded \
          --border-foreground "$DIM" \
          --padding "0 2" \
          --margin "0 0 1 0" \
          "  ${p} - ${desc}" \
          "$apps"
      done <<< "$profiles"
      gum input --placeholder "Press Enter to continue..."
      ;;

    "Add app to profile")
      local profile
      profile=$(list_profiles | gum choose --header "Select profile") || return
      local selected_apps
      selected_apps=$(list_apps all | gum filter \
        --no-limit \
        --placeholder "Search & select apps (Tab = toggle)..." \
        --header "Add to '${profile}'" \
        --height 0) || return
      [[ -z "$selected_apps" ]] && return
      local add_count=0
      while IFS= read -r app; do
        yq -i ".profiles.${profile}.apps += [\"${app}\"]" "$CONFIG_FILE"
        ((add_count++))
      done <<< "$selected_apps"
      msg_success "Added ${add_count} app(s) to '${profile}'"
      sleep 1
      ;;

    "Remove app from profile")
      local profile
      profile=$(list_profiles | gum choose --header "Select profile") || return
      local app
      app=$(profile_apps "$profile" | gum choose --header "Remove from '${profile}'") || return
      yq -i "del(.profiles.${profile}.apps[] | select(. == \"${app}\"))" "$CONFIG_FILE"
      msg_success "Removed '${app}' from '${profile}'"
      sleep 1
      ;;

    "Create new profile")
      local name
      name=$(gum input --placeholder "Profile name (lowercase, no spaces)..." --header "New Profile") || return
      [[ -z "$name" ]] && return
      local desc
      desc=$(gum input --placeholder "Description..." --header "Profile description") || return
      yq -i ".profiles.${name}.description = \"${desc}\" | .profiles.${name}.apps = []" "$CONFIG_FILE"
      msg_success "Profile '${name}' created"
      sleep 1
      ;;

    "Delete profile")
      local profile
      profile=$(list_profiles | gum choose --header "Delete which profile?") || return
      if gum confirm "Delete profile '${profile}'?"; then
        yq -i "del(.profiles.${profile})" "$CONFIG_FILE"
        msg_success "Profile '${profile}' deleted"
      fi
      sleep 1
      ;;

    "Open config in editor")
      ${EDITOR:-vim} "$CONFIG_FILE"
      ;;
  esac
}

# ─── Main Menu ────────────────────────────────────────────────────────
main() {
  while true; do
    clear
    header

    local choice
    choice=$(gum choose \
      --header "What would you like to do?" \
      --cursor "> " \
      "Launch an app" \
      "Launch multiple apps" \
      "Launch a profile" \
      "Manage running apps" \
      "Browse apps" \
      "Edit profiles" \
      "Quit") || exit 0

    case "$choice" in
      "Launch an app")        do_launch_single  ;;
      "Launch multiple apps") do_launch_multi   ;;
      "Launch a profile")     do_launch_profile ;;
      "Manage running apps")  do_manage_running ;;
      "Browse apps")          do_browse_apps    ;;
      "Edit profiles")        do_edit_profiles  ;;
      "Quit")                 exit 0            ;;
    esac
  done
}

main "$@"
