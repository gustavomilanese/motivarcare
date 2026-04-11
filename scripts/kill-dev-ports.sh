#!/usr/bin/env bash
# Libera puertos típicos del monorepo MotivarCare (API + Vite).
# Uso: desde la raíz → npm run dev:kill
# No toca Docker (MySQL 3307 / Redis 6379).

set -euo pipefail

PORTS=(4000 5172 5173 5174 5175 5176 8081 8190)

echo "Buscando procesos en puertos: ${PORTS[*]}"

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "  Puerto $port → PID(s): $pids → enviando SIGTERM..."
    kill $pids 2>/dev/null || true
    sleep 0.3
    pids2=$(lsof -ti ":$port" 2>/dev/null || true)
    if [[ -n "$pids2" ]]; then
      echo "  Puerto $port aún ocupado → SIGKILL..."
      kill -9 $pids2 2>/dev/null || true
    fi
  fi
done

echo "Listo. Volvé a correr: npm run dev  o  npm run dev:all (suben Docker MySQL+Redis y esperan al puerto antes de los apps)."
