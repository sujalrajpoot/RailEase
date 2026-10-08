import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, errorMessage } from "../services/api";
import Steps from "../components/Steps";
import { downloadTicketPdf } from "../ticketPdf";
import type { Ticket } from "../types";

export default function TicketPage() {
  const { pnr } = useParams();
  const nav = useNavigate();
  const [v, setV] = useState(pnr ?? "");
  const [t, setT] = useState<Ticket | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = (p: string) => api.ticket(p).then((x) => { setT(x); setErr(""); }).catch((e) => { setT(null); setErr(errorMessage(e, "Could not find that ticket.")); });
  useEffect(() => { if (pnr) load(pnr); else { setT(null); setErr(""); } }, [pnr]);

  function find(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const x = v.trim();
    if (!/^\d{10}$/.test(x)) return setErr("PNR must be exactly 10 digits.");
    setErr(""); nav(`/ticket/${x}`);
  }
  async function download() {
    if (!t) return;
    setPdfBusy(true); setErr("");
    try { await downloadTicketPdf(t); }
    catch { setErr("Could not create the PDF. Please try again."); }
    finally { setPdfBusy(false); }
  }
  async function cancel() {
    if (!t || !window.confirm("Cancel this ticket? This cannot be undone.")) return;
    setBusy(true);
    try {
      const r = await api.cancel(t.pnr);
      await load(t.pnr);
      setMsg(`Cancelled. Refund of Rs. ${r.refund} (${r.refund_percent}%) is on its way.`);
    } catch (e) { setErr(errorMessage(e, "Could not cancel the ticket.")); }
    finally { setBusy(false); }
  }
  return (
    <>
      {t?.status === "CONFIRMED" && <Steps current={4} />}
      <h1 className="mb-4 text-2xl font-semibold sm:text-3xl">Your ticket</h1>
      <form onSubmit={find} className="flex flex-col gap-2 sm:flex-row" noValidate>
        <label htmlFor="pnr" className="sr-only">PNR</label>
        <input id="pnr" className="field" inputMode="numeric" maxLength={10} placeholder="10-digit PNR" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} />
        <button className="btn" type="submit">Find ticket</button>
      </form>
      {err && <p className="alert-error mt-4" role="alert">{err}</p>}
      {t && (
        <div className="card mt-4 border-2 border-dashed !border-rail dark:!border-teal-500">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-semibold">PNR {t.pnr}</h2>
            <span className={`rounded-full px-3 py-0.5 text-sm font-semibold ${t.status === "CONFIRMED" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"}`}>{t.status}</span>
          </div>
          <p className="mt-2 leading-relaxed">{t.train}<br />{t.from} → {t.to}, {t.date} at {t.departure}<br />Rs. {t.amount}</p>
          <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700" aria-label="Passengers">
            {t.passengers.map((px, i) => (
              <li key={i} className="flex justify-between gap-3 px-3 py-2"><span className="font-medium break-words">{px.name}</span><span className="shrink-0 text-slate-600 dark:text-slate-300">Seat {px.seat}</span></li>
            ))}
          </ul>
          {t.status === "CONFIRMED" && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button className="btn" onClick={download} disabled={pdfBusy}>{pdfBusy ? "Preparing PDF…" : "⬇ Download ticket (PDF)"}</button>
              <button className="btn-ghost" onClick={cancel} disabled={busy}>{busy ? "Cancelling…" : "Cancel ticket"}</button>
            </div>
          )}
        </div>
      )}
      {msg && <p className="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-green-900 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200" role="status">{msg}</p>}
    </>
  );
}
