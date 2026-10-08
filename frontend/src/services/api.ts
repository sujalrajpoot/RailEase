import type { Train, Seat, HoldRequest, HoldResponse, HoldStatus, PayResult, Ticket, CancelResult } from "../types";
const BASE = import.meta.env.VITE_API || "http://localhost:8000/api";
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

function detailToMessage(d: unknown): string {
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (x && typeof x === "object" && "msg" in x ? String((x as { msg: unknown }).msg) : "")).filter(Boolean).join("; ");
  return "";
}

async function call<T>(path: string, opts: RequestInit = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...opts });
  } catch {
    throw new ApiError("Cannot reach the server. Check your internet connection and try again.", 0);
  }
  if (r.status === 204) return null as T;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const fallback = r.status >= 500 ? "Something went wrong on our side. Please try again." : "Request failed. Please try again.";
    throw new ApiError(detailToMessage(j.detail) || fallback, r.status);
  }
  return j as T;
}
const post = <T,>(p: string, b?: unknown) => call<T>(p, { method: "POST", body: JSON.stringify(b ?? {}) });

/** Turn any thrown value into a message that is safe to show to the user. */
export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export const api = {
  stations: () => call<string[]>("/stations"),
  search: (s: string, d: string) => call<Train[]>(`/trains/search?source=${encodeURIComponent(s)}&destination=${encodeURIComponent(d)}`),
  seats: (id: string, date: string, cls: string) => call<Seat[]>(`/trains/${id}/availability?travel_date=${date}&cls=${cls}`),
  hold: (b: HoldRequest) => post<HoldResponse>("/holds", b),
  getHold: (id: string) => call<HoldStatus>(`/holds/${id}`),
  release: (id: string) => call<null>(`/holds/${id}`, { method: "DELETE" }),
  pay: (id: string, success: boolean) => post<PayResult>(`/payments/${id}`, { success }),
  ticket: (pnr: string) => call<Ticket>(`/bookings/${pnr}`),
  cancel: (pnr: string) => post<CancelResult>(`/bookings/${pnr}/cancel`),
};
