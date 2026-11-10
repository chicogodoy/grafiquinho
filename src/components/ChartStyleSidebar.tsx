"use client";

import React, { useState } from "react";
import {
  Palette,
  Type,
  Sliders,
  Sparkles,
  Trash2,
  Edit3,
} from "lucide-react";
import {
  ChartConfig,
  ColumnMeta,
  PointHighlight,
  THEME_PRESETS,
  ThemePreset,
} from "@/types/chart";

interface ChartStyleSidebarProps {
  chartConfig: ChartConfig;
  columnsMeta?: ColumnMeta[];
  highlights: Record<string, PointHighlight>;
  rows: Record<string, any>[];
  onChangeConfig: (patch: Partial<ChartConfig>) => void;
  onEditHighlight: (row: Record<string, any>) => void;
  onRemoveHighlight: (key: string) => void;
}

export default function ChartStyleSidebar({
  chartConfig,
  columnsMeta = [],
  highlights,
  rows,
  onChangeConfig,
  onEditHighlight,
  onRemoveHighlight,
}: ChartStyleSidebarProps) {
  const [section, setSection] = useState<
    "theme" | "text" | "geometry" | "highlights"
  >("theme");

  const applyThemePreset = (preset: ThemePreset) => {
    onChangeConfig({
      theme: preset.id,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
      gridColor: preset.gridColor,
    });
  };

  const highlightEntries = Object.values(highlights || {});

  return (
    <aside className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Configurações Visuais
          </span>
        </div>
        <span className="text-[11px] text-slate-400">Salvo no DuckDB</span>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold">
        <button
          type="button"
          onClick={() => setSection("theme")}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition-colors ${
            section === "theme"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Cores</span>
        </button>

        <button
          type="button"
          onClick={() => setSection("geometry")}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition-colors ${
            section === "geometry"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Gráfico</span>
        </button>

        <button
          type="button"
          onClick={() => setSection("text")}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition-colors ${
            section === "text"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Rótulos</span>
        </button>

        <button
          type="button"
          onClick={() => setSection("highlights")}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition-colors relative ${
            section === "highlights"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Destaques ({highlightEntries.length})</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 text-xs flex-1 overflow-y-auto max-h-[640px]">
        {/* SECTION 1: THEME & COLORS */}
        {section === "theme" && (
          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-2">
                Temas Visuais Prontos
              </label>
              <div className="space-y-1.5">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyThemePreset(preset)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      chartConfig.theme === preset.id
                        ? "border-blue-600 ring-1 ring-blue-500 bg-blue-50/30"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {preset.description}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300"
                        style={{ backgroundColor: preset.backgroundColor }}
                      />
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.primaryColor }}
                      />
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.textColor }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="font-semibold text-slate-700">
                Personalização de Cores
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Linha / Área Principal</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500">
                    {chartConfig.primaryColor}
                  </span>
                  <input
                    type="color"
                    value={chartConfig.primaryColor}
                    onChange={(e) =>
                      onChangeConfig({
                        primaryColor: e.target.value,
                        theme: "custom",
                      })
                    }
                    className="w-7 h-7 rounded cursor-pointer border border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-semibold">
                    Meta / Comparação no Gráfico
                  </span>
                  {chartConfig.secondaryYColumn && (
                    <button
                      type="button"
                      onClick={() => onChangeConfig({ secondaryYColumn: "" })}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors cursor-pointer"
                    >
                      ✕ Remover Meta
                    </button>
                  )}
                </div>

                <select
                  value={chartConfig.secondaryYColumn || ""}
                  onChange={(e) =>
                    onChangeConfig({ secondaryYColumn: e.target.value })
                  }
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                >
                  <option value="">Sem Meta (Não plotar)</option>
                  {columnsMeta.map((c) => (
                    <option key={c.name} value={c.name}>
                      Meta a partir de: {c.label}
                    </option>
                  ))}
                </select>

                {chartConfig.secondaryYColumn && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-600">Cor da Meta</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-500">
                        {chartConfig.secondaryColor}
                      </span>
                      <input
                        type="color"
                        value={chartConfig.secondaryColor}
                        onChange={(e) =>
                          onChangeConfig({
                            secondaryColor: e.target.value,
                            theme: "custom",
                          })
                        }
                        className="w-7 h-7 rounded cursor-pointer border border-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Fundo do Relatório</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500">
                    {chartConfig.backgroundColor}
                  </span>
                  <input
                    type="color"
                    value={chartConfig.backgroundColor}
                    onChange={(e) =>
                      onChangeConfig({
                        backgroundColor: e.target.value,
                        theme: "custom",
                      })
                    }
                    className="w-7 h-7 rounded cursor-pointer border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Cor do Texto e Eixos</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500">
                    {chartConfig.textColor}
                  </span>
                  <input
                    type="color"
                    value={chartConfig.textColor}
                    onChange={(e) =>
                      onChangeConfig({
                        textColor: e.target.value,
                        theme: "custom",
                      })
                    }
                    className="w-7 h-7 rounded cursor-pointer border border-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: CHART GEOMETRY & STYLE */}
        {section === "geometry" && (
          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Tipo de Gráfico
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeConfig({ chartType: "area" })}
                  className={`py-2 px-3 rounded-xl border font-semibold transition-all ${
                    chartConfig.chartType === "area"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Área c/ Gradiente
                </button>
                <button
                  type="button"
                  onClick={() => onChangeConfig({ chartType: "line" })}
                  className={`py-2 px-3 rounded-xl border font-semibold transition-all ${
                    chartConfig.chartType === "line"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Linha Pura
                </button>
                <button
                  type="button"
                  onClick={() => onChangeConfig({ chartType: "bar" })}
                  className={`py-2 px-3 rounded-xl border font-semibold transition-all ${
                    chartConfig.chartType === "bar"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Barras Verticais
                </button>
                <button
                  type="button"
                  onClick={() => onChangeConfig({ chartType: "bar_horizontal" })}
                  className={`py-2 px-3 rounded-xl border font-semibold transition-all ${
                    chartConfig.chartType === "bar_horizontal"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Barras Horizontais
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-700">
                  Coluna de Meta / Comparação
                </label>
                {chartConfig.secondaryYColumn && (
                  <button
                    type="button"
                    onClick={() => onChangeConfig({ secondaryYColumn: "" })}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer"
                  >
                    ✕ Remover Meta
                  </button>
                )}
              </div>
              <select
                value={chartConfig.secondaryYColumn || ""}
                onChange={(e) =>
                  onChangeConfig({ secondaryYColumn: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
              >
                <option value="">Sem Meta (Não plotar no gráfico)</option>
                {columnsMeta.map((c) => (
                  <option key={c.name} value={c.name}>
                    Usar campo: {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Análise Proporcional / Escala
              </label>
              <select
                value={chartConfig.valueMode || "absolute"}
                onChange={(e) =>
                  onChangeConfig({
                    valueMode: e.target.value as ChartConfig["valueMode"],
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
              >
                <option value="absolute">Valor Absoluto</option>
                <option value="percent_of_total">
                  Proporção do Total (% de Participação)
                </option>
                <option value="both_label">
                  Valor Absoluto + % de Participação no Rótulo
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Ordenação das Categorias / Barras
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: "original", label: "Ordem da Base" },
                    { id: "value_desc", label: "Maior → Menor" },
                    { id: "value_asc", label: "Menor → Maior" },
                    { id: "alpha", label: "Alfabética (A→Z)" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeConfig({ categorySort: item.id })}
                    className={`py-1.5 px-2 rounded-lg border font-medium ${
                      (chartConfig.categorySort || "original") === item.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {(chartConfig.chartType === "line" ||
              chartConfig.chartType === "area") && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Traçado da Curva
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: "smooth", label: "Suave" },
                        { id: "linear", label: "Reto" },
                        { id: "step", label: "Degrau" },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChangeConfig({ curveType: item.id })}
                        className={`py-1.5 px-2 rounded-lg border font-medium ${
                          chartConfig.curveType === item.id
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-slate-700">
                      Espessura da Linha
                    </span>
                    <span className="font-bold text-slate-800">
                      {chartConfig.lineWidth} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={chartConfig.lineWidth}
                    onChange={(e) =>
                      onChangeConfig({ lineWidth: Number(e.target.value) })
                    }
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-slate-700">
                      Tamanho Padrão dos Pontos
                    </span>
                    <span className="font-bold text-slate-800">
                      {chartConfig.defaultPointSize} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={12}
                    value={chartConfig.defaultPointSize}
                    onChange={(e) =>
                      onChangeConfig({
                        defaultPointSize: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-600"
                  />
                </div>
              </>
            )}

            {chartConfig.chartType === "area" && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-slate-700">
                    Intensidade do Sombreamento
                  </span>
                  <span className="font-bold text-slate-800">
                    {Math.round(chartConfig.areaOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.6}
                  step={0.05}
                  value={chartConfig.areaOpacity}
                  onChange={(e) =>
                    onChangeConfig({ areaOpacity: Number(e.target.value) })
                  }
                  className="w-full accent-blue-600"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Proporção do Card (Exportação PNG)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["16:9", "4:3", "1:1"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => onChangeConfig({ aspectRatio: ratio })}
                    className={`py-1.5 px-2 rounded-lg border font-semibold ${
                      chartConfig.aspectRatio === ratio
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 font-medium">
                  Mostrar linhas de grade
                </span>
                <input
                  type="checkbox"
                  checked={chartConfig.showGrid}
                  onChange={(e) =>
                    onChangeConfig({ showGrid: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 font-medium">
                  Mostrar legenda e KPIs no topo
                </span>
                <input
                  type="checkbox"
                  checked={chartConfig.showLegend}
                  onChange={(e) =>
                    onChangeConfig({ showLegend: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 font-medium">
                  Usar Title Case nas categorias e legendas
                </span>
                <input
                  type="checkbox"
                  checked={chartConfig.useTitleCase !== false}
                  onChange={(e) =>
                    onChangeConfig({ useTitleCase: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>
            </div>
          </div>
        )}

        {/* SECTION 3: TEXTS, LABELS & FORMATTING */}
        {section === "text" && (
          <div className="space-y-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Título do Relatório
              </label>
              <input
                type="text"
                value={chartConfig.title}
                onChange={(e) => onChangeConfig({ title: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Subtítulo / Contexto Executivo
              </label>
              <input
                type="text"
                value={chartConfig.subtitle}
                onChange={(e) => onChangeConfig({ subtitle: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rodapé / Fonte dos Dados
              </label>
              <input
                type="text"
                value={chartConfig.footer}
                onChange={(e) => onChangeConfig({ footer: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1">
                Exibição de Rótulos sobre os Pontos
              </label>
              <select
                value={chartConfig.showDataLabels}
                onChange={(e) =>
                  onChangeConfig({
                    showDataLabels: e.target.value as ChartConfig["showDataLabels"],
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="highlights_only">
                  Apenas nos Pontos Destacados (Recomendado)
                </option>
                <option value="all">Em Todos os Pontos</option>
                <option value="none">Ocultar Rótulos</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Formatação dos Valores (Eixo Y)
              </label>
              <select
                value={chartConfig.valueFormat}
                onChange={(e) =>
                  onChangeConfig({
                    valueFormat: e.target.value as ChartConfig["valueFormat"],
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="number">Número Padrão (1.234)</option>
                <option value="raw">Valor Bruto / Exato (1234)</option>
                <option value="compact">Compacto (1,2 mil / 1,5 mi)</option>
                <option value="percent">Percentual (14,5%)</option>
                <option value="currency_brl">Moeda Real (R$ 1.234)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Formatação de Datas (Eixo X)
              </label>
              <select
                value={chartConfig.dateFormat}
                onChange={(e) =>
                  onChangeConfig({
                    dateFormat: e.target.value as ChartConfig["dateFormat"],
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="mmm_yy">Mês/Ano (Jan/26, Fev/26)</option>
                <option value="dd_mm">Dia/Mês (15/01)</option>
                <option value="dd_mm_yyyy">Data BR (15/01/2026)</option>
                <option value="raw">Valor Original da Coluna</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <div className="font-semibold text-slate-800">
                    Formatação Title Case (Categorias e Legendas)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Padroniza iniciais maiúsculas em categorias e séries
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={chartConfig.useTitleCase !== false}
                  onChange={(e) =>
                    onChangeConfig({ useTitleCase: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 shrink-0"
                />
              </label>
            </div>
          </div>
        )}

        {/* SECTION 4: INDIVIDUAL POINT HIGHLIGHTS MANAGER */}
        {section === "highlights" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed">
              <strong>Dica:</strong> Clique diretamente em qualquer bolinha no gráfico ao lado (ou no botão <em>Destacar</em> na tabela) para personalizar a cor, tamanho e balão de texto daquele ponto específico!
            </div>

            {highlightEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Nenhum ponto destacado ainda. Clique em um ponto no gráfico para criar o primeiro!
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(highlights || {}).map(([hlKey, hl]) => {
                  const rowObj = rows.find(
                    (r) =>
                      String(r._row_id) === hlKey ||
                      String(r[chartConfig.xColumn]) === hlKey
                  );
                  const xLabel =
                    hl.pointKey ||
                    (rowObj
                      ? String(rowObj[chartConfig.xColumn] ?? `#${hl.rowId}`)
                      : `${hlKey}`);

                  return (
                    <div
                      key={hlKey}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: hl.color }}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">
                            {hl.customLabel || "Ponto Destacado"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Eixo X: {xLabel} • Tam: {hl.size}px
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {rowObj && (
                          <button
                            type="button"
                            onClick={() => onEditHighlight(rowObj)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-white"
                            title="Editar destaque"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveHighlight(hlKey)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white"
                          title="Remover destaque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

