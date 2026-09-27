#!/bin/bash

# Pull EAS production env vars into .env.local.
# Intended to be sourced from release scripts after `cd` to the project root.

pull_production_env() {
  local env_file="${1:-.env.local}"
  local sentry_token=""

  if [ -f "$env_file" ]; then
    sentry_token=$(grep "^SENTRY_AUTH_TOKEN=" "$env_file" | cut -d '=' -f2- | sed 's/^"//;s/"$//' | tr -d ' ')
  fi

  echo "Pulling EAS production environment into ${env_file}..."
  npx eas-cli env:pull --environment production --path "$env_file" --non-interactive

  if [ -n "$sentry_token" ]; then
    if ! grep -q "^SENTRY_AUTH_TOKEN=" "$env_file" 2>/dev/null; then
      printf '\nSENTRY_AUTH_TOKEN=%s\n' "$sentry_token" >> "$env_file"
    fi
    export SENTRY_AUTH_TOKEN="$sentry_token"
  elif [ -f "$env_file" ]; then
    sentry_token=$(grep "^SENTRY_AUTH_TOKEN=" "$env_file" | cut -d '=' -f2- | sed 's/^"//;s/"$//' | tr -d ' ')
    if [ -n "$sentry_token" ]; then
      export SENTRY_AUTH_TOKEN="$sentry_token"
    fi
  fi
}
