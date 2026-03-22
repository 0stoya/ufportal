// Pure utility functions - easy to unit test
export function normalizeBbeYmd(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

export function daysUntilYmd(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatBBELabel(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;

  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { day: "2-digit", month: "short" }
    : { day: "2-digit", month: "short", year: "numeric" };

  return new Intl.DateTimeFormat("en-GB", opts).format(d);
}

export function bbeText(ymd: string) {
  const left = daysUntilYmd(ymd);
  const label = formatBBELabel(ymd);

  if (left === null) return `BBE ${label}`;
  if (left <= 0) return `Expired • ${Math.abs(left)}d`;
  return `BBE ${label} • ${left}d`;
}

export function bbeTone(left: number | null) {
  if (left === null) return "bg-slate-100 text-slate-600 border-slate-200";
  if (left <= 0) return "bg-red-50 text-red-700 border-red-200";
  if (left <= 14) return "bg-amber-50 text-amber-700 border-amber-200";
  if (left <= 120) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export function clampPage(n: number, totalPages: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.floor(n)), Math.max(1, totalPages));
}

export async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: `Non-JSON response (${res.status}). Preview: ${text.slice(0, 200)}` };
  }
}