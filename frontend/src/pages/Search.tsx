import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, errorMessage } from "../services/api";
import StationInput from "../components/StationInput";
import Steps from "../components/Steps";
import { DEFAULT_STATIONS, todayISO, validateRoute } from "../utils";
import type { Train } from "../types";

export default function Search() {
  const [f, setF] = useState({ s: "Delhi", d: "Kolkata", date: "", cls: "SL" });
  const [errs, setErrs] = useState({ s: "", d: "", date: "" });
  const [stations, setStations] = useState<string[]>(DEFAULT_STATIONS);
  const [trains, setTrains] = useState<Train[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    api.stations().then((l) => l.length && setStations(Array.from(new Set([...l, ...DEFAULT_STATIONS])).sort())).catch(() => { /* keep fallback list */ });
  }, []);

  const swap = () => setF((x) => ({ ...x, s: x.d, d: x.s }));

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const v = validateRoute(f.s, f.d, f.date);
    setErrs(v); setApiErr(""); setTrains(null);
    if (v.s || v.d || v.date) return;
    setLoading(true);
    try { setTrains(await api.search(f.s.trim(), f.d.trim())); }
    catch (ex) { setApiErr(errorMessage(ex, "Could not search trains.")); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Steps current={0} />
      <h1 className="mb-4 text-2xl font-semibold sm:text-3xl">Where are you going?</h1>
      <form onSubmit={search} noValidate className="card grid gap-4 sm:grid-cols-2">
        <StationInput label="From" value={f.s} onChange={(s) => setF({ ...f, s })} options={stations} error={errs.s} placeholder="Select or type a station" />
        <StationInput label="To" value={f.d} onChange={(d) => setF({ ...f, d })} options={stations} error={errs.d} placeholder="Select or type a station" />
        <div>
          <label htmlFor="date" className="label">Travel date</label>
          <input id="date" type="date" min={todayISO()} className={`field ${errs.date ? "field-error" : ""}`} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} aria-invalid={!!errs.date} />
          {errs.date && <p className="err-text" role="alert">{errs.date}</p>}
        </div>
        <div>
          <label htmlFor="cls" className="label">Class</label>
          <select id="cls" className="field" value={f.cls} onChange={(e) => setF({ ...f, cls: e.target.value })}>
            <option value="SL">Sleeper (SL)</option>
            <option value="3A">AC 3 Tier (3A)</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
          <button className="btn flex-1" type="submit" disabled={loading}>{loading ? "Searching…" : "Search trains"}</button>
          <button className="btn-ghost" type="button" onClick={swap}>⇄ Swap stations</button>
        </div>
      </form>

      {apiErr && <p className="alert-error mt-4" role="alert">{apiErr}</p>}
      {trains?.length === 0 && <p className="mt-4">No trains on this route. Try {stations.slice(0, 2).join(" ↔ ")} or pick from the dropdown.</p>}
      <div className="mt-4 space-y-3">
        {trains?.map((t) => (
          <div key={t.id} className="card flex flex-col gap-3 border-l-[6px] !border-l-rail sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{t.number} · {t.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{t.source} {t.departure} → {t.destination} {t.arrival}</p>
            </div>
            <button className="btn" onClick={() => nav(`/train/${t.id}?date=${f.date}&cls=${f.cls}`, { state: { train: t } })}>Pick seats</button>
          </div>
        ))}
      </div>
    </>
  );
}
