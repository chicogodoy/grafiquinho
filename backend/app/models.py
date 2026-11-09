from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ColumnMeta(BaseModel):
    name: str
    label: str
    dtype: str  # "string" | "number" | "date" | "id" | "boolean"


class PointHighlight(BaseModel):
    rowId: int
    pointKey: Optional[str] = None
    color: str = "#dc2626"
    size: int = 14
    customLabel: str = ""
    showValue: bool = True
    badgeStyle: str = "solid"  # "solid" | "outline" | "minimal"


class ChartConfig(BaseModel):
    title: str = "Relatório Analítico"
    subtitle: str = "Visualização de dados e destaques pontuais"
    footer: str = "Fonte: Base de Dados Local (DuckDB)"
    chartType: str = "area"  # "line" | "area"
    curveType: str = "smooth"  # "smooth" | "linear" | "step"
    xColumn: str = ""
    xGrouping: str = "raw"  # "raw" | "day" | "hour" | "month"
    yColumn: str = ""
    yAggregation: str = "none"  # "none" | "count" | "count_distinct" | "sum" | "avg"
    secondaryYColumn: Optional[str] = ""
    labelColumn: Optional[str] = ""
    theme: str = "editorial_light"
    primaryColor: str = "#2563eb"
    secondaryColor: str = "#94a3b8"
    backgroundColor: str = "#ffffff"
    textColor: str = "#0f172a"
    gridColor: str = "#e2e8f0"
    lineWidth: int = 3
    defaultPointSize: int = 7
    areaOpacity: float = 0.22
    showDataLabels: str = "highlights_only"  # "all" | "highlights_only" | "none"
    valueFormat: str = "number"  # "raw" | "number" | "compact" | "percent" | "currency_brl"
    dateFormat: str = "raw"  # "raw" | "dd_mm" | "dd_mm_yyyy" | "mmm_yy"
    aspectRatio: str = "16:9"  # "16:9" | "4:3" | "1:1"
    showGrid: bool = True
    showLegend: bool = True


class CopyPastePayload(BaseModel):
    name: str = "Dados Colados"
    rawText: str
    hasHeader: bool = True


class ManualDatasetPayload(BaseModel):
    name: str = "Base Manual"
    xColumnName: str = "eixo_x"
    yColumnName: str = "valor"
    labelColumnName: str = "rotulo"
    rows: List[Dict[str, Any]]


class AddRowPayload(BaseModel):
    values: Dict[str, Any]
    highlight: Optional[PointHighlight] = None


class UpdateRowPayload(BaseModel):
    active: Optional[bool] = None
    values: Optional[Dict[str, Any]] = None


class UpdateProjectStatePayload(BaseModel):
    name: Optional[str] = None
    columnsMeta: Optional[List[ColumnMeta]] = None
    chartConfig: Optional[ChartConfig] = None
    highlights: Optional[Dict[str, PointHighlight]] = None


class QueryFilterPayload(BaseModel):
    search: Optional[str] = None
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None
    minVal: Optional[float] = None
    maxVal: Optional[float] = None
    onlyActive: bool = False
    onlyHighlighted: bool = False
    xColumn: Optional[str] = None
    yColumn: Optional[str] = None
    sortBy: Optional[str] = None
    sortDir: str = "asc"
    limit: int = 500
