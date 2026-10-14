#!/bin/bash
set -euo pipefail

# Only run in remote cloud sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "=== WebbeaCRM Session Start ===" >&2

# 1. Start PostgreSQL
echo "[1/4] Starting PostgreSQL..." >&2
sudo service postgresql start 2>/dev/null || true
sleep 2

# 2. Install backend dependencies
echo "[2/4] Installing backend dependencies..." >&2
cd "$CLAUDE_PROJECT_DIR/backend"
npm install --prefer-offline 2>/dev/null || npm install

# 3. Install frontend dependencies
echo "[3/4] Installing frontend dependencies..." >&2
cd "$CLAUDE_PROJECT_DIR/frontend"
npm install --prefer-offline 2>/dev/null || npm install

# 4. Start backend dev server in background
echo "[4/4] Starting backend server..." >&2
cd "$CLAUDE_PROJECT_DIR/backend"
nohup npm run dev > /tmp/backend.log 2>&1 &
echo "Backend PID: $!" >&2

# Wait for backend to be ready (up to 20s)
for i in $(seq 1 20); do
  if curl -sf http://localhost:5000/api/auth/me >/dev/null 2>&1; then
    echo "Backend ready." >&2
    break
  fi
  sleep 1
done

echo "=== Setup complete ===" >&2
echo "  Backend:  http://localhost:5000" >&2
echo "  Frontend: run 'cd frontend && npm run dev' to start" >&2
