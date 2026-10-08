import type { RefObject } from "react";
import { ThemeAnimationType, useModeAnimation } from "react-theme-switch-animation";

export default function ThemeToggle() {
  const { ref, toggleSwitchTheme, isDarkMode } = useModeAnimation({ animationType: ThemeAnimationType.CIRCLE, duration: 700 });
  return (
    <button
      ref={ref as RefObject<HTMLButtonElement>}
      type="button"
      role="switch"
      aria-checked={isDarkMode}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleSwitchTheme}
      className="relative h-8 w-16 shrink-0 rounded-full bg-white/25 transition-colors focus-visible:outline focus-visible:outline-4 focus-visible:outline-held"
    >
      <span aria-hidden className="absolute left-1.5 top-1/2 -translate-y-1/2 text-sm">☀️</span>
      <span aria-hidden className="absolute right-1.5 top-1/2 -translate-y-1/2 text-sm">🌙</span>
      <span aria-hidden className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300 ${isDarkMode ? "left-9" : "left-1"}`} />
    </button>
  );
}
