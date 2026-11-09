from __future__ import annotations

import json
import math
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.database import get_db_connection
from app.models import QueryFilterPayload
from app.services.ingestion import try_parse_date_str, try_parse_number


def _sanitize_value(v: Any) -> Any:
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def list_projects(client_id: str = "public") -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        # Local migration: if not on Vercel and there are legacy non-demo projects with client_id='public' or NULL,
        # assign them to the local user's client_id so existing local projects remain visible to their owner.
        if client_id != "public" and not os.environ.get("VERCEL"):
            conn.execute(
                """
                UPDATE projects
                SET client_id = ?
                WHERE (client_id IS NULL OR client_id = 'public')
                  AND source_type != 'demo'
                """,
                [client_id],
            )

        rows = conn.execute(
            """
            SELECT id, client_id, name, source_type, table_name, columns_meta, chart_config, highlights, created_at, updated_at
            FROM projects
            WHERE client_id = ? OR source_type = 'demo'
            ORDER BY CASE WHEN source_type = 'demo' THEN 1 ELSE 0 END ASC, updated_at DESC
            """,
            [client_id],
        ).fetchall()

        result = []
        for r in rows:
            result.append(
                {
                    "id": r[0],
                    "client_id": r[1] or "public",
                    "name": r[2],
                    "source_type": r[3],
                    "table_name": r[4],
                    "columns_meta": json.loads(r[5]) if isinstance(r[5], str) else r[5],
                    "chart_config": json.loads(r[6]) if isinstance(r[6], str) else r[6],
                    "highlights": json.loads(r[7]) if isinstance(r[7], str) else r[7],
                    "created_at": str(r[8]),
                    "updated_at": str(r[9]),
                }
            )
        return result


def get_project_metadata(
    project_id: str,
    client_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        r = conn.execute(
            """
            SELECT id, client_id, name, source_type, table_name, columns_meta, chart_config, highlights, created_at, updated_at
            FROM projects
            WHERE id = ?
            """,
            [project_id],
        ).fetchone()
        if not r:
            return None

        proj_client = r[1] or "public"
        source_type = r[3]
        if (
            client_id
            and client_id != "public"
            and source_type != "demo"
            and proj_client not in (client_id, "public")
        ):
            return None

        return {
            "id": r[0],
            "client_id": proj_client,
            "name": r[2],
            "source_type": source_type,
            "table_name": r[4],
            "columns_meta": json.loads(r[5]) if isinstance(r[5], str) else r[5],
            "chart_config": json.loads(r[6]) if isinstance(r[6], str) else r[6],
            "highlights": json.loads(r[7]) if isinstance(r[7], str) else r[7],
            "created_at": str(r[8]),
            "updated_at": str(r[9]),
        }


def query_project_data(
    project_id: str,
    filters: QueryFilterPayload,
    client_id: Optional[str] = None,
) -> Dict[str, Any]:
    meta = get_project_metadata(project_id, client_id=client_id)
    if not meta:
        raise ValueError(f"Projeto '{project_id}' não encontrado ou sem permissão.")

    table_name = meta["table_name"]
    columns_meta = meta["columns_meta"]
    valid_cols = {c["name"]: c["dtype"] for c in columns_meta}
    chart_cfg = meta["chart_config"]
    highlights = meta["highlights"] or {}

    x_col = filters.xColumn or chart_cfg.get("xColumn")
    y_col = filters.yColumn or chart_cfg.get("yColumn")

    where_clauses: List[str] = ["1=1"]
    params: List[Any] = []

    if filters.onlyActive:
        where_clauses.append("_active = TRUE")

    if filters.onlyHighlighted:
        highlighted_ids = [int(k) for k in highlights.keys() if str(k).isdigit()]
        if highlighted_ids:
            placeholders = ", ".join(["?"] * len(highlighted_ids))
            where_clauses.append(f"_row_id IN ({placeholders})")
            params.extend(highlighted_ids)
        else:
            where_clauses.append("1=0")

    if filters.search and filters.search.strip():
        q = f"%{filters.search.strip().lower()}%"
        or_parts = [
            f'LOWER(CAST("{col}" AS VARCHAR)) LIKE ?' for col in valid_cols.keys()
        ]
        if or_parts:
            where_clauses.append("(" + " OR ".join(or_parts) + ")")
            params.extend([q] * len(or_parts))

    if x_col and x_col in valid_cols:
        if filters.dateFrom and filters.dateFrom.strip():
            where_clauses.append(f'CAST("{x_col}" AS VARCHAR) >= ?')
            params.append(filters.dateFrom.strip())
        if filters.dateTo and filters.dateTo.strip():
            where_clauses.append(f'CAST("{x_col}" AS VARCHAR) <= ?')
            params.append(filters.dateTo.strip())

    if y_col and y_col in valid_cols:
        if filters.minVal is not None:
            where_clauses.append(f'TRY_CAST("{y_col}" AS DOUBLE) >= ?')
            params.append(float(filters.minVal))
        if filters.maxVal is not None:
            where_clauses.append(f'TRY_CAST("{y_col}" AS DOUBLE) <= ?')
            params.append(float(filters.maxVal))

    sort_col = "_row_id"
    if filters.sortBy and (
        filters.sortBy in valid_cols or filters.sortBy == "_row_id"
    ):
        sort_col = f'"{filters.sortBy}"'
    sort_dir = "DESC" if str(filters.sortDir).lower() == "desc" else "ASC"

    where_sql = " AND ".join(where_clauses)
    sql = f"SELECT * FROM {table_name} WHERE {where_sql} ORDER BY {sort_col} {sort_dir}, _row_id ASC"

    with get_db_connection() as conn:
        total_count_row = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
        total_count = total_count_row[0] if total_count_row else 0

        cursor = conn.execute(sql, params)
        col_names = [desc[0] for desc in cursor.description]
        raw_rows = cursor.fetchall()

    rows: List[Dict[str, Any]] = []
    for r in raw_rows:
        row_dict = {col_names[i]: _sanitize_value(r[i]) for i in range(len(col_names))}
        rows.append(row_dict)

    return {
        "project": meta,
        "total_rows": total_count,
        "filtered_rows": len(rows),
        "rows": rows,
    }


def update_project_state(
    project_id: str,
    name: Optional[str] = None,
    columns_meta: Optional[List[Dict[str, Any]]] = None,
    chart_config: Optional[Dict[str, Any]] = None,
    highlights: Optional[Dict[str, Any]] = None,
    client_id: Optional[str] = None,
) -> Dict[str, Any]:
    meta = get_project_metadata(project_id, client_id=client_id)
    if not meta:
        raise ValueError(f"Projeto '{project_id}' não encontrado.")

    new_name = name if name is not None else meta["name"]
    new_cols = columns_meta if columns_meta is not None else meta["columns_meta"]
    new_cfg = chart_config if chart_config is not None else meta["chart_config"]
    new_highlights = highlights if highlights is not None else meta["highlights"]
    now = datetime.utcnow().isoformat()

    with get_db_connection() as conn:
        conn.execute(
            """
            UPDATE projects
            SET name = ?, columns_meta = ?, chart_config = ?, highlights = ?, updated_at = ?
            WHERE id = ?
            """,
            [
                new_name,
                json.dumps(new_cols),
                json.dumps(new_cfg),
                json.dumps(new_highlights),
                now,
                project_id,
            ],
        )

    return get_project_metadata(project_id, client_id=client_id)  # type: ignore


def delete_project(project_id: str, client_id: Optional[str] = None) -> Dict[str, Any]:
    meta = get_project_metadata(project_id, client_id=client_id)
    if not meta:
        raise ValueError(f"Projeto '{project_id}' não encontrado.")
    if meta["source_type"] == "demo":
        raise ValueError("A base de demonstração padrão não pode ser removida.")

    table_name = meta["table_name"]
    with get_db_connection() as conn:
        conn.execute(f"DROP TABLE IF EXISTS {table_name}")
        conn.execute("DELETE FROM projects WHERE id = ?", [project_id])

    return {"id": project_id, "deleted": True}


def add_row_to_project(
    project_id: str,
    values: Dict[str, Any],
    highlight: Optional[Dict[str, Any]] = None,
    client_id: Optional[str] = None,
) -> Dict[str, Any]:
    meta = get_project_metadata(project_id, client_id=client_id)
    if not meta:
        raise ValueError(f"Projeto '{project_id}' não encontrado.")

    table_name = meta["table_name"]
    columns_meta = meta["columns_meta"]

    with get_db_connection() as conn:
        max_row = conn.execute(
            f"SELECT COALESCE(MAX(_row_id), 0) FROM {table_name}"
        ).fetchone()
        next_row_id = int(max_row[0]) + 1 if max_row else 1

        col_identifiers = ["_row_id", "_active"]
        col_values: List[Any] = [next_row_id, True]

        for col in columns_meta:
            c_name = col["name"]
            c_type = col["dtype"]
            raw_v = values.get(c_name)
            if c_type == "number":
                parsed_v = try_parse_number(raw_v)
            elif c_type == "date":
                parsed_v = try_parse_date_str(raw_v) or (
                    str(raw_v).strip() if raw_v is not None else ""
                )
            else:
                parsed_v = str(raw_v).strip() if raw_v is not None else ""
            col_identifiers.append(f'"{c_name}"')
            col_values.append(parsed_v)

        placeholders = ", ".join(["?"] * len(col_identifiers))
        cols_sql = ", ".join(col_identifiers)
        conn.execute(
            f"INSERT INTO {table_name} ({cols_sql}) VALUES ({placeholders})",
            col_values,
        )

        if highlight:
            highlights = meta.get("highlights") or {}
            highlight["rowId"] = next_row_id
            highlights[str(next_row_id)] = highlight
            conn.execute(
                "UPDATE projects SET highlights = ?, updated_at = ? WHERE id = ?",
                [json.dumps(highlights), datetime.utcnow().isoformat(), project_id],
            )

    return {"rowId": next_row_id}


def update_row_in_project(
    project_id: str,
    row_id: int,
    active: Optional[bool] = None,
    values: Optional[Dict[str, Any]] = None,
    client_id: Optional[str] = None,
) -> Dict[str, Any]:
    meta = get_project_metadata(project_id, client_id=client_id)
    if not meta:
        raise ValueError(f"Projeto '{project_id}' não encontrado.")

    table_name = meta["table_name"]
    columns_meta = {c["name"]: c["dtype"] for c in meta["columns_meta"]}

    updates: List[str] = []
    params: List[Any] = []

    if active is not None:
        updates.append("_active = ?")
        params.append(bool(active))

    if values:
        for k, raw_v in values.items():
            if k in columns_meta:
                c_type = columns_meta[k]
                if c_type == "number":
                    parsed_v = try_parse_number(raw_v)
                elif c_type == "date":
                    parsed_v = try_parse_date_str(raw_v) or (
                        str(raw_v).strip() if raw_v is not None else ""
                    )
                else:
                    parsed_v = str(raw_v).strip() if raw_v is not None else ""
                updates.append(f'"{k}" = ?')
                params.append(parsed_v)

    if updates:
        params.append(row_id)
        sql = f"UPDATE {table_name} SET {', '.join(updates)} WHERE _row_id = ?"
        with get_db_connection() as conn:
            conn.execute(sql, params)
            conn.execute(
                "UPDATE projects SET updated_at = ? WHERE id = ?",
                [datetime.utcnow().isoformat(), project_id],
            )

    return {"rowId": row_id, "updated": True}


def delete_row_from_project(
    project_id: str,
    row_id: int,
    client_id: Optional[str] = None,
) -> Dict[str, Any]:
    meta = get_project_metadata(project_id, client_id=client_id)
    if not meta:
        raise ValueError(f"Projeto '{project_id}' não encontrado.")

    table_name = meta["table_name"]
    highlights = meta.get("highlights") or {}
    if str(row_id) in highlights:
        del highlights[str(row_id)]

    with get_db_connection() as conn:
        conn.execute(f"DELETE FROM {table_name} WHERE _row_id = ?", [row_id])
        conn.execute(
            "UPDATE projects SET highlights = ?, updated_at = ? WHERE id = ?",
            [json.dumps(highlights), datetime.utcnow().isoformat(), project_id],
        )

    return {"rowId": row_id, "deleted": True}
