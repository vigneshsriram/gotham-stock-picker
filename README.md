# Gotham Stock Picker

A minimal React + Vite stock viewer. Type a ticker, see the live price and a
1-day intraday line chart. Auto-refreshes every minute.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## How the data flows

The browser hits `/yf/...`, which Vite's dev server proxies to
`https://query1.finance.yahoo.com/...` (see `vite.config.ts`). This is purely
to dodge CORS — Yahoo's chart endpoint is free but doesn't allow direct browser
calls.

For production you'd need either:

- a tiny backend doing the same proxy, or
- a public CORS proxy (less reliable), or
- an API that supports CORS from the browser (Finnhub, Alpha Vantage, etc.)

## Next steps

- Add a watchlist / multi-ticker view
- Range selector (1D / 5D / 1M / 1Y)
- Pull fundamentals (P/E, market cap) from Yahoo's `quoteSummary` endpoint
- Deploy with a backend proxy
