#!/usr/bin/env sh
set -e

echo "Iniciando FastAPI + DuckDB interno em 127.0.0.1:8000..."
uvicorn app.main:app --app-dir /app/backend --host 127.0.0.1 --port 8000 &

echo "Iniciando Next.js na porta ${PORT:-3000}..."
exec node /app/frontend/server.js

