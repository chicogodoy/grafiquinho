from __future__ import annotations

import json
import os
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Generator

import duckdb

BASE_DIR = Path(__file__).resolve().parent.parent

if os.environ.get("DUCKDB_PATH"):
    DB_PATH = Path(os.environ["DUCKDB_PATH"])
    DATA_DIR = DB_PATH.parent
elif os.environ.get("VERCEL"):
    DATA_DIR = Path("/tmp")
    DB_PATH = DATA_DIR / "grafiquinho.duckdb"
else:
    DATA_DIR = BASE_DIR / "data"
    legacy_path = DATA_DIR / "print_grafico.duckdb"
    new_path = DATA_DIR / "grafiquinho.duckdb"
    if legacy_path.exists() and not new_path.exists():
        try:
            legacy_path.rename(new_path)
        except OSError:
            pass
    DB_PATH = new_path if not legacy_path.exists() else legacy_path


def ensure_data_dir() -> None:
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass


@contextmanager
def get_db_connection() -> Generator[duckdb.DuckDBPyConnection, None, None]:
    ensure_data_dir()
    conn = duckdb.connect(str(DB_PATH))
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id VARCHAR PRIMARY KEY,
                client_id VARCHAR DEFAULT 'public',
                name VARCHAR NOT NULL,
                source_type VARCHAR NOT NULL,
                table_name VARCHAR NOT NULL,
                columns_meta JSON NOT NULL,
                chart_config JSON NOT NULL,
                highlights JSON NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            )
            """
        )
        try:
            conn.execute(
                "ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id VARCHAR DEFAULT 'public'"
            )
        except Exception:
            pass

        count_row = conn.execute("SELECT COUNT(*) FROM projects").fetchone()
        if count_row and count_row[0] == 0:
            _seed_demo_project(conn)


def _seed_demo_project(conn: duckdb.DuckDBPyConnection) -> None:
    project_id = "demo-receita-2026"
    table_name = "dataset_demo_receita_2026"
    now = datetime.utcnow().isoformat()

    conn.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            _row_id INTEGER PRIMARY KEY,
            _active BOOLEAN DEFAULT TRUE,
            data VARCHAR,
            receita DOUBLE,
            meta DOUBLE,
            rotulo VARCHAR
        )
        """
    )

    sample_rows = [
        (1, True, "2026-01-15", 142500.0, 130000.0, "Início Q1"),
        (2, True, "2026-02-15", 158200.0, 140000.0, ""),
        (3, True, "2026-03-15", 149800.0, 145000.0, "Ajuste Sazonal"),
        (4, True, "2026-04-15", 184300.0, 155000.0, "Campanha Outono"),
        (5, True, "2026-05-15", 196700.0, 165000.0, ""),
        (6, True, "2026-06-15", 173400.0, 170000.0, "Feriados Junho"),
        (7, True, "2026-07-15", 215900.0, 180000.0, "Lançamento V2"),
        (8, True, "2026-08-15", 228400.0, 190000.0, ""),
        (9, True, "2026-09-15", 241000.0, 200000.0, "Semana do Cliente"),
        (10, True, "2026-10-15", 289500.0, 220000.0, "Recorde Histórico"),
        (11, True, "2026-11-15", 312000.0, 250000.0, "Black Friday"),
        (12, True, "2026-12-15", 348900.0, 280000.0, "Fechamento Anual"),
    ]

    conn.executemany(
        f"INSERT INTO {table_name} (_row_id, _active, data, receita, meta, rotulo) VALUES (?, ?, ?, ?, ?, ?)",
        sample_rows,
    )

    columns_meta = [
        {"name": "data", "label": "data", "dtype": "date"},
        {"name": "receita", "label": "receita", "dtype": "number"},
        {"name": "meta", "label": "meta", "dtype": "number"},
        {"name": "rotulo", "label": "rotulo", "dtype": "string"},
    ]

    chart_config = {
        "title": "Evolução da Receita Mensal vs. Meta (2026)",
        "subtitle": "Crescimento acelerado a partir do lançamento da V2 em Julho e pico na Black Friday",
        "footer": "Fonte: Base Analítica DuckDB Local • Relatório Executivo",
        "chartType": "area",
        "curveType": "smooth",
        "xColumn": "data",
        "yColumn": "receita",
        "secondaryYColumn": "meta",
        "labelColumn": "rotulo",
        "theme": "editorial_light",
        "primaryColor": "#2563eb",
        "secondaryColor": "#94a3b8",
        "backgroundColor": "#ffffff",
        "textColor": "#0f172a",
        "gridColor": "#e2e8f0",
        "lineWidth": 3,
        "defaultPointSize": 7,
        "areaOpacity": 0.22,
        "showDataLabels": "highlights_only",
        "valueFormat": "currency_brl",
        "dateFormat": "mmm_yy",
        "aspectRatio": "16:9",
        "showGrid": True,
        "showLegend": True,
    }

    highlights = {
        "7": {
            "rowId": 7,
            "color": "#059669",
            "size": 14,
            "customLabel": "Lançamento V2 (+24%)",
            "showValue": True,
            "badgeStyle": "solid",
        },
        "10": {
            "rowId": 10,
            "color": "#d97706",
            "size": 15,
            "customLabel": "Recorde Q4",
            "showValue": True,
            "badgeStyle": "solid",
        },
        "11": {
            "rowId": 11,
            "color": "#dc2626",
            "size": 16,
            "customLabel": "Pico Black Friday",
            "showValue": True,
            "badgeStyle": "solid",
        },
    }

    conn.execute(
        """
        INSERT INTO projects (id, client_id, name, source_type, table_name, columns_meta, chart_config, highlights, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            project_id,
            "public",
            "Receita Mensal 2026 (Demo)",
            "demo",
            table_name,
            json.dumps(columns_meta),
            json.dumps(chart_config),
            json.dumps(highlights),
            now,
            now,
        ),
    )

