import { useEffect, useState } from "react";
interface Props { seconds: number; onEnd: () => void }
export default function Countdown({ seconds, onEnd }: Props) {
  const [s, setS] = useState(seconds);
  useEffect(() => { const t = setInterval(() => setS((v) => v - 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (s <= 0) onEnd(); }, [s, onEnd]);
  const left = Math.max(s, 0);
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return <strong className={s < 60 ? "text-red-700 dark:text-red-400" : ""} role="timer">Seats held for {mm}:{ss}</strong>;
}
