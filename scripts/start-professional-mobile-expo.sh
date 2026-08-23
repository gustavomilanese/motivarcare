#!/usr/bin/env bash
# Arranca Metro/Expo de la app profesional en un puerto fijo.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${EXPO_METRO_PORT:-8191}"

if command -v lsof >/dev/null 2>&1; then
  pids=$(lsof -ti ":$PORT" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "[professional-mobile] Puerto $PORT ocupado → liberando proceso(es) anteriores..."
    kill $pids 2>/dev/null || true
    sleep 0.5
    pids2=$(lsof -ti ":$PORT" 2>/dev/null || true)
    if [[ -n "$pids2" ]]; then
      kill -9 $pids2 2>/dev/null || true
    fi
  fi
fi

cd "$REPO_ROOT/apps/professional-mobile"
exec npx expo start --port "$PORT" "$@"
