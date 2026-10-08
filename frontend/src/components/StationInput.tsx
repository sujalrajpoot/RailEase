import { useEffect, useId, useMemo, useRef, useState } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  error?: string;
  placeholder?: string;
}

/** Combobox: pick from the dropdown OR type any station name manually. */
export default function StationInput({ label, value, onChange, options, error, placeholder }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  const q = value.trim().toLowerCase();
  const shown = useMemo(() => {
    const starts = options.filter((o) => o.toLowerCase().startsWith(q));
    const rest = options.filter((o) => !o.toLowerCase().startsWith(q) && o.toLowerCase().includes(q));
    return q ? [...starts, ...rest] : options;
  }, [options, q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (v: string) => { onChange(v); setOpen(false); setActive(-1); };

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && open && active >= 0 && shown[active]) { e.preventDefault(); pick(shown[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input
          id={id}
          className={`field pr-10 ${error ? "field-error" : ""}`}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Show ${label} stations`}
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 dark:text-slate-400"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {shown.length === 0 && <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No match. You can keep typing your own station.</li>}
          {shown.map((o, i) => (
            <li key={o} role="option" aria-selected={o === value}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? "bg-rail/10 dark:bg-teal-400/15" : ""} ${o === value ? "font-semibold" : ""}`}>
              {o}
            </li>
          ))}
        </ul>
      )}
      {error && <p id={`${id}-err`} className="err-text" role="alert">{error}</p>}
    </div>
  );
}
