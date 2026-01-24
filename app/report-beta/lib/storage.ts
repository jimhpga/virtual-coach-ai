import { safeJsonParse } from "./guards";

export function loadSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  return safeJsonParse<T>(sessionStorage.getItem(key));
}

export function saveSession(key: string, value: any) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}
