"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Upload,
  ClipboardPaste,
  PlusCircle,
  Database,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Table2,
  Eye,
  Lock,
  Trash2,
} from "lucide-react";
import { ColumnMeta, PointHighlight, ProjectMeta } from "@/types/chart";

interface DataIngestionPanelProps {
  projects: ProjectMeta[];
  activeProject: ProjectMeta | null;
  totalRows: number;
  filteredRows: number;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
  onUploadCsv: (file: File, name?: string) => Promise<void>;
  onCopyPaste: (name: string, rawText: string, hasHeader: boolean) => Promise<void>;
  onCreateManualDataset: (name: string, rows: Record<string, any>[]) => Promise<void>;
  onAddSingleRow: (
    values: Record<string, any>,
    highlight?: PointHighlight
  ) => Promise<void>;
  onJumpToPreview: () => void;
  isLoading: boolean;
}

const SAMPLE_PASTE_TEXT = `Data\tReceita\tMeta\tRótulo
2026-01-10\t95000\t90000\tInício do Ano
2026-02-10\t112000\t95000\tCampanha Verão
2026-03-10\t108500\t100000\t
2026-04-10\t139000\t110000\tNovo Produto
2026-05-10\t164200\t120000\tRecorde Semestral
2026-06-10\t158000\t130000\t`;

function parsePreviewGrid(rawText: string, hasHeader: boolean) {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] };

  const sample = lines.slice(0, 5).join("\n");
  let delimiter = ",";
  if (sample.includes("\t")) delimiter = "\t";
  else if ((sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length) {
    delimiter = ";";
  }

  const parsed = lines.map((line) => line.split(delimiter).map((c) => c.trim()));
  const maxCols = Math.max(...parsed.map((r) => r.length));
  const normalized = parsed.map((r) => {
    const copy = [...r];
    while (copy.length < maxCols) copy.push("");
    return copy;
  });

  if (hasHeader && normalized.length > 1) {
    return {
      headers: normalized[0].map((h, i) => h || `Coluna ${i + 1}`),
      rows: normalized.slice(1),
    };
  }
  return {
    headers: Array.from({ length: maxCols }, (_, i) => `Coluna ${i + 1}`),
    rows: normalized,
  };
}

export default function DataIngestionPanel({
  projects,
  activeProject,
  totalRows,
  filteredRows,
  onSelectProject,
  onDeleteProject,
  onUploadCsv,
  onCopyPaste,
  onCreateManualDataset,
  onAddSingleRow,
  onJumpToPreview,
  isLoading,
}: DataIngestionPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "manual_add" | "paste" | "csv" | "new_manual"
  >("manual_add");
  const [isExpanded, setIsExpanded] = useState(true);

  // Quick manual add to active dataset
  const [newRowValues, setNewRowValues] = useState<Record<string, string>>({});
  const [markAsHighlight, setMarkAsHighlight] = useState(false);
  const [highlightColor, setHighlightColor] = useState("#dc2626");
  const [highlightLabel, setHighlightLabel] = useState("");
  const [highlightSize, setHighlightSize] = useState(15);

  // Copy/paste state
  const [pasteName, setPasteName] = useState("Dados Colados");
  const [pasteText, setPasteText] = useState("");
  const [hasHeader, setHasHeader] = useState(true);

  // CSV state with local preview before confirming
  const [csvName, setCsvName] = useState("");
  const [pendingCsvFile, setPendingCsvFile] = useState<File | null>(null);
  const [csvPreviewText, setCsvPreviewText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New manual dataset from scratch
  const [manualTitle, setManualTitle] = useState("Minha Série Temporal");
  const [manualDraftRows, setManualDraftRows] = useState<
    Array<{ data: string; valor: string; rotulo: string }>
  >([
    { data: "2026-01-01", valor: "1200", rotulo: "Início" },
    { data: "2026-02-01", valor: "1850", rotulo: "" },
    { data: "2026-03-01", valor: "2400", rotulo: "Pico Q1" },
  ]);

  const columnsMeta: ColumnMeta[] = activeProject?.columns_meta || [];

  const pastePreview = useMemo(
    () => parsePreviewGrid(pasteText, hasHeader),
    [pasteText, hasHeader]
  );

  const csvPreview = useMemo(
    () => parsePreviewGrid(csvPreviewText, true),
    [csvPreviewText]
  );

  const handleQuickAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const payloadValues: Record<string, any> = {};
    columnsMeta.forEach((col) => {
      payloadValues[col.name] = newRowValues[col.name] ?? "";
    });

    const labelCol = activeProject.chart_config.labelColumn;
    if (labelCol && highlightLabel && !payloadValues[labelCol]) {
      payloadValues[labelCol] = highlightLabel;
    }

    let hl: PointHighlight | undefined = undefined;
    if (markAsHighlight) {
      hl = {
        rowId: 0,
        color: highlightColor,
        size: highlightSize,
        customLabel:
          highlightLabel ||
          (labelCol ? String(payloadValues[labelCol] || "") : "") ||
          "Destaque",
        showValue: true,
        badgeStyle: "solid",
      };
    }

    await onAddSingleRow(payloadValues, hl);
    setNewRowValues({});
    setHighlightLabel("");
    setMarkAsHighlight(false);
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;
    await onCopyPaste(pasteName || "Dados Colados", pasteText, hasHeader);
    setPasteText("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingCsvFile(file);
    if (!csvName) {
      setCsvName(file.name.replace(/\.[^.]+$/, ""));
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvPreviewText(String(ev.target?.result || ""));
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvUpload = async () => {
    if (!pendingCsvFile) return;
    await onUploadCsv(pendingCsvFile, csvName || undefined);
    setPendingCsvFile(null);
    setCsvPreviewText("");
    setCsvName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = manualDraftRows
      .filter((r) => r.data.trim() !== "" || r.valor.trim() !== "")
      .map((r) => ({
        data: r.data.trim(),
        valor: r.valor.trim(),
        rotulo: r.rotulo.trim(),
      }));
    if (valid.length === 0) return;
    await onCreateManualDataset(manualTitle || "Base Manual", valid);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Top Bar: Dataset Selector + Mode Tabs */}
      <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                1. Entrada de Dados (DuckDB Local)
              </span>
              {activeProject && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    activeProject.source_type === "demo"
                      ? "bg-slate-800 text-slate-300 border border-slate-700"
                      : "bg-emerald-950/90 text-emerald-300 border border-emerald-700/70"
                  }`}
                  title={
                    activeProject.source_type === "demo"
                      ? "Base de demonstração inicial"
                      : "Esta base é isolada e visível apenas neste navegador"
                  }
                >
                  <Lock className="w-2.5 h-2.5" />
                  {activeProject.source_type === "demo"
                    ? "Exemplo Inicial"
                    : "Privada neste navegador"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <label htmlFor="project-select" className="text-xs text-slate-300">
                Base ativa:
              </label>
              <select
                id="project-select"
                value={activeProject?.id || ""}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-slate-800 text-white text-sm font-medium rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.source_type === "demo" ? "DEMO" : "PRIVADA"})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={onJumpToPreview}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Ir para a tabela de pré-visualização e filtros da base"
              >
                <Table2 className="w-3.5 h-3.5" />
                Pré-visualizar Base ({filteredRows}/{totalRows} linhas)
              </button>

              {activeProject && activeProject.source_type !== "demo" && (
                <button
                  type="button"
                  onClick={() => onDeleteProject(activeProject.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/70 text-xs font-medium transition-colors cursor-pointer"
                  title="Excluir esta base permanentemente do servidor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Base
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ingestion Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab("manual_add");
              setIsExpanded(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "manual_add"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Inserir Ponto / Rótulo
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("paste");
              setIsExpanded(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "paste"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Copy / Paste
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("csv");
              setIsExpanded(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "csv"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("new_manual");
              setIsExpanded(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "new_manual"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-700/60"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Nova Base Manual
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-1 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
            title={isExpanded ? "Recolher painel" : "Expandir painel"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="p-5 bg-gradient-to-b from-slate-50/70 to-white">
          {/* TAB 1: Quick Manual Point & Highlight Insertion into Active Dataset */}
          {activeTab === "manual_add" && activeProject && (
            <form onSubmit={handleQuickAddRow} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Adicionar Ponto de Dado na Base Atual ({activeProject.name})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Insira uma nova data, valor e rótulo. Você já pode marcá-lo como um destaque colorido no gráfico.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {columnsMeta.map((col) => (
                  <div key={col.name}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {col.label}{" "}
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                        {col.dtype === "date"
                          ? "Data/X"
                          : col.dtype === "number"
                          ? "Número"
                          : "Texto"}
                      </span>
                    </label>
                    <input
                      type={col.dtype === "date" ? "date" : "text"}
                      placeholder={
                        col.dtype === "date"
                          ? "2026-12-31"
                          : col.dtype === "number"
                          ? "Ex: 250000"
                          : "Ex: Lançamento / Meta"
                      }
                      value={newRowValues[col.name] || ""}
                      onChange={(e) =>
                        setNewRowValues((prev) => ({
                          ...prev,
                          [col.name]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* Optional Instant Highlight Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200/80">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={markAsHighlight}
                      onChange={(e) => setMarkAsHighlight(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Destacar este ponto no gráfico
                    </span>
                  </label>

                  {markAsHighlight && (
                    <div className="flex flex-wrap items-center gap-3 bg-amber-50/80 border border-amber-200 px-3 py-1.5 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-600">Cor:</span>
                        <input
                          type="color"
                          value={highlightColor}
                          onChange={(e) => setHighlightColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-600">Tamanho:</span>
                        <input
                          type="number"
                          min={8}
                          max={26}
                          value={highlightSize}
                          onChange={(e) => setHighlightSize(Number(e.target.value))}
                          className="w-14 px-2 py-0.5 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-600">Rótulo do Destaque:</span>
                        <input
                          type="text"
                          placeholder="Ex: Recorde do Mês"
                          value={highlightLabel}
                          onChange={(e) => setHighlightLabel(e.target.value)}
                          className="w-44 px-2.5 py-1 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  Adicionar Ponto ao Gráfico
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Copy / Paste Tabular Data + Instant Preview */}
          {activeTab === "paste" && (
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Colar Dados (Excel, Google Sheets ou CSV em texto)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Copie células da sua planilha e cole abaixo. Veja a pré-visualização da tabela detectada ao lado antes de importar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPasteName("Campanha Semestral (Colado)");
                    setPasteText(SAMPLE_PASTE_TEXT);
                    setHasHeader(true);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                >
                  Preencher com exemplo de Copy/Paste
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nome do Relatório / Base
                    </label>
                    <input
                      type="text"
                      value={pasteName}
                      onChange={(e) => setPasteName(e.target.value)}
                      placeholder="Ex: Vendas Q1-Q2"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    />
                    <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasHeader}
                        onChange={(e) => setHasHeader(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-xs text-slate-700">
                        Primeira linha contém cabeçalho das colunas
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Texto Colado (Tabulação, `;` ou `,`)
                    </label>
                    <textarea
                      rows={5}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={`Data\tValor\tRótulo\n2026-01-01\t15000\tInício\n2026-02-01\t22400\tPico`}
                      className="w-full p-3 text-xs font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Instant Preview of Pasted Table */}
                <div className="lg:col-span-7 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      Pré-visualização dos Dados Colados ({pastePreview.rows.length} linhas)
                    </span>
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 overflow-auto max-h-52">
                    {pastePreview.rows.length === 0 ? (
                      <div className="h-44 flex items-center justify-center text-xs text-slate-400 p-4 text-center">
                        Cole os dados no campo ao lado (ou clique em &quot;Preencher com exemplo&quot;) para pré-visualizar as colunas e linhas aqui.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-200/80 text-slate-700 sticky top-0">
                          <tr>
                            <th className="py-1.5 px-2.5 w-10 text-center">#</th>
                            {pastePreview.headers.map((h, i) => (
                              <th key={i} className="py-1.5 px-2.5 font-bold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 bg-white">
                          {pastePreview.rows.slice(0, 20).map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono">
                                {rIdx + 1}
                              </td>
                              {r.map((cell, cIdx) => (
                                <td key={cIdx} className="py-1.5 px-2.5">
                                  {cell || <span className="text-slate-300">-</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || !pasteText.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Confirmar e Plotar no Gráfico
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CSV Upload + Instant Preview before confirming */}
          {activeTab === "csv" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Upload de Arquivo CSV / TSV com Pré-visualização
                </h3>
                <p className="text-xs text-slate-500">
                  Selecione um arquivo `.csv` para inspecionar suas colunas e linhas antes de carregar no gráfico.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-5 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Título da Base / Relatório
                    </label>
                    <input
                      type="text"
                      value={csvName}
                      onChange={(e) => setCsvName(e.target.value)}
                      placeholder="Ex: Relatório Financeiro CSV"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 transition-colors rounded-xl p-5 cursor-pointer">
                    <Upload className="w-6 h-6 text-blue-600 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-700">
                      {pendingCsvFile
                        ? `Arquivo selecionado: ${pendingCsvFile.name}`
                        : "Clique para selecionar um arquivo .CSV"}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Suporta separadores `;` ou `,`, datas BR e moedas R$
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* CSV Table Preview before importing */}
                <div className="lg:col-span-7 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      Pré-visualização do Arquivo CSV ({csvPreview.rows.length} linhas)
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-auto max-h-48">
                    {csvPreview.rows.length === 0 ? (
                      <div className="h-40 flex items-center justify-center text-xs text-slate-400 p-4 text-center">
                        Selecione um arquivo CSV ao lado (ex: `exemplo_vendas_2026.csv`) para pré-visualizar os dados aqui.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-200/80 text-slate-700 sticky top-0">
                          <tr>
                            <th className="py-1.5 px-2.5 w-10 text-center">#</th>
                            {csvPreview.headers.map((h, i) => (
                              <th key={i} className="py-1.5 px-2.5 font-bold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 bg-white">
                          {csvPreview.rows.slice(0, 20).map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono">
                                {rIdx + 1}
                              </td>
                              {r.map((cell, cIdx) => (
                                <td key={cIdx} className="py-1.5 px-2.5">
                                  {cell || <span className="text-slate-300">-</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {pendingCsvFile && (
                    <div className="flex justify-end mt-3">
                      <button
                        type="button"
                        onClick={handleConfirmCsvUpload}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        Importar CSV para o DuckDB e Plotar Gráfico
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Create New Manual Dataset from Scratch */}
          {activeTab === "new_manual" && (
            <form onSubmit={handleCreateManualSubmit} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Criar Nova Base Manual do Zero
                  </h3>
                  <p className="text-xs text-slate-500">
                    Monte rapidamente uma nova tabela de pontos com datas, valores e rótulos de destaque.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Nome da nova base"
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {manualDraftRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Data (ex: 2026-01-15 ou 15/01/2026)"
                        value={row.data}
                        onChange={(e) => {
                          const copy = [...manualDraftRows];
                          copy[idx].data = e.target.value;
                          setManualDraftRows(copy);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Valor (ex: 15400)"
                        value={row.valor}
                        onChange={(e) => {
                          const copy = [...manualDraftRows];
                          copy[idx].valor = e.target.value;
                          setManualDraftRows(copy);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Rótulo / Evento (opcional)"
                        value={row.rotulo}
                        onChange={(e) => {
                          const copy = [...manualDraftRows];
                          copy[idx].rotulo = e.target.value;
                          setManualDraftRows(copy);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setManualDraftRows(
                            manualDraftRows.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-xs text-slate-400 hover:text-red-600 px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() =>
                    setManualDraftRows([
                      ...manualDraftRows,
                      { data: "", valor: "", rotulo: "" },
                    ])
                  }
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  + Adicionar Linha
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Criar Base e Gerar Gráfico
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
