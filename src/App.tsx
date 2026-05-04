import { useState } from "react";
import StockChart from "./components/StockChart";

export default function App() {
  const [ticker, setTicker] = useState("AAPL");
  const [draft, setDraft] = useState("AAPL");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = draft.trim().toUpperCase();
    if (next) setTicker(next);
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Gotham Stock Picker</h1>
        <form onSubmit={onSubmit} className="ticker-form">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Enter a ticker (e.g. AAPL)"
            spellCheck={false}
            autoCapitalize="characters"
          />
          <button type="submit">Load</button>
        </form>
      </header>

      <main>
        <StockChart ticker={ticker} />
      </main>

      <footer className="footer">
        Data from Yahoo Finance, refreshed every 60s.
      </footer>
    </div>
  );
}
