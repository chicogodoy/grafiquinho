"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Sparkles,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Table2,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Filter,
} from "lucide-react";
import {
  ChartConfig,
  ColumnDType,
  ColumnMeta,
  PointHighlight,
  QueryFilters,
} from "@/types/chart";
import {
  extractGroupedXKey,
  formatMetricValue,
  formatTitleCase,
} from "@/lib/formatters";

interface DataPreviewTableProps {
  columnsMeta: ColumnMeta[];
  rows: Record<string, any>[];
  totalRows: number;
  filteredRows: number;
  chartConfig: ChartConfig;
  highlights: Record<string, PointHighlight>;
  filters: QueryFilters;
  columnFilters: Record<string, string>;
  excludedXGroups: string[];
  onToggleExcludedXGroup: (groupKey: string) => void;
  onChangeColumnFilters: (next: Record<string, string>) => void;
  onChangeColumnDType: (colName: string, nextDType: ColumnDType) => void;
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
  onChangeFilters: (next: QueryFilters) => void;
  onResetFilters: () => void;
  onChangeChartConfig: (patch: Partial<ChartConfig>) => void;
  onToggleRowActive: (rowId: number, active: boolean) => void;
  onUpdateCellValue: (rowId: number, colName: string, value: any) => void;
  onDeleteRow: (rowId: number) => void;
  onOpenPointHighlight: (row: Record<string, any>) => void;
}

const DTYPE_LABELS: Record<ColumnDType, string> = {
  string: "Texto / Categoria",
  id: "ID / Código",
  number: "Número / Métrica",
  date: "Data / Hora",
  boolean: "Booleano",
};

export default function DataPreviewTable({
  columnsMeta,
  rows,
  totalRows,
  filteredRows,
  chartConfig,
  highlights,
  filters,
  columnFilters,
  excludedXGroups,
  onToggleExcludedXGroup,
  onChangeColumnFilters,
  onChangeColumnDType,
  isExpanded,
  onToggleExpand,
  onChangeFilters,
  onResetFilters,
  onChangeChartConfig,
  onToggleRowActive,
  onUpdateCellValue,
  onDeleteRow,
  onOpenPointHighlight,
}: DataPreviewTableProps) {
  const [isTallGrid, setIsTallGrid] = useState(false);
  const [visibleRowLimit, setVisibleRowLimit] = useState(100);
  const [editingCell, setEditingCell] = useState<{
    rowId: number;
    col: string;
    val: string;
  } | null>(null);

  const activePlottedCount = useMemo(
    () =>
      rows.filter((r) => {
        if (r._active === false) return false;
        const gk = extractGroupedXKey(
          r[chartConfig.xColumn],
          chartConfig.xGrouping || "raw"
        );
        return !excludedXGroups.includes(gk);
      }).length,
    [rows, chartConfig.xColumn, chartConfig.xGrouping, excludedXGroups]
  );

  // Distinct X-axis groups/categories/dates for the Quick Filter Chips bar
  const distinctXChips = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      if (r._active === false) return;
      const key = extractGroupedXKey(
        r[chartConfig.xColumn],
        chartConfig.xGrouping || "raw"
      );
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, count }))
      .slice(0, 40);
  }, [rows, chartConfig.xColumn, chartConfig.xGrouping]);

  // Summary metrics per column based on user-chosen dtype
  const columnSummaries = useMemo(() => {
    const activeRowsList = rows.filter((r) => {
      if (r._active === false) return false;
      const gk = extractGroupedXKey(
        r[chartConfig.xColumn],
        chartConfig.xGrouping || "raw"
      );
      return !excludedXGroups.includes(gk);
    });

    const stats: Record<
      string,
      {
        kind: "number" | "distinct";
        sum?: number;
        avg?: number;
        distinctCount?: number;
      }
    > = {};

    columnsMeta.forEach((col) => {
      if (col.dtype === "number") {
        const nums = activeRowsList
          .map((r) => Number(r[col.name]))
          .filter((n) => !Number.isNaN(n));
        const sum = nums.reduce((a, b) => a + b, 0);
        stats[col.name] = {
          kind: "number",
          sum,
          avg: nums.length > 0 ? sum / nums.length : 0,
        };
      } else {
        const uniqueSet = new Set(
          activeRowsList
            .map((r) => r[col.name])
            .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
            .map((v) => String(v))
        );
        stats[col.name] = {
          kind: "distinct",
          distinctCount: uniqueSet.size,
        };
      }
    });

    return stats;
  }, [
    columnsMeta,
    rows,
    chartConfig.xColumn,
    chartConfig.xGrouping,
    excludedXGroups,
  ]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.minVal !== "" ||
    filters.maxVal !== "" ||
    filters.onlyActive ||
    filters.onlyHighlighted ||
    excludedXGroups.length > 0 ||
    Object.values(columnFilters).some((v) => v.trim() !== "");

  const commitCellEdit = () => {
    if (!editingCell) return;
    onUpdateCellValue(editingCell.rowId, editingCell.col, editingCell.val);
    setEditingCell(null);
  };

  const handleSortColumn = (colName: string) => {
    const nextDir =
      filters.sortBy === colName && filters.sortDir === "asc" ? "desc" : "asc";
    onChangeFilters({
      ...filters,
      sortBy: colName,
      sortDir: nextDir,
    });
  };

  const slicedRows = useMemo(
    () => rows.slice(0, visibleRowLimit),
    [rows, visibleRowLimit]
  );

  return (
    <section
      id="data-preview-section"
      className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-md overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-inner">
            <Table2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                2. Pré-visualização da Base de Dados, Tipagem Livre & Filtros
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {activePlottedCount} de {totalRows} registros ativos
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Altere livremente o tipo de cada coluna (Texto, ID, Número, Data/Hora), escolha a agregação do gráfico e filtre os dados em tempo real.
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTallGrid(!isTallGrid)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            {isTallGrid ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                Tabela Compacta
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                Ampliar Tabela
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onToggleExpand(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Ocultar Tabela
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Mostrar Tabela ({filteredRows} linhas)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Flexible Axis Mapping & Aggregation Bar */}
      <div className="px-5 py-3 bg-indigo-50/60 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
          <span>Eixos e Agregação Livre do Gráfico:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Quick Selector */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Formato:</span>
            <select
              value={chartConfig.chartType || "area"}
              onChange={(e) =>
                onChangeChartConfig({
                  chartType: e.target.value as ChartConfig["chartType"],
                })
              }
              className="font-bold text-indigo-700 bg-transparent focus:outline-none"
            >
              <option value="area">Área c/ Gradiente</option>
              <option value="line">Linha Pura</option>
              <option value="bar">Barras Verticais (Colunas)</option>
              <option value="bar_horizontal">Barras Horizontais (Ranking)</option>
            </select>
          </div>

          {/* X Axis Column */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Eixo X / Categoria:</span>
            <select
              value={chartConfig.xColumn}
              onChange={(e) => onChangeChartConfig({ xColumn: e.target.value })}
              className="font-bold text-slate-800 bg-transparent focus:outline-none"
            >
              {columnsMeta.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.label} ({DTYPE_LABELS[c.dtype] || c.dtype})
                </option>
              ))}
            </select>
          </div>

          {/* X Grouping (for dates/timestamps or categories) */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Agrupar X:</span>
            <select
              value={chartConfig.xGrouping || "raw"}
              onChange={(e) =>
                onChangeChartConfig({
                  xGrouping: e.target.value as ChartConfig["xGrouping"],
                })
              }
              className="font-bold text-indigo-700 bg-transparent focus:outline-none"
            >
              <option value="raw">Valor / Categoria Exata</option>
              <option value="day">Por Dia (AAAA-MM-DD)</option>
              <option value="hour">Por Hora (AAAA-MM-DD HH:00)</option>
              <option value="month">Por Mês (AAAA-MM)</option>
            </select>
          </div>

          {/* Y Aggregation Mode */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Cálculo Eixo Y:</span>
            <select
              value={chartConfig.yAggregation || "none"}
              onChange={(e) =>
                onChangeChartConfig({
                  yAggregation: e.target.value as ChartConfig["yAggregation"],
                })
              }
              className="font-bold text-emerald-700 bg-transparent focus:outline-none"
            >
              <option value="none">Valor Direto / Automático</option>
              <option value="count">Contagem de Linhas (COUNT)</option>
              <option value="count_distinct">
                Contagem Única / Distinta (COUNT DISTINCT)
              </option>
              <option value="sum">Soma por Categoria (SUM)</option>
              <option value="avg">Média por Categoria (AVG)</option>
            </select>
          </div>

          {/* Proportional / Share Mode */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Proporção:</span>
            <select
              value={chartConfig.valueMode || "absolute"}
              onChange={(e) =>
                onChangeChartConfig({
                  valueMode: e.target.value as ChartConfig["valueMode"],
                })
              }
              className="font-bold text-violet-700 bg-transparent focus:outline-none"
            >
              <option value="absolute">Valor Absoluto</option>
              <option value="percent_of_total">% do Total (100%)</option>
              <option value="both_label">Absoluto + % no Rótulo</option>
            </select>
          </div>

          {/* Category Sorting */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Ordem:</span>
            <select
              value={chartConfig.categorySort || "original"}
              onChange={(e) =>
                onChangeChartConfig({
                  categorySort: e.target.value as ChartConfig["categorySort"],
                })
              }
              className="font-bold text-slate-700 bg-transparent focus:outline-none"
            >
              <option value="original">Ordem da Base / Data</option>
              <option value="value_desc">Maior → Menor</option>
              <option value="value_asc">Menor → Maior</option>
              <option value="alpha">Alfabética (A → Z)</option>
            </select>
          </div>

          {/* Y Axis Column */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Coluna Y:</span>
            <select
              value={chartConfig.yColumn}
              onChange={(e) => onChangeChartConfig({ yColumn: e.target.value })}
              className="font-bold text-blue-600 bg-transparent focus:outline-none"
            >
              {columnsMeta.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.label} ({DTYPE_LABELS[c.dtype] || c.dtype})
                </option>
              ))}
            </select>
          </div>

          {/* Target / Meta Column (Any field or None) */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Coluna Meta:</span>
            <select
              value={chartConfig.secondaryYColumn || ""}
              onChange={(e) =>
                onChangeChartConfig({ secondaryYColumn: e.target.value })
              }
              className="font-bold text-teal-700 bg-transparent focus:outline-none"
            >
              <option value="">Sem Meta (Não plotar)</option>
              {columnsMeta.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.label} ({DTYPE_LABELS[c.dtype] || c.dtype})
                </option>
              ))}
            </select>
            {chartConfig.secondaryYColumn && (
              <button
                type="button"
                onClick={() => onChangeChartConfig({ secondaryYColumn: "" })}
                className="ml-0.5 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] transition-colors cursor-pointer"
                title="Remover a linha de meta do gráfico"
              >
                ✕ Remover
              </button>
            )}
          </div>

          {/* Optional Label Column */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs">
            <span className="text-slate-500 font-medium">Coluna Rótulo:</span>
            <select
              value={chartConfig.labelColumn || ""}
              onChange={(e) =>
                onChangeChartConfig({ labelColumn: e.target.value })
              }
              className="font-bold text-amber-700 bg-transparent focus:outline-none"
            >
              <option value="">Nenhuma</option>
              {columnsMeta.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title Case Toggle for Categories & Legends */}
          <label className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-2xs cursor-pointer select-none hover:bg-indigo-50/50 transition-colors">
            <input
              type="checkbox"
              checked={chartConfig.useTitleCase !== false}
              onChange={(e) =>
                onChangeChartConfig({ useTitleCase: e.target.checked })
              }
              className="w-3.5 h-3.5 rounded text-indigo-600"
            />
            <span className="font-bold text-indigo-900">
              Title Case (Categorias/Legendas)
            </span>
          </label>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) =>
              onChangeFilters({ ...filters, search: e.target.value })
            }
            placeholder="Buscar texto, categoria, ID ou data em qualquer coluna..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Generic X Range Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-600 font-medium">Filtro Eixo X:</span>
          <input
            type="text"
            placeholder="De (ex: 2026-11-01)"
            value={filters.dateFrom}
            onChange={(e) =>
              onChangeFilters({ ...filters, dateFrom: e.target.value })
            }
            className="w-36 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
          />
          <span className="text-slate-400">até</span>
          <input
            type="text"
            placeholder="Até (ex: 2026-11-30)"
            value={filters.dateTo}
            onChange={(e) =>
              onChangeFilters({ ...filters, dateTo: e.target.value })
            }
            className="w-36 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
          />
        </div>

        {/* Numeric Range Filter (only when Y is direct numeric) */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-600 font-medium">Faixa Numérica:</span>
          <input
            type="number"
            placeholder="Mín"
            value={filters.minVal}
            onChange={(e) =>
              onChangeFilters({ ...filters, minVal: e.target.value })
            }
            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
          />
          <input
            type="number"
            placeholder="Máx"
            value={filters.maxVal}
            onChange={(e) =>
              onChangeFilters({ ...filters, maxVal: e.target.value })
            }
            className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
          />
        </div>

        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">
          <input
            type="checkbox"
            checked={filters.onlyHighlighted}
            onChange={(e) =>
              onChangeFilters({
                ...filters,
                onlyHighlighted: e.target.checked,
              })
            }
            className="rounded text-amber-500"
          />
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Só Destaques
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onChangeColumnFilters({});
              onResetFilters();
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Distinct X-Axis Values Quick Filter Chips */}
      {distinctXChips.length > 0 && (
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Valores do Eixo X ({distinctXChips.length}):
          </span>
          <div className="flex items-center gap-1.5">
            {distinctXChips.map((chip) => {
              const isExcluded = excludedXGroups.includes(chip.key);
              const hl = highlights[chip.key];

              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => onToggleExcludedXGroup(chip.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all shrink-0 cursor-pointer ${
                    !isExcluded
                      ? hl
                        ? "bg-amber-50 border-amber-300 text-slate-900 shadow-2xs"
                        : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                      : "bg-slate-50 border-dashed border-slate-200 text-slate-400 line-through opacity-60 hover:opacity-100"
                  }`}
                  title={
                    !isExcluded
                      ? "Clique para filtrar/ocultar este grupo do gráfico"
                      : "Clique para exibir novamente este grupo no gráfico"
                  }
                >
                  {hl && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: hl.color }}
                    />
                  )}
                  <span>
                    {formatTitleCase(
                      chip.key,
                      chartConfig.useTitleCase !== false
                    )}
                  </span>
                  {chip.count > 1 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/80 text-slate-500 border border-slate-200">
                      {chip.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable Data Spreadsheet Table */}
      {isExpanded && (
        <div>
          <div
            className={`${
              isTallGrid ? "max-h-[540px]" : "max-h-80"
            } overflow-y-auto transition-all`}
          >
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-semibold text-slate-600 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center uppercase tracking-wider">
                    #
                  </th>
                  <th className="py-2.5 px-3 w-20 text-center uppercase tracking-wider">
                    Ativo
                  </th>
                  <th className="py-2.5 px-3 w-36 uppercase tracking-wider">
                    Destaque
                  </th>
                  {columnsMeta.map((col) => (
                    <th key={col.name} className="py-2 px-3 min-w-[165px]">
                      <div className="flex flex-col gap-1.5">
                        {/* Column Title + Role Badge */}
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => handleSortColumn(col.name)}
                            className="inline-flex items-center gap-1 font-bold text-slate-800 hover:text-indigo-600 uppercase tracking-wider cursor-pointer"
                            title="Clique para ordenar por esta coluna"
                          >
                            <span>{col.label}</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </button>
                          <div className="flex items-center gap-1">
                            {col.name === chartConfig.xColumn && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px] font-bold">
                                EIXO X
                              </span>
                            )}
                            {col.name === chartConfig.yColumn && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">
                                EIXO Y
                              </span>
                            )}
                            {col.name === chartConfig.labelColumn && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                RÓTULO
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Free Column Type Selector */}
                        <div className="flex items-center gap-1">
                          <select
                            value={col.dtype}
                            onChange={(e) =>
                              onChangeColumnDType(
                                col.name,
                                e.target.value as ColumnDType
                              )
                            }
                            className={`w-full px-1.5 py-0.5 text-[10px] font-semibold rounded border cursor-pointer focus:outline-none ${
                              col.dtype === "number"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : col.dtype === "date"
                                ? "bg-blue-50 border-blue-200 text-blue-800"
                                : col.dtype === "id"
                                ? "bg-purple-50 border-purple-200 text-purple-800"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                            title="Alterar livremente o tipo deste campo"
                          >
                            <option value="string">Tipo: Texto / Categoria</option>
                            <option value="id">Tipo: ID / Código</option>
                            <option value="number">Tipo: Número / Métrica</option>
                            <option value="date">Tipo: Data / Hora</option>
                            <option value="boolean">Tipo: Booleano</option>
                          </select>
                        </div>

                        {/* Per-column inline filter input */}
                        <input
                          type="text"
                          value={columnFilters[col.name] || ""}
                          onChange={(e) =>
                            onChangeColumnFilters({
                              ...columnFilters,
                              [col.name]: e.target.value,
                            })
                          }
                          placeholder={`Filtrar ${col.label}...`}
                          className="w-full px-2 py-1 text-[11px] font-normal rounded border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </th>
                  ))}
                  <th className="py-2.5 px-3 w-14 text-right uppercase tracking-wider">
                    Excluir
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {slicedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columnsMeta.length + 4}
                      className="py-10 text-center text-slate-400"
                    >
                      Nenhum registro encontrado para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  slicedRows.map((row, idx) => {
                    const rowId = Number(row._row_id);
                    const groupKey = extractGroupedXKey(
                      row[chartConfig.xColumn],
                      chartConfig.xGrouping || "raw"
                    );
                    const isActive =
                      row._active !== false &&
                      !excludedXGroups.includes(groupKey);
                    const hl =
                      highlights[String(rowId)] || highlights[groupKey];

                    return (
                      <tr
                        key={rowId}
                        className={`transition-colors ${
                          !isActive
                            ? "bg-slate-50/90 text-slate-400"
                            : hl
                            ? "bg-amber-50/40 hover:bg-amber-50/80"
                            : "hover:bg-indigo-50/40"
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleRowActive(rowId, !(row._active !== false))
                            }
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-200/70 text-slate-500 hover:bg-slate-300"
                            }`}
                          >
                            {isActive ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Sim</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Não</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => onOpenPointHighlight(row)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                              hl
                                ? "bg-white border-amber-400 text-slate-900 shadow-2xs"
                                : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-amber-50 hover:border-amber-300"
                            }`}
                          >
                            {hl ? (
                              <>
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: hl.color }}
                                />
                                <span className="truncate max-w-[100px]">
                                  {hl.customLabel || "Destacado"}
                                </span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>Destacar</span>
                              </>
                            )}
                          </button>
                        </td>

                        {columnsMeta.map((col) => {
                          const isEditing =
                            editingCell?.rowId === rowId &&
                            editingCell?.col === col.name;
                          const cellVal = row[col.name] ?? "";

                          // Render cell value according to column's own dtype (never force R$ on IDs!)
                          let displayVal = "";
                          if (cellVal !== "" && cellVal !== null) {
                            if (col.dtype === "id") {
                              // Strip trailing .0 if stored as float in DuckDB
                              displayVal = String(cellVal).replace(/\.0$/, "");
                            } else if (col.dtype === "number") {
                              const useChartCurrency =
                                col.name === chartConfig.yColumn &&
                                chartConfig.valueFormat === "currency_brl";
                              displayVal = formatMetricValue(
                                cellVal,
                                useChartCurrency ? "currency_brl" : "number"
                              );
                            } else {
                              displayVal = String(cellVal);
                            }
                          }

                          return (
                            <td
                              key={col.name}
                              className="py-2 px-3 font-medium"
                              onDoubleClick={() =>
                                setEditingCell({
                                  rowId,
                                  col: col.name,
                                  val: String(cellVal).replace(/\.0$/, ""),
                                })
                              }
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingCell.val}
                                  onChange={(e) =>
                                    setEditingCell({
                                      ...editingCell,
                                      val: e.target.value,
                                    })
                                  }
                                  onBlur={commitCellEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitCellEdit();
                                    if (e.key === "Escape")
                                      setEditingCell(null);
                                  }}
                                  className="w-full px-2 py-1 text-xs rounded border border-blue-500 bg-white text-slate-900 focus:outline-none"
                                />
                              ) : (
                                <div
                                  className="cursor-pointer rounded px-1.5 py-0.5 hover:bg-slate-200/60 min-h-[22px] flex items-center"
                                  title="Duplo clique para editar valor"
                                >
                                  {displayVal !== "" ? (
                                    <span
                                      className={
                                        col.dtype === "id"
                                          ? "font-mono text-[11px] text-slate-700"
                                          : ""
                                      }
                                    >
                                      {displayVal}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 italic text-[11px]">
                                      —
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteRow(rowId)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remover linha da base"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Summary Footer Row Respecting Free Column Types */}
              {rows.length > 0 && (
                <tfoot className="bg-slate-100 border-t-2 border-slate-200 text-[11px] font-bold text-slate-700 sticky bottom-0">
                  <tr>
                    <td
                      colSpan={3}
                      className="py-2 px-3 text-right uppercase text-slate-500"
                    >
                      Resumo ({activePlottedCount} ativos):
                    </td>
                    {columnsMeta.map((col) => {
                      const st = columnSummaries[col.name];
                      const useCurrency =
                        col.name === chartConfig.yColumn &&
                        chartConfig.valueFormat === "currency_brl";
                      const fmt = useCurrency ? "currency_brl" : "number";

                      return (
                        <td key={col.name} className="py-2 px-3">
                          {st?.kind === "number" ? (
                            <div className="flex flex-col">
                              <span>
                                Soma: {formatMetricValue(st.sum, fmt)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Média: {formatMetricValue(st.avg, fmt)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 font-medium">
                              {st?.distinctCount ?? 0} valores únicos
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Load More Rows Bar when Dataset is Large */}
          {rows.length > visibleRowLimit && (
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>
                Exibindo <strong>{visibleRowLimit}</strong> de{" "}
                <strong>{rows.length}</strong> linhas na tabela (todos os{" "}
                {activePlottedCount} registros ativos estão considerados no
                gráfico).
              </span>
              <button
                type="button"
                onClick={() => setVisibleRowLimit((prev) => prev + 250)}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
              >
                Mostrar +250 linhas
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
