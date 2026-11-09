export type ColumnDType = "string" | "number" | "date" | "id" | "boolean";

export interface ColumnMeta {
  name: string;
  label: string;
  dtype: ColumnDType;
}

export interface PointHighlight {
  rowId: number;
  pointKey?: string;
  color: string;
  size: number;
  customLabel: string;
  showValue: boolean;
  badgeStyle: "solid" | "outline" | "minimal";
}

export interface ChartConfig {
  title: string;
  subtitle: string;
  footer: string;
  chartType: "line" | "area" | "bar" | "bar_horizontal";
  curveType: "smooth" | "linear" | "step";
  xColumn: string;
  xGrouping?: "raw" | "day" | "hour" | "month";
  yColumn: string;
  yAggregation?: "none" | "count" | "count_distinct" | "sum" | "avg";
  valueMode?: "absolute" | "percent_of_total" | "both_label";
  categorySort?: "original" | "value_desc" | "value_asc" | "alpha";
  secondaryYColumn?: string;
  labelColumn?: string;
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  lineWidth: number;
  defaultPointSize: number;
  areaOpacity: number;
  showDataLabels: "all" | "highlights_only" | "none";
  valueFormat: "raw" | "number" | "compact" | "percent" | "currency_brl";
  dateFormat: "raw" | "dd_mm" | "dd_mm_yyyy" | "mmm_yy";
  aspectRatio: "16:9" | "4:3" | "1:1";
  showGrid: boolean;
  showLegend: boolean;
}

export interface ProjectMeta {
  id: string;
  name: string;
  source_type: string;
  table_name: string;
  columns_meta: ColumnMeta[];
  chart_config: ChartConfig;
  highlights: Record<string, PointHighlight>;
  created_at?: string;
  updated_at?: string;
}

export interface QueryFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  minVal: string;
  maxVal: string;
  onlyActive: boolean;
  onlyHighlighted: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  gridColor: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "editorial_light",
    name: "Editorial Clean",
    description: "Fundo claro nítido com azul executivo",
    primaryColor: "#2563eb",
    secondaryColor: "#94a3b8",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    gridColor: "#e2e8f0",
  },
  {
    id: "dark_executive",
    name: "Dark Executive",
    description: "Alto contraste escuro com ciano luminoso",
    primaryColor: "#38bdf8",
    secondaryColor: "#64748b",
    backgroundColor: "#0f172a",
    textColor: "#f8fafc",
    gridColor: "#1e293b",
  },
  {
    id: "fintech_emerald",
    name: "Emerald Analytics",
    description: "Tom analítico sofisticado em verde esmeralda",
    primaryColor: "#059669",
    secondaryColor: "#94a3b8",
    backgroundColor: "#f8fafc",
    textColor: "#064e3b",
    gridColor: "#d1fae5",
  },
  {
    id: "warm_paper",
    name: "Jornal / Warm Paper",
    description: "Estilo editorial inspirado em relatórios e artigos",
    primaryColor: "#c2410c",
    secondaryColor: "#78716c",
    backgroundColor: "#fffbeb",
    textColor: "#1c1917",
    gridColor: "#fde68a",
  },
  {
    id: "royal_violet",
    name: "Product Violet",
    description: "Visual moderno de métricas de produto e eventos",
    primaryColor: "#7c3aed",
    secondaryColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    textColor: "#1e1b4b",
    gridColor: "#ede9fe",
  },
];
