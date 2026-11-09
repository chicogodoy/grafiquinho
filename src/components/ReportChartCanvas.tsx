"use client";

import React, { useRef, useState, useMemo } from "react";
import { toPng } from "html-to-image";
import {
  Download,
  Sparkles,
  MousePointerClick,
  CheckCircle2,
} from "lucide-react";
import GrafiquinhoLogo from "@/components/GrafiquinhoLogo";
import { ChartConfig, ColumnMeta, PointHighlight } from "@/types/chart";
import {
  extractGroupedXKey,
  formatDateAxis,
  formatMetricValue,
} from "@/lib/formatters";

interface ReportChartCanvasProps {
  chartConfig: ChartConfig;
  columnsMeta: ColumnMeta[];
  rows: Record<string, any>[];
  highlights: Record<string, PointHighlight>;
  onSelectPoint: (row: Record<string, any>) => void;
}

interface PlottedPoint {
  row: Record<string, any>;
  rowId: number;
  pointKey: string;
  index: number;
  x: number;
  y: number;
  secondaryY: number | null;
  rawX: any;
  rawY: number;
  rawSecondaryY: number | null;
  formattedX: string;
  formattedY: string;
  rowLabel: string;
  highlight?: PointHighlight;
}

function buildLinePath(
  pts: Array<{ x: number; y: number }>,
  curveType: ChartConfig["curveType"]
): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  if (curveType === "linear") {
    return pts
      .map(
        (p, idx) =>
          `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      )
      .join(" ");
  }

  if (curveType === "step") {
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const midX = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
      d += ` L ${midX} ${pts[i - 1].y.toFixed(1)} L ${midX} ${pts[i].y.toFixed(1)} L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
    return d;
  }

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cpx1 = p0.x + (p1.x - p0.x) * 0.42;
    const cpy1 = p0.y;
    const cpx2 = p0.x + (p1.x - p0.x) * 0.58;
    const cpy2 = p1.y;
    d += ` C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

const AGG_LABELS: Record<string, string> = {
  none: "",
  count: "Contagem de Registros",
  count_distinct: "Contagem Única",
  sum: "Soma",
  avg: "Média",
};

export default function ReportChartCanvas({
  chartConfig,
  columnsMeta,
  rows,
  highlights,
  onSelectPoint,
}: ReportChartCanvasProps) {
  const reportCardRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const yColMeta = columnsMeta.find((c) => c.name === chartConfig.yColumn);

  // Determine effective aggregation mode:
  // If user selected 'none' but the Y column is non-numeric (or ID) or there are >200 rows,
  // allow grouping or counting if values aren't numbers.
  const effectiveAgg = useMemo(() => {
    const explicit = chartConfig.yAggregation || "none";
    if (explicit !== "none") return explicit;
    if (yColMeta && (yColMeta.dtype === "string" || yColMeta.dtype === "id")) {
      return "count";
    }
    if ((chartConfig.xGrouping || "raw") !== "raw") {
      return "sum";
    }
    return "none";
  }, [chartConfig.yAggregation, chartConfig.xGrouping, yColMeta]);

  // Build series items (either row-by-row or aggregated by X group)
  const seriesItems = useMemo(() => {
    const active = rows.filter((r) => r._active !== false);
    if (active.length === 0) return [];

    if (effectiveAgg === "none") {
      const valid = active.filter((r) => {
        const v = r[chartConfig.yColumn];
        return (
          v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v))
        );
      });

      return valid.slice(0, 250).map((row) => {
        const rid = Number(row._row_id);
        const rawX = row[chartConfig.xColumn];
        const rawY = Number(row[chartConfig.yColumn]);
        const secCol = chartConfig.secondaryYColumn;
        const rawSecY =
          secCol &&
          row[secCol] !== null &&
          row[secCol] !== undefined &&
          row[secCol] !== "" &&
          !Number.isNaN(Number(row[secCol]))
            ? Number(row[secCol])
            : null;
        const rowLabel = chartConfig.labelColumn
          ? String(row[chartConfig.labelColumn] || "").trim()
          : "";

        return {
          row,
          rowId: rid,
          pointKey: String(rid),
          rawX,
          rawY,
          rawSecondaryY: rawSecY,
          rowLabel,
        };
      });
    }

    // Aggregated by X (count, count_distinct, sum, avg)
    const groups = new Map<
      string,
      {
        firstRow: Record<string, any>;
        count: number;
        distinctSet: Set<string>;
        sumY: number;
        numCountY: number;
        sumSecY: number;
        numCountSecY: number;
        labels: string[];
      }
    >();

    const secCol = chartConfig.secondaryYColumn;
    const lblCol = chartConfig.labelColumn;

    active.forEach((row) => {
      const gKey = extractGroupedXKey(
        row[chartConfig.xColumn],
        chartConfig.xGrouping || "raw"
      );
      let entry = groups.get(gKey);
      if (!entry) {
        entry = {
          firstRow: row,
          count: 0,
          distinctSet: new Set<string>(),
          sumY: 0,
          numCountY: 0,
          sumSecY: 0,
          numCountSecY: 0,
          labels: [],
        };
        groups.set(gKey, entry);
      }

      entry.count += 1;
      const yVal = row[chartConfig.yColumn];
      if (yVal !== null && yVal !== undefined && String(yVal).trim() !== "") {
        entry.distinctSet.add(String(yVal));
        const numY = Number(yVal);
        if (!Number.isNaN(numY)) {
          entry.sumY += numY;
          entry.numCountY += 1;
        }
      }

      if (secCol) {
        const sVal = row[secCol];
        if (sVal !== null && sVal !== undefined && sVal !== "") {
          const numS = Number(sVal);
          if (!Number.isNaN(numS)) {
            entry.sumSecY += numS;
            entry.numCountSecY += 1;
          }
        }
      }

      if (lblCol) {
        const lVal = String(row[lblCol] || "").trim();
        if (lVal && entry.labels.length < 2 && !entry.labels.includes(lVal)) {
          entry.labels.push(lVal);
        }
      }
    });

    const entries = Array.from(groups.entries());
    // Sort chronologically if keys look like ISO dates (YYYY-MM...)
    if (
      entries.length > 1 &&
      entries.every(([k]) => /^\d{4}-\d{2}/.test(k))
    ) {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }

    return entries.slice(0, 200).map(([gKey, g], idx) => {
      let computedY = 0;
      if (effectiveAgg === "count") computedY = g.count;
      else if (effectiveAgg === "count_distinct")
        computedY = g.distinctSet.size;
      else if (effectiveAgg === "sum") computedY = g.sumY;
      else if (effectiveAgg === "avg")
        computedY = g.numCountY > 0 ? g.sumY / g.numCountY : 0;

      const computedSecY =
        g.numCountSecY > 0
          ? effectiveAgg === "avg"
            ? g.sumSecY / g.numCountSecY
            : g.sumSecY
          : null;

      const syntheticRow = {
        ...g.firstRow,
        _row_id: Number(g.firstRow._row_id) || idx + 1,
        _point_key: gKey,
        [chartConfig.xColumn]: gKey,
        [chartConfig.yColumn]: computedY,
      };

      return {
        row: syntheticRow,
        rowId: Number(g.firstRow._row_id) || idx + 1,
        pointKey: gKey,
        rawX: gKey,
        rawY: computedY,
        rawSecondaryY: computedSecY,
        rowLabel: g.labels.join(" / "),
      };
    });
  }, [
    rows,
    effectiveAgg,
    chartConfig.xColumn,
    chartConfig.xGrouping,
    chartConfig.yColumn,
    chartConfig.secondaryYColumn,
    chartConfig.labelColumn,
  ]);

  const svgWidth = 960;
  const svgHeight =
    chartConfig.aspectRatio === "1:1"
      ? 620
      : chartConfig.aspectRatio === "4:3"
      ? 520
      : 430;

  const padLeft = 88;
  const padRight = 46;
  const padTop = 68;
  const padBottom = 56;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  // Format for Y values: if counting records, default to plain number instead of currency
  const effectiveValueFormat =
    effectiveAgg === "count" || effectiveAgg === "count_distinct"
      ? chartConfig.valueFormat === "currency_brl"
        ? "number"
        : chartConfig.valueFormat
      : chartConfig.valueFormat;

  const { plottedPoints, yTicks, minY, maxY, stats } = useMemo(() => {
    if (seriesItems.length === 0) {
      return {
        plottedPoints: [] as PlottedPoint[],
        yTicks: [] as number[],
        minY: 0,
        maxY: 100,
        stats: { total: 0, avg: 0, max: 0, growthPct: null as number | null },
      };
    }

    const yValues = seriesItems.map((item) => item.rawY);
    const secValues = seriesItems
      .map((item) => item.rawSecondaryY)
      .filter((v): v is number => v !== null && !Number.isNaN(v));

    const allNums = [...yValues, ...secValues];
    const rawMin = Math.min(...allNums);
    const rawMax = Math.max(...allNums);
    const span = rawMax - rawMin || Math.abs(rawMax) * 0.2 || 10;

    const domainMin =
      rawMin >= 0 ? Math.max(0, rawMin - span * 0.15) : rawMin - span * 0.15;
    const domainMax = rawMax + span * 0.22;
    const domainSpan = domainMax - domainMin || 1;

    const tickCount = 5;
    const ticks: number[] = [];
    for (let i = 0; i < tickCount; i++) {
      ticks.push(domainMin + (domainSpan * i) / (tickCount - 1));
    }

    const pts: PlottedPoint[] = seriesItems.map((item, idx) => {
      const xRatio =
        seriesItems.length === 1 ? 0.5 : idx / (seriesItems.length - 1);
      const x = padLeft + xRatio * plotW;
      const y =
        padTop + plotH - ((item.rawY - domainMin) / domainSpan) * plotH;
      const secondaryY =
        item.rawSecondaryY !== null
          ? padTop +
            plotH -
            ((item.rawSecondaryY - domainMin) / domainSpan) * plotH
          : null;

      const hl =
        highlights[item.pointKey] || highlights[String(item.rowId)];

      return {
        row: item.row,
        rowId: item.rowId,
        pointKey: item.pointKey,
        index: idx,
        x,
        y,
        secondaryY,
        rawX: item.rawX,
        rawY: item.rawY,
        rawSecondaryY: item.rawSecondaryY,
        formattedX: formatDateAxis(item.rawX, chartConfig.dateFormat),
        formattedY: formatMetricValue(item.rawY, effectiveValueFormat),
        rowLabel: item.rowLabel,
        highlight: hl,
      };
    });

    const total = yValues.reduce((acc, v) => acc + v, 0);
    const avg = total / yValues.length;
    const max = Math.max(...yValues);
    const firstVal = yValues[0];
    const lastVal = yValues[yValues.length - 1];
    const growthPct =
      yValues.length > 1 && firstVal !== 0
        ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100
        : null;

    return {
      plottedPoints: pts,
      yTicks: ticks,
      minY: domainMin,
      maxY: domainMax,
      stats: { total, avg, max, growthPct },
    };
  }, [
    seriesItems,
    chartConfig.dateFormat,
    effectiveValueFormat,
    highlights,
    padLeft,
    padTop,
    plotW,
    plotH,
  ]);

  const primaryLinePath = useMemo(
    () =>
      buildLinePath(
        plottedPoints.map((p) => ({ x: p.x, y: p.y })),
        chartConfig.curveType
      ),
    [plottedPoints, chartConfig.curveType]
  );

  const areaPath = useMemo(() => {
    if (!primaryLinePath || plottedPoints.length === 0) return "";
    const first = plottedPoints[0];
    const last = plottedPoints[plottedPoints.length - 1];
    const baselineY = (padTop + plotH).toFixed(1);
    return `${primaryLinePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }, [primaryLinePath, plottedPoints, padTop, plotH]);

  const secondaryLinePath = useMemo(() => {
    const validSec = plottedPoints
      .filter((p) => p.secondaryY !== null)
      .map((p) => ({ x: p.x, y: p.secondaryY as number }));
    if (validSec.length < 2) return "";
    return buildLinePath(validSec, chartConfig.curveType);
  }, [plottedPoints, chartConfig.curveType]);

  const rawYColLabel = yColMeta?.label || chartConfig.yColumn;
  const yColLabel =
    effectiveAgg === "count"
      ? "Quantidade de Registros"
      : effectiveAgg !== "none"
      ? `${AGG_LABELS[effectiveAgg]} de ${rawYColLabel}`
      : rawYColLabel;

  const secColLabel =
    columnsMeta.find((c) => c.name === chartConfig.secondaryYColumn)?.label ||
    chartConfig.secondaryYColumn;

  const handleDownloadPng = async () => {
    if (!reportCardRef.current) return;
    try {
      setIsExporting(true);
      setHoveredKey(null);
      const dataUrl = await toPng(reportCardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: chartConfig.backgroundColor,
      });
      const link = document.createElement("a");
      const safeSlug = (chartConfig.title || "relatorio-grafico")
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-");
      link.download = `${safeSlug}.png`;
      link.href = dataUrl;
      link.click();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao exportar PNG:", err);
      alert("Erro ao gerar PNG. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Action Toolbar Above the Report Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
            <MousePointerClick className="w-3.5 h-3.5" />
            Gráfico Interativo ({plottedPoints.length} pontos no eixo X)
          </span>
          <span>
            Clique em qualquer ponto do gráfico abaixo para adicionar um destaque pontual com cor e rótulo exclusivo.
          </span>
        </div>

        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={isExporting || plottedPoints.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
        >
          {exportSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              PNG Baixado com Sucesso!
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {isExporting
                ? "Renderizando PNG (3x HD)..."
                : "Baixar Relatório em PNG"}
            </>
          )}
        </button>
      </div>

      {/* EXPORTABLE REPORT CARD CONTAINER */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-lg bg-slate-200/40 p-2 sm:p-4">
        <div
          ref={reportCardRef}
          style={{
            backgroundColor: chartConfig.backgroundColor,
            color: chartConfig.textColor,
          }}
          className="rounded-2xl p-6 sm:p-8 transition-colors mx-auto max-w-[1040px] shadow-xs"
        >
          {/* Report Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-current/10">
            <div className="space-y-1 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest opacity-65">
                <GrafiquinhoLogo
                  variant="mark"
                  size={16}
                  accentColor={chartConfig.primaryColor}
                />
                <span>Grafiquinho • Relatório Visual</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
                {chartConfig.title || "Relatório sem Título"}
              </h1>
              {chartConfig.subtitle && (
                <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
                  {chartConfig.subtitle}
                </p>
              )}
            </div>

            {/* KPIs */}
            {chartConfig.showLegend && plottedPoints.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div
                  className="px-3.5 py-2 rounded-xl border border-current/10"
                  style={{
                    backgroundColor: `${chartConfig.primaryColor}12`,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-wider opacity-65 font-semibold">
                    Pico Máximo
                  </div>
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: chartConfig.primaryColor }}
                  >
                    {formatMetricValue(stats.max, effectiveValueFormat)}
                  </div>
                </div>

                <div className="px-3.5 py-2 rounded-xl border border-current/10 bg-current/[0.03]">
                  <div className="text-[10px] uppercase tracking-wider opacity-65 font-semibold">
                    Média por Ponto
                  </div>
                  <div className="text-sm font-bold">
                    {formatMetricValue(stats.avg, effectiveValueFormat)}
                  </div>
                </div>

                <div className="px-3.5 py-2 rounded-xl border border-current/10 bg-current/[0.03]">
                  <div className="text-[10px] uppercase tracking-wider opacity-65 font-semibold">
                    Total Acumulado
                  </div>
                  <div className="text-sm font-bold">
                    {formatMetricValue(stats.total, effectiveValueFormat)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Series Legend Row */}
          {chartConfig.showLegend && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 pb-1 text-xs">
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2 font-semibold">
                  <span
                    className="w-3.5 h-3.5 rounded-full inline-block"
                    style={{ backgroundColor: chartConfig.primaryColor }}
                  />
                  <span>{yColLabel}</span>
                </div>

                {chartConfig.secondaryYColumn && secondaryLinePath && (
                  <div className="flex items-center gap-2 font-medium opacity-80">
                    <span
                      className="w-4 h-0.5 inline-block border-b-2 border-dashed"
                      style={{ borderColor: chartConfig.secondaryColor }}
                    />
                    <span>{secColLabel}</span>
                  </div>
                )}
              </div>

              {Object.keys(highlights).length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] opacity-75">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {Object.keys(highlights).length} ponto(s) em destaque
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Main SVG Chart */}
          {plottedPoints.length === 0 ? (
            <div className="py-24 text-center opacity-60 text-sm">
              Nenhum ponto disponível com a configuração atual. Selecione &quot;Contagem de Linhas (COUNT)&quot; no Cálculo do Eixo Y ou escolha uma coluna numérica.
            </div>
          ) : (
            <div className="relative mt-2 select-none">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto overflow-visible"
              >
                <defs>
                  <linearGradient
                    id="primaryAreaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={chartConfig.primaryColor}
                      stopOpacity={chartConfig.areaOpacity}
                    />
                    <stop
                      offset="95%"
                      stopColor={chartConfig.primaryColor}
                      stopOpacity={0.0}
                    />
                  </linearGradient>

                  <filter
                    id="badgeShadow"
                    x="-20%"
                    y="-20%"
                    width="140%"
                    height="140%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="2"
                      stdDeviation="3"
                      floodColor="#0f172a"
                      floodOpacity="0.18"
                    />
                  </filter>
                </defs>

                {/* Horizontal Grid Lines & Y-Axis Labels */}
                {yTicks.map((tickVal, idx) => {
                  const yPos =
                    padTop +
                    plotH -
                    ((tickVal - minY) / (maxY - minY || 1)) * plotH;
                  return (
                    <g key={idx}>
                      {chartConfig.showGrid && (
                        <line
                          x1={padLeft}
                          y1={yPos}
                          x2={svgWidth - padRight}
                          y2={yPos}
                          stroke={chartConfig.gridColor}
                          strokeWidth={1}
                          strokeDasharray={idx === 0 ? undefined : "4 4"}
                        />
                      )}
                      <text
                        x={padLeft - 12}
                        y={yPos + 4}
                        textAnchor="end"
                        fill={chartConfig.textColor}
                        fillOpacity={0.65}
                        fontSize={11}
                        fontWeight={500}
                      >
                        {formatMetricValue(tickVal, effectiveValueFormat)}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient Fill */}
                {chartConfig.chartType === "area" &&
                  areaPath &&
                  plottedPoints.length > 1 && (
                    <path d={areaPath} fill="url(#primaryAreaGradient)" />
                  )}

                {/* Secondary Y Line */}
                {secondaryLinePath && (
                  <path
                    d={secondaryLinePath}
                    fill="none"
                    stroke={chartConfig.secondaryColor}
                    strokeWidth={Math.max(2, chartConfig.lineWidth - 1)}
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                )}

                {/* Primary Line */}
                {plottedPoints.length > 1 && (
                  <path
                    d={primaryLinePath}
                    fill="none"
                    stroke={chartConfig.primaryColor}
                    strokeWidth={chartConfig.lineWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Vertical Guide Lines for Highlighted Points */}
                {plottedPoints.map((pt) => {
                  if (!pt.highlight) return null;
                  return (
                    <line
                      key={`vline-${pt.pointKey}`}
                      x1={pt.x}
                      y1={pt.y}
                      x2={pt.x}
                      y2={padTop + plotH}
                      stroke={pt.highlight.color}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      strokeOpacity={0.65}
                    />
                  );
                })}

                {/* X-Axis Labels */}
                {plottedPoints.map((pt, idx) => {
                  const maxLabels = 12;
                  const step = Math.max(
                    1,
                    Math.ceil(plottedPoints.length / maxLabels)
                  );
                  const shouldShowX =
                    idx % step === 0 ||
                    idx === plottedPoints.length - 1 ||
                    Boolean(pt.highlight);

                  if (!shouldShowX) return null;

                  const shortX =
                    pt.formattedX.length > 18
                      ? `${pt.formattedX.slice(0, 16)}…`
                      : pt.formattedX;

                  return (
                    <text
                      key={`xlabel-${pt.pointKey}-${idx}`}
                      x={pt.x}
                      y={padTop + plotH + 24}
                      textAnchor="middle"
                      fill={
                        pt.highlight
                          ? pt.highlight.color
                          : chartConfig.textColor
                      }
                      fillOpacity={pt.highlight ? 1 : 0.72}
                      fontSize={pt.highlight ? 11.5 : 10.5}
                      fontWeight={pt.highlight ? 700 : 500}
                    >
                      {shortX}
                    </text>
                  );
                })}

                {/* Secondary Line Points */}
                {plottedPoints.map((pt, idx) => {
                  if (pt.secondaryY === null) return null;
                  return (
                    <circle
                      key={`sec-pt-${pt.pointKey}-${idx}`}
                      cx={pt.x}
                      cy={pt.secondaryY}
                      r={3.5}
                      fill={chartConfig.backgroundColor}
                      stroke={chartConfig.secondaryColor}
                      strokeWidth={2}
                    />
                  );
                })}

                {/* Primary Points & Individual Highlight Markers */}
                {plottedPoints.map((pt, idx) => {
                  const hl = pt.highlight;
                  const isHovered = hoveredKey === pt.pointKey;
                  const pointColor = hl ? hl.color : chartConfig.primaryColor;
                  const radius = hl
                    ? hl.size / 2
                    : chartConfig.defaultPointSize / 2;

                  return (
                    <g
                      key={`pt-${pt.pointKey}-${idx}`}
                      className="cursor-pointer"
                      onClick={() => onSelectPoint(pt.row)}
                      onMouseEnter={() => setHoveredKey(pt.pointKey)}
                      onMouseLeave={() => setHoveredKey(null)}
                    >
                      {(hl || isHovered) && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={radius + (hl ? 6 : 5)}
                          fill={pointColor}
                          fillOpacity={hl ? 0.22 : 0.15}
                        />
                      )}

                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={radius}
                        fill={hl ? pointColor : chartConfig.backgroundColor}
                        stroke={pointColor}
                        strokeWidth={hl ? 3 : 2.5}
                      />

                      {hl && radius >= 6 && (
                        <circle cx={pt.x} cy={pt.y} r={2.5} fill="#ffffff" />
                      )}
                    </g>
                  );
                })}

                {/* Data Labels & Highlight Callout Badges */}
                {plottedPoints.map((pt, idx) => {
                  const hl = pt.highlight;
                  const isHovered = hoveredKey === pt.pointKey;

                  const shouldRenderLabel =
                    Boolean(hl) ||
                    isHovered ||
                    chartConfig.showDataLabels === "all";

                  if (
                    !shouldRenderLabel ||
                    (chartConfig.showDataLabels === "none" && !hl && !isHovered)
                  ) {
                    return null;
                  }

                  if (!hl) {
                    const labelText = pt.rowLabel
                      ? `${pt.rowLabel} (${pt.formattedY})`
                      : pt.formattedY;
                    return (
                      <g
                        key={`lbl-${pt.pointKey}-${idx}`}
                        className="cursor-pointer"
                        onClick={() => onSelectPoint(pt.row)}
                      >
                        <text
                          x={pt.x}
                          y={pt.y - chartConfig.defaultPointSize / 2 - 8}
                          textAnchor="middle"
                          fill={chartConfig.textColor}
                          fillOpacity={0.85}
                          fontSize={10.5}
                          fontWeight={600}
                        >
                          {labelText}
                        </text>
                      </g>
                    );
                  }

                  const titlePart =
                    hl.customLabel || pt.rowLabel || pt.formattedX;
                  const valuePart = hl.showValue ? pt.formattedY : "";
                  const fullBadgeText =
                    titlePart && valuePart
                      ? `${titlePart} • ${valuePart}`
                      : titlePart || valuePart;

                  const estCharWidth = 6.6;
                  const badgeW = Math.max(
                    68,
                    Math.min(260, fullBadgeText.length * estCharWidth + 24)
                  );
                  const badgeH = 26;
                  const offsetAbove = hl.size / 2 + 14;

                  const clampedCenterX = Math.max(
                    padLeft + badgeW / 2 - 20,
                    Math.min(svgWidth - padRight - badgeW / 2 + 20, pt.x)
                  );
                  const badgeX = clampedCenterX - badgeW / 2;
                  const badgeY = Math.max(8, pt.y - offsetAbove - badgeH);

                  if (hl.badgeStyle === "minimal") {
                    return (
                      <g
                        key={`hl-badge-${pt.pointKey}-${idx}`}
                        className="cursor-pointer"
                        onClick={() => onSelectPoint(pt.row)}
                      >
                        <text
                          x={clampedCenterX}
                          y={badgeY + 17}
                          textAnchor="middle"
                          fill={hl.color}
                          fontSize={12}
                          fontWeight={800}
                        >
                          {fullBadgeText}
                        </text>
                      </g>
                    );
                  }

                  const isSolid = hl.badgeStyle === "solid";

                  return (
                    <g
                      key={`hl-badge-${pt.pointKey}-${idx}`}
                      filter="url(#badgeShadow)"
                      className="cursor-pointer"
                      onClick={() => onSelectPoint(pt.row)}
                    >
                      <polygon
                        points={`${pt.x - 5},${badgeY + badgeH - 1} ${
                          pt.x + 5
                        },${badgeY + badgeH - 1} ${pt.x},${badgeY + badgeH + 6}`}
                        fill={isSolid ? hl.color : "#ffffff"}
                      />

                      <rect
                        x={badgeX}
                        y={badgeY}
                        width={badgeW}
                        height={badgeH}
                        rx={8}
                        fill={isSolid ? hl.color : "#ffffff"}
                        stroke={hl.color}
                        strokeWidth={isSolid ? 0 : 2}
                      />

                      <text
                        x={clampedCenterX}
                        y={badgeY + 17}
                        textAnchor="middle"
                        fill={isSolid ? "#ffffff" : hl.color}
                        fontSize={11.5}
                        fontWeight={700}
                      >
                        {fullBadgeText}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* Report Footer */}
          <div className="mt-6 pt-4 border-t border-current/10 flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-65">
            <div>{chartConfig.footer || "Fonte: Dados internos"}</div>
            <div className="inline-flex items-center gap-1.5 font-semibold">
              <GrafiquinhoLogo
                variant="mark"
                size={15}
                accentColor={chartConfig.primaryColor}
              />
              <span>Gerado com Grafiquinho</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
