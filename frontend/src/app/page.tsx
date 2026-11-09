"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Sparkles, RefreshCw, Table2 } from "lucide-react";
import GrafiquinhoLogo from "@/components/GrafiquinhoLogo";
import {
  ChartConfig,
  ColumnDType,
  ColumnMeta,
  PointHighlight,
  ProjectMeta,
  QueryFilters,
} from "@/types/chart";
import {
  addProjectRow,
  createManualDataset,
  deleteProject,
  deleteProjectRow,
  fetchProjects,
  ingestCopyPasteDataset,
  queryProjectData,
  saveProjectState,
  updateProjectRow,
  uploadCsvDataset,
} from "@/lib/api";
import { extractGroupedXKey } from "@/lib/formatters";
import DataIngestionPanel from "@/components/DataIngestionPanel";
import DataPreviewTable from "@/components/DataPreviewTable";
import ChartStyleSidebar from "@/components/ChartStyleSidebar";
import ReportChartCanvas from "@/components/ReportChartCanvas";
import PointHighlightModal from "@/components/PointHighlightModal";

const DEFAULT_FILTERS: QueryFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  minVal: "",
  maxVal: "",
  onlyActive: false,
  onlyHighlighted: false,
  sortBy: "_row_id",
  sortDir: "asc",
};

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectMeta | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filteredRows, setFilteredRows] = useState(0);
  const [filters, setFilters] = useState<QueryFilters>(DEFAULT_FILTERS);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {}
  );
  const [excludedXGroups, setExcludedXGroups] = useState<string[]>([]);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedPointRow, setSelectedPointRow] = useState<Record<
    string,
    any
  > | null>(null);

  const loadProjectWithFilters = useCallback(
    async (
      projectId: string,
      currentFilters: QueryFilters,
      xCol?: string,
      yCol?: string
    ) => {
      try {
        setErrorMsg(null);
        const res = await queryProjectData(
          projectId,
          currentFilters,
          xCol,
          yCol
        );
        setActiveProject(res.project);
        setRows(res.rows);
        setTotalRows(res.total_rows);
        setFilteredRows(res.filtered_rows);
      } catch (err: any) {
        setErrorMsg(err.message || "Erro ao carregar dados do projeto");
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const list = await fetchProjects();
        setProjects(list);
        if (list.length > 0) {
          const first = list[0];
          await loadProjectWithFilters(
            first.id,
            DEFAULT_FILTERS,
            first.chart_config.xColumn,
            first.chart_config.yColumn
          );
        }
      } catch (err: any) {
        setErrorMsg(
          err.message ||
            "Não foi possível conectar à API FastAPI (http://localhost:8000)."
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadProjectWithFilters]);

  // Rows filtered by DuckDB query + per-column filters
  const tableFilteredRows = useMemo(() => {
    const activeColKeys = Object.keys(columnFilters).filter(
      (k) => columnFilters[k]?.trim() !== ""
    );
    if (activeColKeys.length === 0) return rows;

    return rows.filter((r) =>
      activeColKeys.every((colKey) => {
        const needle = columnFilters[colKey].trim().toLowerCase();
        const cellVal = String(r[colKey] ?? "").toLowerCase();
        return cellVal.includes(needle);
      })
    );
  }, [rows, columnFilters]);

  // Rows passed to the chart (also excluding toggled X group chips)
  const chartRows = useMemo(() => {
    if (!activeProject || excludedXGroups.length === 0)
      return tableFilteredRows;
    const xCol = activeProject.chart_config.xColumn;
    const xGrp = activeProject.chart_config.xGrouping || "raw";
    return tableFilteredRows.filter((r) => {
      const gk = extractGroupedXKey(r[xCol], xGrp);
      return !excludedXGroups.includes(gk);
    });
  }, [tableFilteredRows, activeProject, excludedXGroups]);

  const handleToggleExcludedXGroup = (groupKey: string) => {
    setExcludedXGroups((prev) =>
      prev.includes(groupKey)
        ? prev.filter((k) => k !== groupKey)
        : [...prev, groupKey]
    );
  };

  const handleJumpToPreview = () => {
    setIsPreviewExpanded(true);
    const el = document.getElementById("data-preview-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelectProject = async (projectId: string) => {
    setIsLoading(true);
    setFilters(DEFAULT_FILTERS);
    setColumnFilters({});
    setExcludedXGroups([]);
    await loadProjectWithFilters(projectId, DEFAULT_FILTERS);
    setIsLoading(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setIsLoading(true);
      await deleteProject(projectId);
      const list = await fetchProjects();
      setProjects(list);
      if (list.length > 0) {
        const first = list[0];
        setFilters(DEFAULT_FILTERS);
        setColumnFilters({});
        setExcludedXGroups([]);
        await loadProjectWithFilters(
          first.id,
          DEFAULT_FILTERS,
          first.chart_config.xColumn,
          first.chart_config.yColumn
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltersChange = async (nextFilters: QueryFilters) => {
    setFilters(nextFilters);
    if (!activeProject) return;
    await loadProjectWithFilters(
      activeProject.id,
      nextFilters,
      activeProject.chart_config.xColumn,
      activeProject.chart_config.yColumn
    );
  };

  const handleResetFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    setColumnFilters({});
    setExcludedXGroups([]);
    if (!activeProject) return;
    await loadProjectWithFilters(
      activeProject.id,
      DEFAULT_FILTERS,
      activeProject.chart_config.xColumn,
      activeProject.chart_config.yColumn
    );
  };

  const handleChangeColumnDType = async (
    colName: string,
    nextDType: ColumnDType
  ) => {
    if (!activeProject) return;
    const nextCols: ColumnMeta[] = activeProject.columns_meta.map((c) =>
      c.name === colName ? { ...c, dtype: nextDType } : c
    );
    setActiveProject({
      ...activeProject,
      columns_meta: nextCols,
    });
    try {
      await saveProjectState(activeProject.id, { columnsMeta: nextCols });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleChangeChartConfig = async (patch: Partial<ChartConfig>) => {
    if (!activeProject) return;
    if (patch.xColumn || patch.xGrouping) {
      setExcludedXGroups([]);
    }
    const nextConfig: ChartConfig = {
      ...activeProject.chart_config,
      ...patch,
    };
    const optimisticProject: ProjectMeta = {
      ...activeProject,
      chart_config: nextConfig,
    };
    setActiveProject(optimisticProject);

    try {
      await saveProjectState(activeProject.id, { chartConfig: nextConfig });
      if (patch.xColumn || patch.yColumn) {
        await loadProjectWithFilters(
          activeProject.id,
          filters,
          nextConfig.xColumn,
          nextConfig.yColumn
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveHighlight = async (
    key: string,
    highlight: PointHighlight
  ) => {
    if (!activeProject) return;
    const nextHighlights: Record<string, PointHighlight> = {
      ...(activeProject.highlights || {}),
      [key]: highlight,
    };
    setActiveProject({
      ...activeProject,
      highlights: nextHighlights,
    });
    try {
      await saveProjectState(activeProject.id, { highlights: nextHighlights });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRemoveHighlight = async (key: string) => {
    if (!activeProject) return;
    const nextHighlights = { ...(activeProject.highlights || {}) };
    delete nextHighlights[key];
    setActiveProject({
      ...activeProject,
      highlights: nextHighlights,
    });
    try {
      await saveProjectState(activeProject.id, { highlights: nextHighlights });
      if (filters.onlyHighlighted) {
        await loadProjectWithFilters(
          activeProject.id,
          filters,
          activeProject.chart_config.xColumn,
          activeProject.chart_config.yColumn
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUploadCsv = async (file: File, name?: string) => {
    try {
      setIsLoading(true);
      const created = await uploadCsvDataset(file, name);
      const list = await fetchProjects();
      setProjects(list);
      setFilters(DEFAULT_FILTERS);
      setColumnFilters({});
      setExcludedXGroups([]);
      setIsPreviewExpanded(true);
      await loadProjectWithFilters(
        created.id,
        DEFAULT_FILTERS,
        created.chart_config.xColumn,
        created.chart_config.yColumn
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPaste = async (
    name: string,
    rawText: string,
    hasHeader: boolean
  ) => {
    try {
      setIsLoading(true);
      const created = await ingestCopyPasteDataset(name, rawText, hasHeader);
      const list = await fetchProjects();
      setProjects(list);
      setFilters(DEFAULT_FILTERS);
      setColumnFilters({});
      setExcludedXGroups([]);
      setIsPreviewExpanded(true);
      await loadProjectWithFilters(
        created.id,
        DEFAULT_FILTERS,
        created.chart_config.xColumn,
        created.chart_config.yColumn
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateManualDataset = async (
    name: string,
    manualRows: Record<string, any>[]
  ) => {
    try {
      setIsLoading(true);
      const created = await createManualDataset(name, manualRows);
      const list = await fetchProjects();
      setProjects(list);
      setFilters(DEFAULT_FILTERS);
      setColumnFilters({});
      setExcludedXGroups([]);
      setIsPreviewExpanded(true);
      await loadProjectWithFilters(
        created.id,
        DEFAULT_FILTERS,
        created.chart_config.xColumn,
        created.chart_config.yColumn
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSingleRow = async (
    values: Record<string, any>,
    highlight?: PointHighlight
  ) => {
    if (!activeProject) return;
    try {
      setIsLoading(true);
      await addProjectRow(activeProject.id, values, highlight);
      await loadProjectWithFilters(
        activeProject.id,
        filters,
        activeProject.chart_config.xColumn,
        activeProject.chart_config.yColumn
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRowActive = async (rowId: number, active: boolean) => {
    if (!activeProject) return;
    setRows((prev) =>
      prev.map((r) =>
        Number(r._row_id) === rowId ? { ...r, _active: active } : r
      )
    );
    try {
      await updateProjectRow(activeProject.id, rowId, { active });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateCellValue = async (
    rowId: number,
    colName: string,
    value: any
  ) => {
    if (!activeProject) return;
    try {
      await updateProjectRow(activeProject.id, rowId, {
        values: { [colName]: value },
      });
      await loadProjectWithFilters(
        activeProject.id,
        filters,
        activeProject.chart_config.xColumn,
        activeProject.chart_config.yColumn
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteRow = async (rowId: number) => {
    if (!activeProject) return;
    try {
      await deleteProjectRow(activeProject.id, rowId);
      await loadProjectWithFilters(
        activeProject.id,
        filters,
        activeProject.chart_config.xColumn,
        activeProject.chart_config.yColumn
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const selectedPointKey = selectedPointRow
    ? selectedPointRow._point_key
      ? String(selectedPointRow._point_key)
      : String(selectedPointRow._row_id)
    : "";

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/80">
      {/* Top Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GrafiquinhoLogo size={38} className="shadow-xs rounded-xl shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">
                  Grafiquinho
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Estúdio de Relatórios & Destaques
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ingestão via CSV, Copy/Paste ou Manual • Tipagem Livre • Exportação em PNG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleJumpToPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <Table2 className="w-3.5 h-3.5" />
              Ver Pré-visualização da Base ({chartRows.length}/{totalRows})
            </button>

            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sincronizando DuckDB...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Vertical Flow Container */}
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5 flex-1">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* STEP 1: DATA INGESTION */}
        <DataIngestionPanel
          projects={projects}
          activeProject={activeProject}
          totalRows={totalRows}
          filteredRows={chartRows.length}
          onSelectProject={handleSelectProject}
          onDeleteProject={handleDeleteProject}
          onUploadCsv={handleUploadCsv}
          onCopyPaste={handleCopyPaste}
          onCreateManualDataset={handleCreateManualDataset}
          onAddSingleRow={handleAddSingleRow}
          onJumpToPreview={handleJumpToPreview}
          isLoading={isLoading}
        />

        {/* STEP 2: DATA PREVIEW, FREE TYPING & REAL-TIME FILTERS */}
        {activeProject && (
          <DataPreviewTable
            columnsMeta={activeProject.columns_meta}
            rows={tableFilteredRows}
            totalRows={totalRows}
            filteredRows={tableFilteredRows.length}
            chartConfig={activeProject.chart_config}
            highlights={activeProject.highlights || {}}
            filters={filters}
            columnFilters={columnFilters}
            excludedXGroups={excludedXGroups}
            onToggleExcludedXGroup={handleToggleExcludedXGroup}
            onChangeColumnFilters={setColumnFilters}
            onChangeColumnDType={handleChangeColumnDType}
            isExpanded={isPreviewExpanded}
            onToggleExpand={setIsPreviewExpanded}
            onChangeFilters={handleFiltersChange}
            onResetFilters={handleResetFilters}
            onChangeChartConfig={handleChangeChartConfig}
            onToggleRowActive={handleToggleRowActive}
            onUpdateCellValue={handleUpdateCellValue}
            onDeleteRow={handleDeleteRow}
            onOpenPointHighlight={(row) => setSelectedPointRow(row)}
          />
        )}

        {/* STEP 3: STYLING SIDEBAR + REPORT CHART CANVAS & PNG EXPORT */}
        {activeProject && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-4 xl:col-span-3">
              <ChartStyleSidebar
                chartConfig={activeProject.chart_config}
                highlights={activeProject.highlights || {}}
                rows={chartRows}
                onChangeConfig={handleChangeChartConfig}
                onEditHighlight={(row) => setSelectedPointRow(row)}
                onRemoveHighlight={handleRemoveHighlight}
              />
            </div>

            <div className="lg:col-span-8 xl:col-span-9">
              <ReportChartCanvas
                chartConfig={activeProject.chart_config}
                columnsMeta={activeProject.columns_meta}
                rows={chartRows}
                highlights={activeProject.highlights || {}}
                onSelectPoint={(row) => setSelectedPointRow(row)}
                onChangeConfig={handleChangeChartConfig}
              />
            </div>
          </section>
        )}
      </main>

      {/* Point Highlight Editor Modal */}
      {activeProject && selectedPointRow && (
        <PointHighlightModal
          row={selectedPointRow}
          chartConfig={activeProject.chart_config}
          existingHighlight={
            (activeProject.highlights || {})[selectedPointKey] ||
            (activeProject.highlights || {})[String(selectedPointRow._row_id)]
          }
          onClose={() => setSelectedPointRow(null)}
          onSaveHighlight={handleSaveHighlight}
          onRemoveHighlight={handleRemoveHighlight}
        />
      )}
    </div>
  );
}
