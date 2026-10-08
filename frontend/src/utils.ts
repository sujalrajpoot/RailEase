/** Fallback list so the dropdown works even if the stations API is unreachable. */
export const DEFAULT_STATIONS = ["Delhi", "Kolkata", "Mumbai"];

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,59}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

export const normalizePhone = (v: string) => v.replace(/[\s-]/g, "").replace(/^\+91/, "");

export const cleanName = (v: string) => v.trim().replace(/\s+/g, " ");

export function validateName(v: string): string {
  const name = cleanName(v);
  if (!name) return "Passenger name is required.";
  if (!NAME_RE.test(name)) return "Use 2-60 letters only (spaces, . ' - allowed).";
  return "";
}

export function validateContact(c: { email: string; phone: string }): { email?: string; phone?: string } {
  const e: { email?: string; phone?: string } = {};
  const email = c.email.trim();
  if (!email) e.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) e.email = "Enter a valid email, e.g. name@example.com.";
  if (!c.phone.trim()) e.phone = "Phone number is required.";
  else if (!PHONE_RE.test(normalizePhone(c.phone))) e.phone = "Enter a valid 10-digit mobile number (starts with 6-9).";
  return e;
}

export function validateRoute(src: string, dst: string, date: string): Record<"s" | "d" | "date", string> {
  const e = { s: "", d: "", date: "" };
  if (!src.trim()) e.s = "Enter a departure station.";
  if (!dst.trim()) e.d = "Enter an arrival station.";
  if (src.trim() && dst.trim() && src.trim().toLowerCase() === dst.trim().toLowerCase()) e.d = "Arrival must differ from departure.";
  if (!date) e.date = "Choose a travel date.";
  else if (date < todayISO()) e.date = "Travel date cannot be in the past.";
  return e;
}
