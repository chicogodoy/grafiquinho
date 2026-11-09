# Etapa 1: Build do Frontend Next.js (Standalone)
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV BACKEND_INTERNAL_URL=http://127.0.0.1:8000
RUN npm run build

# Etapa 2: Imagem Unificada (Python 3.12 + Node 20)
FROM python:3.12-slim-bookworm AS runner
WORKDIR /app

# Instala runtime do Node.js para servir o Next.js standalone junto com o FastAPI
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    BACKEND_INTERNAL_URL="http://127.0.0.1:8000" \
    DUCKDB_PATH="/app/data/grafiquinho.duckdb"

# Instala dependências Python do Backend
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copia código do Backend
COPY backend/app ./backend/app
RUN mkdir -p /app/data

# Copia build standalone do Frontend
COPY --from=frontend-builder /frontend/.next/standalone ./frontend
COPY --from=frontend-builder /frontend/.next/static ./frontend/.next/static

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

CMD ["/app/docker-entrypoint.sh"]


# Test