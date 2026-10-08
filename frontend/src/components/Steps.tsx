const LABELS = ["Search", "Seats", "Review", "Pay", "Ticket"];
export default function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex items-center justify-between gap-1 text-xs sm:text-sm" aria-label="Booking progress">
      {LABELS.map((l, i) => {
        const done = i < current, on = i === current;
        return (
          <li key={l} className="flex flex-1 flex-col items-center gap-1" aria-current={on ? "step" : undefined}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 font-semibold ${on ? "border-rail bg-rail text-white dark:border-teal-500 dark:bg-teal-600" : done ? "border-rail text-rail dark:border-teal-400 dark:text-teal-300" : "border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500"}`}>{done ? "✓" : i + 1}</span>
            <span className={on ? "font-semibold" : "text-slate-500 dark:text-slate-400"}>{l}</span>
          </li>
        );
      })}
    </ol>
  );
}
