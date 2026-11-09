#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Iniciando Backend (FastAPI + DuckDB) em http://127.0.0.1:8000 ..."
"$ROOT_DIR/backend/.venv/bin/uvicorn" app.main:app --app-dir "$ROOT_DIR/backend" --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

trap "echo 'Encerrando servidores...'; kill $BACKEND_PID 2>/dev/null || true" EXIT INT TERM

echo "Iniciando Frontend (Next.js) em http://localhost:3000 ..."
npm --prefix "$ROOT_DIR/frontend" run dev

