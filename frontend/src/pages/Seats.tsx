import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import { api, ApiError, errorMessage } from "../services/api";
import Steps from "../components/Steps";
import { cleanName, normalizePhone, validateContact, validateName } from "../utils";
import type { Seat, SeatPosition, Train } from "../types";

type Filter = "ALL" | SeatPosition;
const FILTERS: { key: Filter; label: string }[] = [{ key: "ALL", label: "All" }, { key: "WINDOW", label: "🪟 Window" }, { key: "AISLE", label: "🚶 Aisle" }];

export default function Seats() {
  const { id = "" } = useParams();
  const [q] = useSearchParams();
  const date = q.get("date") ?? "", cls = q.get("cls") ?? "SL";
  const train = (useLocation().state as { train?: Train } | null)?.train;
  const nav = useNavigate();

  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<number[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [err, setErr] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [names, setNames] = useState<Record<number, string>>({});   // seat id -> passenger name
  const [c, setC] = useState({ email: "", phone: "" });             // shared contact details
  const [touched, setTouched] = useState(false);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr("");
    try {
      const all = await api.seats(id, date, cls);
      setSeats(all);
      setPick((cur) => cur.filter((s) => all.some((a) => a.id === s && a.state === "FREE")));
    } catch (e) { setLoadErr(errorMessage(e, "Could not load seats.")); }
    finally { setLoading(false); }
  }, [id, date, cls]);
  useEffect(() => { load(); }, [load]);

  // Every seat is shown; only FREE ones can be selected. Booked/held seats are labelled and disabled.
  const free = useMemo(() => seats.filter((s) => s.state === "FREE"), [seats]);
  const counts = { ALL: free.length, WINDOW: free.filter((s) => s.position === "WINDOW").length, AISLE: free.filter((s) => s.position === "AISLE").length };
  const visible = filter === "ALL" ? seats : seats.filter((s) => s.position === filter);
  const chosen = free.filter((s) => pick.includes(s.id));
  const total = chosen.reduce((a, s) => a + s.fare, 0);
  const nameErrs: Record<number, string> = Object.fromEntries(chosen.map((s) => [s.id, validateName(names[s.id] ?? "")]));
  const cErrs = validateContact(c);
  const invalid = chosen.some((s) => nameErrs[s.id]) || Object.keys(cErrs).length > 0;

  const toggle = (s: Seat) => {
    if (s.state !== "FREE") return;
    setErr("");
    setPick(pick.includes(s.id) ? pick.filter((x) => x !== s.id) : [...pick, s.id]);
  };

  function toReview() {
    setTouched(true); setErr("");
    if (!pick.length) return setErr("Select at least one seat.");
    if (invalid) return setErr("Please fix the highlighted passenger details.");
    setReview(true); window.scrollTo({ top: 0 });
  }

  async function confirm() {
    setBusy(true); setErr("");
    try {
      const h = await api.hold({ train_id: Number(id), travel_date: date, cls, seat_ids: chosen.map((s) => s.id),
        // passengers[i] travels in seat_ids[i]: one name per selected seat
        passengers: chosen.map((s) => ({ name: cleanName(names[s.id] ?? ""), email: c.email.trim(), phone: normalizePhone(c.phone) })) });
      nav(`/pay/${h.hold_id}`);
    } catch (e) {
      const ex = e as ApiError;
      if (ex.status === 409) { setErr("Someone else just took one of those seats. Please choose again."); setPick([]); setReview(false); load(); }
      else if (ex.status === 422) { setErr(ex.message); setReview(false); }
      else setErr(errorMessage(e, "Could not hold your seats."));
    } finally { setBusy(false); }
  }

  if (!date) return <p className="alert-error">Missing travel date. <Link className="underline" to="/">Start a new search</Link>.</p>;

  const cls_ = (bad?: string) => `field ${touched && bad ? "field-error" : ""}`;
  const Err = ({ m }: { m?: string }) => (touched && m ? <p className="err-text" role="alert">{m}</p> : null);

  /* ---------- Confirmation step ---------- */
  if (review) {
    return (
      <>
        <Steps current={2} />
        <h1 className="mb-4 text-2xl font-semibold sm:text-3xl">Review your booking</h1>
        <div className="card space-y-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Row k="Train" v={train ? `${train.number} · ${train.name}` : `Train #${id}`} />
            {train && <Row k="Route" v={`${train.source} → ${train.destination}`} />}
            {train && <Row k="Departure" v={train.departure} />}
            <Row k="Date" v={date} /><Row k="Class" v={cls} />
            <Row k="Email" v={c.email.trim()} /><Row k="Phone" v={normalizePhone(c.phone)} />
          </dl>
          <div>
            <h2 className="mb-2 font-semibold">Passengers ({chosen.length})</h2>
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
              {chosen.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="font-medium break-words">{cleanName(names[s.id] ?? "")}</span>
                  <span className="shrink-0 text-sm text-slate-600 dark:text-slate-300">Seat {s.number} · {s.position === "WINDOW" ? "window" : "aisle"} · Rs. {s.fare}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="border-t border-slate-200 pt-3 text-lg font-semibold dark:border-slate-700">Total: Rs. {total}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Confirming holds these seats for 10 minutes while you pay.</p>
        </div>
        {err && <p className="alert-error mt-4" role="alert">{err}</p>}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className="btn flex-1" onClick={confirm} disabled={busy}>{busy ? "Holding seats…" : "Confirm & continue to payment"}</button>
          <button className="btn-ghost" onClick={() => setReview(false)} disabled={busy}>← Edit details</button>
        </div>
      </>
    );
  }

  /* ---------- Seat + details step ---------- */
  return (
    <>
      <Steps current={1} />
      <h1 className="mb-1 text-2xl font-semibold sm:text-3xl">Choose seats</h1>
      <p className="mb-4 text-slate-600 dark:text-slate-300">{train ? `${train.number} ${train.name} · ` : ""}{cls} · {date}</p>

      <section className="card" aria-labelledby="seat-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="seat-h" className="font-semibold">Seats ({counts.ALL} available of {seats.length})</h2>
          <button className="text-sm underline" onClick={load} disabled={loading}>↻ Refresh</button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter seats by position">
          {FILTERS.map((x) => (
            <button key={x.key} type="button" aria-pressed={filter === x.key} onClick={() => setFilter(x.key)} className={`chip ${filter === x.key ? "chip-on" : ""}`}>{x.label} ({counts[x.key]})</button>
          ))}
        </div>
        {loading && <p>Loading seats…</p>}
        {loadErr && <p className="alert-error" role="alert">{loadErr} <button className="underline" onClick={load}>Retry</button></p>}
        {!loading && !loadErr && seats.length > 0 && free.length === 0 && <p className="mb-3 font-medium">All seats in this class are booked or on hold for this date.</p>}
        {!loading && !loadErr && visible.length === 0 && <p>No seats match this filter. Try “All”.</p>}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="group" aria-label="Seats">
          {visible.map((s) => {
            const on = pick.includes(s.id);
            const unavailable = s.state !== "FREE";
            const pos = s.position === "WINDOW" ? "window" : "aisle";
            const text = s.state === "BOOKED" ? "Booked" : s.state === "HELD" ? "Held" : pos;
            const look = s.state === "BOOKED"
              ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400"
              : s.state === "HELD"
              ? "cursor-not-allowed border-held bg-held/30 text-ink dark:text-slate-100"
              : on
              ? "border-rail bg-rail text-white dark:border-teal-500 dark:bg-teal-600"
              : "border-rail bg-white hover:bg-rail/10 dark:border-teal-400 dark:bg-slate-800 dark:hover:bg-teal-400/10";
            return (
              <button key={s.id} type="button" disabled={unavailable} aria-pressed={unavailable ? undefined : on} onClick={() => toggle(s)}
                aria-label={unavailable ? `Seat ${s.number}, ${text.toLowerCase()}, not available` : `Seat ${s.number}, ${pos}, Rs. ${s.fare}`}
                className={`flex flex-col items-center rounded-lg border-2 py-2 transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-held ${look}`}>
                <span className={`font-semibold ${s.state === "BOOKED" ? "line-through" : ""}`}>{s.number}</span>
                <span className={`text-[10px] uppercase tracking-wide ${unavailable ? "font-bold" : "opacity-80"}`}>{text}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          <span className="mr-1 inline-block h-3 w-3 rounded-sm border-2 border-rail align-middle dark:border-teal-400" /> Available
          <span className="ml-4 mr-1 inline-block h-3 w-3 rounded-sm bg-rail align-middle dark:bg-teal-600" /> Selected
          <span className="ml-4 mr-1 inline-block h-3 w-3 rounded-sm bg-slate-300 align-middle dark:bg-slate-600" /> Booked
          <span className="ml-4 mr-1 inline-block h-3 w-3 rounded-sm bg-held/50 align-middle" /> Held by another user (up to 10 min)
        </p>
      </section>

      <section className="card mt-4" aria-labelledby="pax-h">
        <h2 id="pax-h" className="mb-1 font-semibold">Passenger details</h2>
        {chosen.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-300">Select one or more seats above. You'll enter one passenger name for each seat.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">One name per seat, as on the passenger's ID proof.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {chosen.map((s, i) => (
                <div key={s.id}>
                  <label htmlFor={`pn-${s.id}`} className="label">Passenger {i + 1} · Seat {s.number} ({s.position === "WINDOW" ? "window" : "aisle"})</label>
                  <input id={`pn-${s.id}`} className={cls_(nameErrs[s.id])} autoComplete={i === 0 ? "name" : "off"} value={names[s.id] ?? ""}
                    onChange={(e) => setNames({ ...names, [s.id]: e.target.value })} placeholder="Full name" aria-invalid={touched && !!nameErrs[s.id]} />
                  <Err m={nameErrs[s.id]} />
                </div>
              ))}
            </div>
            <h3 className="mb-2 mt-5 font-medium">Contact for this booking</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pe" className="label">Email</label>
                <input id="pe" type="email" className={cls_(cErrs.email)} autoComplete="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} placeholder="name@example.com" aria-invalid={touched && !!cErrs.email} />
                <Err m={cErrs.email} />
              </div>
              <div>
                <label htmlFor="pp" className="label">Mobile number</label>
                <input id="pp" type="tel" inputMode="numeric" className={cls_(cErrs.phone)} autoComplete="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="10-digit number" aria-invalid={touched && !!cErrs.phone} />
                <Err m={cErrs.phone} />
              </div>
            </div>
          </>
        )}
      </section>

      {err && <p className="alert-error mt-4" role="alert">{err}</p>}
      <div className="sticky bottom-0 -mx-4 mt-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-paper/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <p className="text-sm"><b>{pick.length}</b> seat{pick.length === 1 ? "" : "s"}{chosen.length > 0 && chosen.length <= 6 && <> ({chosen.map((s) => s.number).join(", ")})</>} · <b>Rs. {total}</b></p>
        <button className="btn" onClick={toReview}>Review booking →</button>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-sm text-slate-500 dark:text-slate-400">{k}</dt><dd className="font-medium break-words">{v}</dd></div>;
}
