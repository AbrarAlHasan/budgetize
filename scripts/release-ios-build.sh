#!/bin/bash

# Build iOS production release using the local EAS CLI login.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# A leftover EXPO_TOKEN overrides `eas login`. Always use the CLI session.
unset EXPO_TOKEN

cd "$PROJECT_ROOT"

# shellcheck source=lib/pull-production-env.sh
source "$SCRIPT_DIR/lib/pull-production-env.sh"

if ! npx eas-cli whoami; then
  echo "Error: not logged in to EAS. Run: npx eas-cli login"
  exit 1
fi

pull_production_env "$PROJECT_ROOT/.env.local"

echo "Starting EAS build for iOS (production profile)..."
echo ""

npx eas-cli build --platform ios --profile production --local --non-interactive
