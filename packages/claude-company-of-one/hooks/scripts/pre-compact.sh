#!/usr/bin/env bash
# Pre-Compact Hook — Claude 一人公司
# Saves pipeline state before context compaction so it can be restored.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=hooks/scripts/lib/common.sh
. "$SCRIPT_DIR/lib/common.sh"

PROJECT_DIR="$(company_of_one_project_dir)"

# Ensure project directory exists
mkdir -p "$PROJECT_DIR"

echo "Pre-compact: Pipeline state at $PROJECT_DIR/pipeline.json"
echo "If you have unsaved pipeline progress, write it now before compaction."
