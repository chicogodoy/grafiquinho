import { ChartConfig } from "@/types/chart";

const MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function formatMetricValue(
  val: unknown,
  format: ChartConfig["valueFormat"] = "number"
): string {
  if (val === null || val === undefined || val === "") return "-";
  if (format === "raw") return String(val);

  const num = typeof val === "number" ? val : Number(val);
  if (Number.isNaN(num)) return String(val);

  switch (format) {
    case "currency_brl":
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: Math.abs(num) >= 100 ? 0 : 2,
      }).format(num);
    case "compact":
      if (Math.abs(num) >= 1_000_000) {
        return `${(num / 1_000_000).toLocaleString("pt-BR", {
          maximumFractionDigits: 1,
        })} mi`;
      }
      if (Math.abs(num) >= 1_000) {
        return `${(num / 1_000).toLocaleString("pt-BR", {
          maximumFractionDigits: 1,
        })} mil`;
      }
      return num.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    case "percent":
      return `${num.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      })}%`;
    case "number":
    default:
      return num.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
}

export function extractGroupedXKey(
  val: unknown,
  grouping: ChartConfig["xGrouping"] = "raw"
): string {
  if (val === null || val === undefined || val === "") return "(Vazio)";
  const raw = String(val).trim();
  if (!grouping || grouping === "raw") return raw;

  // Match ISO date or timestamp: YYYY-MM-DD[ HH:MM...]
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (isoMatch) {
    const [, yyyy, mm, dd, hh] = isoMatch;
    if (grouping === "day") return `${yyyy}-${mm}-${dd}`;
    if (grouping === "month") return `${yyyy}-${mm}`;
    if (grouping === "hour") return `${yyyy}-${mm}-${dd} ${hh || "00"}:00`;
  }

  // Match BR date: DD/MM/YYYY[ HH:MM...]
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (brMatch) {
    const [, dd, mm, yyyy, hh] = brMatch;
    if (grouping === "day") return `${yyyy}-${mm}-${dd}`;
    if (grouping === "month") return `${yyyy}-${mm}`;
    if (grouping === "hour") return `${yyyy}-${mm}-${dd} ${hh || "00"}:00`;
  }

  return raw;
}

export function formatDateAxis(
  val: unknown,
  format: ChartConfig["dateFormat"] = "raw"
): string {
  if (val === null || val === undefined || val === "") return "";
  const raw = String(val).trim();
  if (format === "raw") {
    // Strip trailing '.563000 UTC' from raw timestamps to keep axis labels readable
    return raw.replace(/\.\d+\s*(UTC|Z)?$/i, "").trim();
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const monthIndex = parseInt(mm, 10) - 1;
    if (format === "dd_mm" && dd) {
      return `${dd}/${mm}`;
    }
    if (format === "dd_mm_yyyy" && dd) {
      return `${dd}/${mm}/${yyyy}`;
    }
    if (format === "mmm_yy") {
      const mName = MONTHS_PT[monthIndex] || mm;
      return `${mName}/${yyyy.slice(2)}`;
    }
  }
  return raw;
}

const LOWERCASE_WORDS_PT = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "ao",
  "aos",
  "por",
  "para",
  "com",
  "sem",
  "sob",
  "sobre",
  "a",
  "o",
  "as",
  "os",
]);

export function formatTitleCase(text: string, enabled: boolean = true): string {
  if (!enabled || !text) return text;
  const trimmed = String(text).trim();
  if (!trimmed) return text;

  // Preserve pure numbers, dates, or timestamps without letters
  if (!/[a-zA-ZÀ-ÿ]/.test(trimmed)) {
    return trimmed;
  }

  // Replace underscores with spaces if the label looks like a snake_case identifier
  const normalized = trimmed.includes("_")
    ? trimmed.replace(/_+/g, " ")
    : trimmed;

  const tokens = normalized.split(/(\s+|[/:()-])/);
  let isFirstWordInSegment = true;

  return tokens
    .map((token) => {
      if (!token) return token;
      if (/^(\s+|[/:()-])$/.test(token)) {
        if (/[:(-]/.test(token)) {
          isFirstWordInSegment = true;
        }
        return token;
      }

      const lower = token.toLocaleLowerCase("pt-BR");
      const shouldKeepLower =
        !isFirstWordInSegment && LOWERCASE_WORDS_PT.has(lower);
      isFirstWordInSegment = false;

      if (shouldKeepLower) {
        return lower;
      }

      return (
        lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1)
      );
    })
    .join("");
}
