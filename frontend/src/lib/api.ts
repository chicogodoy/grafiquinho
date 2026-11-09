import {
  ChartConfig,
  ColumnMeta,
  PointHighlight,
  ProjectMeta,
  QueryFilters,
} from "@/types/chart";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface QueryProjectResponse {
  project: ProjectMeta;
  total_rows: number;
  filtered_rows: number;
  rows: Record<string, any>[];
}

export async function fetchProjects(): Promise<ProjectMeta[]> {
  const res = await fetch(`${API_BASE}/projects`, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao carregar projetos do DuckDB");
  const data = await res.json();
  return data.projects || [];
}

export async function queryProjectData(
  projectId: string,
  filters: QueryFilters,
  xColumn?: string,
  yColumn?: string
): Promise<QueryProjectResponse> {
  const payload = {
    search: filters.search || null,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    minVal: filters.minVal !== "" ? Number(filters.minVal) : null,
    maxVal: filters.maxVal !== "" ? Number(filters.maxVal) : null,
    onlyActive: filters.onlyActive,
    onlyHighlighted: filters.onlyHighlighted,
    xColumn: xColumn || null,
    yColumn: yColumn || null,
    sortBy: filters.sortBy || "_row_id",
    sortDir: filters.sortDir || "asc",
  };

  const res = await fetch(`${API_BASE}/projects/${projectId}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao consultar dados");
  }
  return res.json();
}

export async function uploadCsvDataset(
  file: File,
  name?: string
): Promise<ProjectMeta> {
  const formData = new FormData();
  formData.append("file", file);
  if (name) formData.append("name", name);

  const res = await fetch(`${API_BASE}/projects/upload-csv`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao enviar CSV");
  }
  return res.json();
}

export async function ingestCopyPasteDataset(
  name: string,
  rawText: string,
  hasHeader: boolean
): Promise<ProjectMeta> {
  const res = await fetch(`${API_BASE}/projects/copy-paste`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, rawText, hasHeader }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao processar texto colado");
  }
  return res.json();
}

export async function createManualDataset(
  name: string,
  rows: Record<string, any>[]
): Promise<ProjectMeta> {
  const res = await fetch(`${API_BASE}/projects/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      xColumnName: "data",
      yColumnName: "valor",
      labelColumnName: "rotulo",
      rows,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao criar base manual");
  }
  return res.json();
}

export async function saveProjectState(
  projectId: string,
  payload: {
    name?: string;
    columnsMeta?: ColumnMeta[];
    chartConfig?: ChartConfig;
    highlights?: Record<string, PointHighlight>;
  }
): Promise<ProjectMeta> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao salvar projeto");
  }
  return res.json();
}

export async function addProjectRow(
  projectId: string,
  values: Record<string, any>,
  highlight?: PointHighlight
): Promise<{ rowId: number }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/rows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values, highlight }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao adicionar ponto");
  }
  return res.json();
}

export async function updateProjectRow(
  projectId: string,
  rowId: number,
  payload: { active?: boolean; values?: Record<string, any> }
): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/rows/${rowId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao atualizar linha");
  }
}

export async function deleteProjectRow(
  projectId: string,
  rowId: number
): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/rows/${rowId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao excluir linha");
  }
}

