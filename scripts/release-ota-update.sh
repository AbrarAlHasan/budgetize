#!/bin/bash

# Publish Android and iOS EAS Updates using the local EAS CLI login.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# A leftover EXPO_TOKEN overrides `eas login`. Always use the CLI session.
unset EXPO_TOKEN

UPDATE_MESSAGE="enhanced spending velocity calculations"

cd "$PROJECT_ROOT"

# shellcheck source=lib/pull-production-env.sh
source "$SCRIPT_DIR/lib/pull-production-env.sh"

if ! npx eas-cli whoami; then
  echo "Error: not logged in to EAS. Run: npx eas-cli login"
  exit 1
fi

pull_production_env "$PROJECT_ROOT/.env.local"

echo "Starting EAS Update for Android and iOS (production channel)..."
echo ""

echo "Publishing update for Android..."
npx eas-cli update --channel production --platform android --message "$UPDATE_MESSAGE" --clear-cache

echo ""

echo "Publishing update for iOS..."
npx eas-cli update --channel production --platform ios --message "$UPDATE_MESSAGE" --clear-cache

echo ""
echo "OTA updates published for Android and iOS."
