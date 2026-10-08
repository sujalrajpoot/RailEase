import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, errorMessage } from "../services/api";
import Countdown from "../components/Countdown";
import Steps from "../components/Steps";
import type { HoldStatus } from "../types";

export default function Payment() {
  const { holdId = "" } = useParams();
  const nav = useNavigate();
  const [h, setH] = useState<HoldStatus | null>(null);
  const [err, setErr] = useState("");
  const [fatal, setFatal] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.getHold(holdId).then(setH).catch(() => setFatal("This hold has expired. Please pick your seats again.")); }, [holdId]);
  const expired = useCallback(() => setFatal("Time is up. Your seats were released."), []);

  async function pay(ok: boolean) {
    setBusy(true); setErr("");
    try {
      const r = await api.pay(holdId, ok);
      if (r.status === "SUCCESS") nav(`/ticket/${r.pnr}`); else setFatal("Payment failed. Your seats were released.");
    } catch (e) { setErr(errorMessage(e, "Payment could not be processed.")); }
    finally { setBusy(false); }
  }
  async function release() {
    setBusy(true);
    try { await api.release(holdId); nav("/"); }
    catch (e) { setErr(errorMessage(e, "Could not release seats.")); setBusy(false); }
  }

  if (fatal) return <div className="space-y-3"><p className="alert-error" role="alert">{fatal}</p><Link className="btn" to="/">Search again</Link></div>;
  if (!h) return <p>Loading…</p>;
  return (
    <>
      <Steps current={3} />
      <h1 className="mb-3 text-2xl font-semibold sm:text-3xl">Pay Rs. {h.amount}</h1>
      <div className="card">
        <Countdown seconds={h.ttl} onEnd={expired} />
        {err && <p className="alert-error mt-3" role="alert">{err}</p>}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className="btn" disabled={busy} onClick={() => pay(true)}>{busy ? "Processing…" : "Pay now"}</button>
          <button className="btn-ghost" disabled={busy} onClick={() => pay(false)}>Simulate failed payment</button>
          <button className="btn-ghost" disabled={busy} onClick={release}>Release seats</button>
        </div>
      </div>
    </>
  );
}
