import {
  ChartConfig,
  ColumnMeta,
  PointHighlight,
  ProjectMeta,
  QueryFilters,
} from "@/types/chart";

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://127.0.0.1:8000/api";
  }
  return "/api";
}

const CLIENT_ID_STORAGE_KEY = "grafiquinho_client_id";

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let cid = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (!cid) {
      cid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `cli-${crypto.randomUUID()}`
          : `cli-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, cid);
    }
    return cid;
  } catch {
    return "anon";
  }
}

function getHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Client-ID": getClientId(),
  };
  if (json) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export interface QueryProjectResponse {
  project: ProjectMeta;
  total_rows: number;
  filtered_rows: number;
  rows: Record<string, any>[];
}

export async function fetchProjects(): Promise<ProjectMeta[]> {
  const res = await fetch(`${getApiBase()}/projects`, {
    cache: "no-store",
    headers: getHeaders(false),
  });
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

  const res = await fetch(`${getApiBase()}/projects/${projectId}/query`, {
    method: "POST",
    headers: getHeaders(true),
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

  const res = await fetch(`${getApiBase()}/projects/upload-csv`, {
    method: "POST",
    headers: getHeaders(false),
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
  const res = await fetch(`${getApiBase()}/projects/copy-paste`, {
    method: "POST",
    headers: getHeaders(true),
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
  const res = await fetch(`${getApiBase()}/projects/manual`, {
    method: "POST",
    headers: getHeaders(true),
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
  const res = await fetch(`${getApiBase()}/projects/${projectId}/state`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao salvar projeto");
  }
  return res.json();
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}`, {
    method: "DELETE",
    headers: getHeaders(false),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao remover base");
  }
}

export async function addProjectRow(
  projectId: string,
  values: Record<string, any>,
  highlight?: PointHighlight
): Promise<{ rowId: number }> {
  const res = await fetch(`${getApiBase()}/projects/${projectId}/rows`, {
    method: "POST",
    headers: getHeaders(true),
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
  const res = await fetch(`${getApiBase()}/projects/${projectId}/rows/${rowId}`, {
    method: "PATCH",
    headers: getHeaders(true),
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
  const res = await fetch(`${getApiBase()}/projects/${projectId}/rows/${rowId}`, {
    method: "DELETE",
    headers: getHeaders(false),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro ao excluir linha");
  }
}
