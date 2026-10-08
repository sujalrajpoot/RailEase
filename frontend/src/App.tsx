import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Search from "./pages/Search";
import Seats from "./pages/Seats";
import Payment from "./pages/Payment";
import TicketPage from "./pages/Ticket";
import ThemeToggle from "./components/ThemeToggle";
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-ink">Skip to content</a>
        <header className="bg-rail text-white dark:bg-slate-800">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="text-lg font-bold">🚆 RailEase</Link>
            <nav className="flex items-center gap-3 sm:gap-5" aria-label="Main">
              <Link to="/ticket" className="text-sm font-medium underline-offset-4 hover:underline sm:text-base">Find / cancel ticket</Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
          <Routes>
            <Route path="/" element={<Search />} />
            <Route path="/train/:id" element={<Seats />} />
            <Route path="/pay/:holdId" element={<Payment />} />
            <Route path="/ticket/:pnr?" element={<TicketPage />} />
            <Route path="*" element={<p>Page not found. <Link className="underline" to="/">Go home</Link></p>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
