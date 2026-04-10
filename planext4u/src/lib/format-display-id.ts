/** Standard UUID (incl. nil UUID) */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string): boolean {
  return UUID_RE.test(String(value).trim());
}

/**
 * Short, human-friendly reference for tables and UI (full value on hover via title).
 * UUIDs → #XXXXXXXX (first 8 hex, uppercased). Other long strings → truncated.
 */
export function formatDisplayId(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "—";
  const s = String(raw).trim();
  if (looksLikeUuid(s)) return `#${s.slice(0, 8).toUpperCase()}`;
  if (s.length > 14) return `${s.slice(0, 10)}…`;
  return s;
}

/** Keys whose cell values are typically database IDs (UUIDs). */
export function isIdColumnKey(key: string): boolean {
  if (key === "id" || key === "order_id") return true;
  if (key.endsWith("_id")) return true;
  return false;
}

export function shouldFormatIdValue(key: string, value: unknown): value is string {
  if (!isIdColumnKey(key)) return false;
  if (typeof value !== "string") return false;
  return looksLikeUuid(value);
}
