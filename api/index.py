from __future__ import annotations

import os
import sys
from pathlib import Path

# Adiciona o diretório backend ao sys.path para o runtime Python da Vercel
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402

# Garante que o banco DuckDB (/tmp/print_grafico.duckdb na Vercel) esteja inicializado
init_db()

