"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, Check } from "lucide-react";
import GrafiquinhoLogo from "@/components/GrafiquinhoLogo";
import { ChartConfig, PointHighlight } from "@/types/chart";
import { formatMetricValue } from "@/lib/formatters";

interface PointHighlightModalProps {
  row: Record<string, any> | null;
  chartConfig: ChartConfig;
  existingHighlight?: PointHighlight;
  onClose: () => void;
  onSaveHighlight: (key: string, highlight: PointHighlight) => void;
  onRemoveHighlight: (key: string) => void;
}

const QUICK_COLORS = [
  { name: "Vermelho Alerta", hex: "#dc2626" },
  { name: "Verde Destaque", hex: "#059669" },
  { name: "Âmbar Atenção", hex: "#d97706" },
  { name: "Azul Executivo", hex: "#2563eb" },
  { name: "Violeta Produto", hex: "#7c3aed" },
  { name: "Rosa Impacto", hex: "#db2777" },
  { name: "Ciano Neon", hex: "#0891b2" },
  { name: "Preto Grafite", hex: "#0f172a" },
];

export default function PointHighlightModal({
  row,
  chartConfig,
  existingHighlight,
  onClose,
  onSaveHighlight,
  onRemoveHighlight,
}: PointHighlightModalProps) {
  const [color, setColor] = useState("#dc2626");
  const [size, setSize] = useState(15);
  const [customLabel, setCustomLabel] = useState("");
  const [showValue, setShowValue] = useState(true);
  const [badgeStyle, setBadgeStyle] = useState<"solid" | "outline" | "minimal">(
    "solid"
  );

  useEffect(() => {
    if (!row) return;
    if (existingHighlight) {
      setColor(existingHighlight.color || "#dc2626");
      setSize(existingHighlight.size || 15);
      setCustomLabel(existingHighlight.customLabel || "");
      setShowValue(existingHighlight.showValue ?? true);
      setBadgeStyle(existingHighlight.badgeStyle || "solid");
    } else {
      const defaultLbl = chartConfig.labelColumn
        ? String(row[chartConfig.labelColumn] || "")
        : "";
      setColor("#dc2626");
      setSize(15);
      setCustomLabel(defaultLbl);
      setShowValue(true);
      setBadgeStyle("solid");
    }
  }, [row, existingHighlight, chartConfig.labelColumn]);

  if (!row) return null;

  const rowId = Number(row._row_id) || 0;
  const pointKey = row._point_key ? String(row._point_key) : String(rowId);
  const xVal = row[chartConfig.xColumn];
  const yVal = row[chartConfig.yColumn];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveHighlight(pointKey, {
      rowId,
      pointKey,
      color,
      size,
      customLabel: customLabel.trim(),
      showValue,
      badgeStyle,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner text-white"
              style={{ backgroundColor: color }}
            >
              <GrafiquinhoLogo
                variant="mark"
                size={20}
                accentColor="#ffffff"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Destaque Pontual no Gráfico
              </h3>
              <p className="text-xs text-slate-300">
                Eixo X:{" "}
                <span className="font-semibold text-white">{String(xVal)}</span>{" "}
                • Valor:{" "}
                <span className="font-semibold text-amber-300">
                  {formatMetricValue(yVal, chartConfig.valueFormat)}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Texto / Rótulo do Destaque
            </label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Ex: Pico de Eventos / Anomalia / Marco"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Aparecerá acima do ponto destacado no gráfico e no PNG exportado.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Cor Exclusiva do Ponto e Rótulo
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_COLORS.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => setColor(swatch.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color.toLowerCase() === swatch.hex.toLowerCase()
                      ? "scale-110 border-slate-900 ring-2 ring-offset-1 ring-slate-400"
                      : "border-white shadow-xs hover:scale-105"
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                  title={swatch.name}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 ml-1"
                title="Escolher cor personalizada"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Tamanho do Ponto no Gráfico
              </label>
              <span className="text-xs font-bold text-slate-800">{size} px</span>
            </div>
            <input
              type="range"
              min={8}
              max={24}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estilo da Etiqueta
              </label>
              <select
                value={badgeStyle}
                onChange={(e) =>
                  setBadgeStyle(
                    e.target.value as "solid" | "outline" | "minimal"
                  )
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="solid">Pílula Sólida Colorida</option>
                <option value="outline">Fundo Claro c/ Borda</option>
                <option value="minimal">Texto Direto Limpo</option>
              </select>
            </div>

            <div className="flex items-end pb-1">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showValue}
                  onChange={(e) => setShowValue(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="text-xs font-medium text-slate-700">
                  Exibir valor numérico junto
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {existingHighlight ? (
              <button
                type="button"
                onClick={() => {
                  onRemoveHighlight(pointKey);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remover Destaque
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Salvar Destaque
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
