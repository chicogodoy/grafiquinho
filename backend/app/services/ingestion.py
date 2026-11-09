from __future__ import annotations

import csv
import io
import json
import re
import unicodedata
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from app.database import get_db_connection
from app.models import ChartConfig


def slugify_column(name: str, idx: int) -> str:
    if not name or not str(name).strip():
        return f"col_{idx}"
    text = str(name).strip()
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9_]+", "_", text).strip("_").lower()
    if not text or text[0].isdigit():
        text = f"col_{text}" if text else f"col_{idx}"
    return text


def is_likely_id_column(col_name: str, label: str) -> bool:
    lower = f"{col_name} {label}".lower()
    if re.search(r"(^|_|\b)(id|uuid|guid|codigo|cod|cpf|cnpj|cep|telefone|matricula)($|_|\b)", lower):
        return True
    return False


def try_parse_number(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        if pd.isna(val):
            return None
        return float(val)
    s = str(val).strip()
    if not s:
        return None
    cleaned = re.sub(r"[R$\s%€£]", "", s)
    if not cleaned:
        return None
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        parts = cleaned.split(",")
        if len(parts) == 2 and len(parts[1]) <= 4:
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    try:
        return float(cleaned)
    except ValueError:
        return None


def try_parse_date_str(val: Any) -> Optional[str]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    if not s:
        return None

    # ISO datetime with optional fractional seconds and timezone (e.g. 2026-11-04 19:38:43.563000 UTC)
    iso_dt_match = re.match(
        r"^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?(?:\s*(?:UTC|Z|[+-]\d{2}:?\d{2}))?$",
        s,
        re.IGNORECASE,
    )
    if iso_dt_match:
        return f"{iso_dt_match.group(1)} {iso_dt_match.group(2)}"

    # Brazilian datetime (e.g. 04/11/2026 19:38:43)
    br_dt_match = re.match(
        r"^(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)",
        s,
    )
    if br_dt_match:
        dd, mm, yyyy, tpart = br_dt_match.groups()
        return f"{yyyy}-{int(mm):02d}-{int(dd):02d} {tpart}"

    patterns = [
        ("%Y-%m-%d", r"^\d{4}-\d{2}-\d{2}$"),
        ("%d/%m/%Y", r"^\d{1,2}/\d{1,2}/\d{4}$"),
        ("%d-%m-%Y", r"^\d{1,2}-\d{1,2}-\d{4}$"),
        ("%d/%m/%y", r"^\d{1,2}/\d{1,2}/\d{2}$"),
        ("%Y/%m/%d", r"^\d{4}/\d{1,2}/\d{1,2}$"),
        ("%m/%Y", r"^\d{1,2}/\d{4}$"),
        ("%Y-%m", r"^\d{4}-\d{2}$"),
    ]
    for fmt, regex in patterns:
        if re.match(regex, s):
            try:
                dt = datetime.strptime(s, fmt)
                if fmt in ("%m/%Y", "%Y-%m"):
                    return dt.strftime("%Y-%m-01")
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
    return None


def normalize_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[Dict[str, str]]]:
    """
    Cleans a raw DataFrame, detects column types (date, number, id, string),
    normalizes column identifiers, and returns (clean_df, columns_meta).
    """
    df = df.dropna(how="all").reset_index(drop=True)
    if df.empty:
        raise ValueError("Nenhum dado válido encontrado na entrada.")

    used_names: Dict[str, int] = {}
    columns_meta: List[Dict[str, str]] = []
    clean_cols: Dict[str, List[Any]] = {}

    for idx, orig_col in enumerate(df.columns):
        label = str(orig_col).strip() or f"Coluna {idx + 1}"
        base_slug = slugify_column(label, idx + 1)
        if base_slug in used_names:
            used_names[base_slug] += 1
            col_name = f"{base_slug}_{used_names[base_slug]}"
        else:
            used_names[base_slug] = 1
            col_name = base_slug

        series = df[orig_col].tolist()
        non_empty = [
            v
            for v in series[:500]
            if v is not None
            and str(v).strip() != ""
            and not (isinstance(v, float) and pd.isna(v))
        ]

        if not non_empty:
            dtype = "string"
            clean_cols[col_name] = ["" for _ in series]
        else:
            parsed_dates = [try_parse_date_str(v) for v in non_empty]
            date_ratio = sum(1 for d in parsed_dates if d is not None) / len(non_empty)

            parsed_nums = [try_parse_number(v) for v in non_empty]
            num_ratio = sum(1 for n in parsed_nums if n is not None) / len(non_empty)

            if date_ratio >= 0.75:
                dtype = "date"
                clean_cols[col_name] = [
                    try_parse_date_str(v)
                    or (
                        str(v).strip()
                        if v is not None and not (isinstance(v, float) and pd.isna(v))
                        else ""
                    )
                    for v in series
                ]
            elif is_likely_id_column(col_name, label):
                dtype = "id"
                clean_cols[col_name] = [
                    ""
                    if v is None or (isinstance(v, float) and pd.isna(v))
                    else str(v).strip()
                    for v in series
                ]
            elif num_ratio >= 0.75:
                dtype = "number"
                clean_cols[col_name] = [try_parse_number(v) for v in series]
            else:
                dtype = "string"
                clean_cols[col_name] = [
                    ""
                    if v is None or (isinstance(v, float) and pd.isna(v))
                    else str(v).strip()
                    for v in series
                ]

        columns_meta.append({"name": col_name, "label": label, "dtype": dtype})

    clean_df = pd.DataFrame(clean_cols)
    return clean_df, columns_meta


def build_default_chart_config(
    name: str,
    columns_meta: List[Dict[str, str]],
    row_count: int = 0,
) -> Dict[str, Any]:
    date_cols = [c["name"] for c in columns_meta if c["dtype"] == "date"]
    num_cols = [c["name"] for c in columns_meta if c["dtype"] == "number"]
    str_cols = [c["name"] for c in columns_meta if c["dtype"] == "string"]
    id_cols = [c["name"] for c in columns_meta if c["dtype"] == "id"]

    # Pick X column: prefer date column, otherwise first string/category column
    x_col = (
        date_cols[0]
        if date_cols
        else (str_cols[0] if str_cols else columns_meta[0]["name"])
    )

    is_categorical_x = x_col not in date_cols

    # Pick Y column & aggregation
    if num_cols:
        y_col = num_cols[0]
        y_agg = "sum" if (row_count > 50 or is_categorical_x) else "none"
    else:
        # No numeric metric column (e.g. event log or categorical list): count rows!
        y_col = id_cols[0] if id_cols else x_col
        y_agg = "count"

    x_grouping = "day" if (x_col in date_cols and row_count > 30) else "raw"
    sec_y_col = ""
    for c in num_cols[1:]:
        if any(k in c for k in ("meta", "target", "objetivo", "orcado", "previsto")):
            sec_y_col = c
            break
    default_chart_type = "bar" if is_categorical_x else "area"
    default_value_mode = "both_label" if is_categorical_x else "absolute"
    default_sort = "value_desc" if is_categorical_x else "original"

    # Only pick a label column automatically if it's a short note/label column and row_count <= 50
    label_col = ""
    if row_count <= 50:
        for c in str_cols:
            if c != x_col and any(
                k in c for k in ("rotulo", "evento", "nota", "obs", "label", "destaque")
            ):
                label_col = c
                break

    cfg = ChartConfig(
        title=name,
        subtitle="Visualização analítica e destaques pontuais",
        footer="Fonte: Base Analítica Local (DuckDB)",
        chartType=default_chart_type,
        curveType="smooth",
        xColumn=x_col,
        xGrouping=x_grouping,
        yColumn=y_col,
        yAggregation=y_agg,
        valueMode=default_value_mode,
        categorySort=default_sort,
        secondaryYColumn=sec_y_col,
        labelColumn=label_col,
        valueFormat="number",
        dateFormat="raw",
    )
    return cfg.model_dump()


def save_dataframe_as_project(
    df: pd.DataFrame,
    name: str,
    source_type: str,
    client_id: str = "public",
) -> Dict[str, Any]:
    clean_df, columns_meta = normalize_dataframe(df)
    project_id = f"proj-{uuid.uuid4().hex[:10]}"
    table_name = f"dataset_{project_id.replace('-', '_')}"
    now = datetime.utcnow().isoformat()

    clean_df.insert(0, "_active", True)
    clean_df.insert(0, "_row_id", range(1, len(clean_df) + 1))

    chart_config = build_default_chart_config(name, columns_meta, len(clean_df))
    highlights: Dict[str, Any] = {}

    # Only auto-highlight when dataset is small (<= 30 rows) and has an explicit label column
    label_col = chart_config.get("labelColumn")
    if (
        len(clean_df) <= 30
        and label_col
        and label_col in clean_df.columns
        and chart_config.get("yAggregation") == "none"
    ):
        palette = ["#2563eb", "#059669", "#d97706", "#dc2626"]
        h_idx = 0
        for _, row in clean_df.iterrows():
            lbl_val = str(row.get(label_col, "") or "").strip()
            if lbl_val and h_idx < 4:
                rid = int(row["_row_id"])
                highlights[str(rid)] = {
                    "rowId": rid,
                    "color": palette[h_idx % len(palette)],
                    "size": 14,
                    "customLabel": lbl_val,
                    "showValue": True,
                    "badgeStyle": "solid",
                }
                h_idx += 1

    with get_db_connection() as conn:
        conn.register("temp_ingest_df", clean_df)
        conn.execute(f"CREATE TABLE {table_name} AS SELECT * FROM temp_ingest_df")
        conn.unregister("temp_ingest_df")

        conn.execute(
            """
            INSERT INTO projects (id, client_id, name, source_type, table_name, columns_meta, chart_config, highlights, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                client_id,
                name,
                source_type,
                table_name,
                json.dumps(columns_meta),
                json.dumps(chart_config),
                json.dumps(highlights),
                now,
                now,
            ),
        )

    return {
        "id": project_id,
        "client_id": client_id,
        "name": name,
        "source_type": source_type,
        "table_name": table_name,
        "columns_meta": columns_meta,
        "chart_config": chart_config,
        "highlights": highlights,
        "row_count": len(clean_df),
    }


def parse_csv_bytes(
    file_bytes: bytes,
    filename: str,
    client_id: str = "public",
) -> Dict[str, Any]:
    text = None
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = file_bytes.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise ValueError("Não foi possível decodificar o arquivo CSV.")

    return parse_delimited_text(
        raw_text=text,
        name=filename.rsplit(".", 1)[0] or "Upload CSV",
        source_type="csv",
        has_header=True,
        client_id=client_id,
    )


def parse_delimited_text(
    raw_text: str,
    name: str,
    source_type: str = "paste",
    has_header: bool = True,
    client_id: str = "public",
) -> Dict[str, Any]:
    lines = [line for line in raw_text.splitlines() if line.strip()]
    if not lines:
        raise ValueError("Texto vazio.")

    sample = "\n".join(lines[:10])
    delimiter = ","
    if "\t" in sample:
        delimiter = "\t"
    elif sample.count(";") > sample.count(","):
        delimiter = ";"
    else:
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters="\t;,|")
            delimiter = dialect.delimiter
        except Exception:
            delimiter = ";" if ";" in sample else ","

    reader = csv.reader(io.StringIO("\n".join(lines)), delimiter=delimiter)
    rows = [r for r in reader if any(cell.strip() for cell in r)]
    if not rows:
        raise ValueError("Nenhuma linha encontrada após leitura do texto.")

    max_cols = max(len(r) for r in rows)
    normalized_rows = [r + [""] * (max_cols - len(r)) for r in rows]

    if has_header and len(normalized_rows) > 1:
        headers = [
            h.strip() or f"Coluna {i + 1}" for i, h in enumerate(normalized_rows[0])
        ]
        data_rows = normalized_rows[1:]
    else:
        headers = ["Eixo_X", "Valor", "Rotulo"][:max_cols]
        while len(headers) < max_cols:
            headers.append(f"Coluna {len(headers) + 1}")
        data_rows = normalized_rows

    df = pd.DataFrame(data_rows, columns=headers)
    return save_dataframe_as_project(
        df=df,
        name=name,
        source_type=source_type,
        client_id=client_id,
    )


def create_manual_dataset(
    name: str,
    x_col: str,
    y_col: str,
    label_col: str,
    rows: List[Dict[str, Any]],
    client_id: str = "public",
) -> Dict[str, Any]:
    if not rows:
        raise ValueError("Insira ao menos um ponto de dado.")
    df = pd.DataFrame(rows)
    return save_dataframe_as_project(
        df=df,
        name=name,
        source_type="manual",
        client_id=client_id,
    )
