export const LAWYER_CONSULT_STORAGE_KEY = "nyaya-lawyer-consult-v1";

export type PersistedConsult =
  | { v: 1; kind: "live"; lawyerId: string }
  | { v: 1; kind: "demo"; key: string };

export function readPersistedConsult(): PersistedConsult | null {
  try {
    const raw = sessionStorage.getItem(LAWYER_CONSULT_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedConsult;
    if (p?.v !== 1) return null;
    if (p.kind === "live" && typeof p.lawyerId === "string") return p;
    if (p.kind === "demo" && typeof p.key === "string") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function writePersistedConsult(c: PersistedConsult | null) {
  if (!c) {
    sessionStorage.removeItem(LAWYER_CONSULT_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(LAWYER_CONSULT_STORAGE_KEY, JSON.stringify(c));
}

/** Avoid open redirects after login. */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const decoded = decodeURIComponent(raw.trim());
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  return decoded;
}
