from __future__ import annotations

import sys
from pathlib import Path

# Adiciona o diretório backend ao sys.path para o runtime Python da Vercel
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import estático explícito para o empacotador da Vercel incluir backend/app/**
import backend.app.database  # noqa: F401, E402
import backend.app.models  # noqa: F401, E402
import backend.app.services.ingestion  # noqa: F401, E402
import backend.app.services.query  # noqa: F401, E402
import backend.app.routers.datasets  # noqa: F401, E402
from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402

# Garante que o banco DuckDB (/tmp/grafiquinho.duckdb na Vercel) esteja inicializado
init_db()
