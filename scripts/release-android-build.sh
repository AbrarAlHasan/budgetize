#!/bin/bash

# Script to build Android production release
# Reads EXPO_TOKEN from .env.local and runs EAS build

set -e  # Exit on error

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Path to .env.local file
ENV_FILE="$PROJECT_ROOT/.env.local"

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env.local file not found at $ENV_FILE"
  echo "Please create .env.local with EXPO_TOKEN=your_token"
  exit 1
fi

# Read EXPO_TOKEN from .env.local
# This handles both EXPO_TOKEN=value and EXPO_TOKEN="value" formats
EXPO_TOKEN=$(grep "^EXPO_TOKEN=" "$ENV_FILE" | cut -d '=' -f2- | sed 's/^"//;s/"$//' | tr -d ' ')

# Check if EXPO_TOKEN was found
if [ -z "$EXPO_TOKEN" ]; then
  echo "Error: EXPO_TOKEN not found in .env.local"
  echo "Please add EXPO_TOKEN=your_token to .env.local"
  exit 1
fi

# Export EXPO_TOKEN
export EXPO_TOKEN

npx eas-cli whoami

echo "✓ EXPO_TOKEN loaded from .env.local"
echo "✓ Starting EAS build for Android (production profile)..."
echo ""

# Run EAS build
cd "$PROJECT_ROOT"
npx eas-cli build --platform android --profile production --local

