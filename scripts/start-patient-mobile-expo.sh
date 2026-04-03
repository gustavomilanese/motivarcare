#!/usr/bin/env bash
# Arranca Metro/Expo en un puerto fijo sin prompt interactivo si el puerto quedó colgado.
# Uso: desde apps/patient-mobile (npm start) o vía npm run dev:patient-mobile.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${EXPO_METRO_PORT:-8190}"

if command -v lsof >/dev/null 2>&1; then
  pids=$(lsof -ti ":$PORT" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "[patient-mobile] Puerto $PORT ocupado → liberando proceso(es) anteriores..."
    kill $pids 2>/dev/null || true
    sleep 0.5
    pids2=$(lsof -ti ":$PORT" 2>/dev/null || true)
    if [[ -n "$pids2" ]]; then
      kill -9 $pids2 2>/dev/null || true
    fi
  fi
fi

cd "$REPO_ROOT/apps/patient-mobile"
exec npx expo start --port "$PORT" "$@"
