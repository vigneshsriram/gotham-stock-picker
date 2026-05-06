# Gotham Stock Picker — Project Status

## What Was Built

A quality compounder stock analysis dashboard deployed at **https://gotham-stock-picker.vercel.app/**

### Tech Stack
- **Vite + React + TypeScript**
- **Recharts** for all charts (replaced the original Chart.js)
- **Alpha Vantage API** for fundamental data (free tier: 25 req/day)
- **Vercel** for hosting (auto-deploys from GitHub on push to `main`)

---

## Completed Work

### Core Dashboard
- **10 metric cards** analyzing quality compounder characteristics:
  1. Revenue Growth — bar+line chart, 10yr CAGR, YoY growth
  2. FCF Generation — area chart, FCF vs Operating Cash Flow
  3. Operating Margin — dual-area chart, gross + operating margin trend
  4. ROIC — line chart with 15% and 20% reference lines
  5. Balance Sheet — bars (equity + net debt) + D/EBITDA line
  6. EPS Growth — bar chart with negative EPS coloring
  7. CapEx Efficiency — line chart with 5% asset-light threshold
  8. Moat Score — grouped bars (gross margin, op margin, ROIC) + sub-score progress bars
  9. Management Quality — FCF margin trend + indexed share count
  10. Valuation — interactive DCF sliders (growth/discount/terminal rate), price vs intrinsic value bar, P/E / PEG / EV/FCF / FCF Yield table

- **Overall compounder score** (0–100) with SVG arc gauge and radar chart
- **Scoring logic** — each metric scores 0–10 based on configurable thresholds in `calculations.ts`

### Infrastructure
- **24h localStorage cache** for fundamentals, 1h for quotes — subsequent loads cost 0 API calls
- **Watchlist** — persisted in localStorage, capped at 20 tickers
- **API key UI** — paste a fresh key in the sidebar without touching code; saves to localStorage
- **No auto-load on startup** — zero API calls until user searches (prevents burning quota on page load)
- **Retry button** on error screen — after saving a new key, one click retries without re-typing ticker
- **Empty state** with 🔑 warning if no API key is configured

### Code Quality
- Shared `TOOLTIP_STYLE` and `TICK_STYLE` / `TICK_STYLE_SM` constants used across all 10 chart components
- Shared `fmtBn`, `fmtPct`, `fmtNum`, `fmtPrice` formatters in `calculations.ts`
- Removed unused `chart.js`, `react-chartjs-2`, `lucide-react` dependencies
- Fixed stale closure bug in watchlist `useEffect` (functional updater pattern)
- Sequential AV fetches with 300ms delays to respect 5 req/min rate limit

---

## Key File Paths

```
src/
├── api/
│   └── alphaVantage.ts       # AV client, caching, getApiKey/setApiKey/hasApiKey
├── components/
│   ├── CompanyHeader.tsx      # Price, P/E, EPS, Beta, 52W range, Market Cap
│   ├── MetricCard.tsx         # Reusable card wrapper with score badge
│   ├── OverallScore.tsx       # SVG gauge + RadarChart
│   ├── Sidebar.tsx            # Search, watchlist, API key section
│   └── metrics/
│       ├── RevenueGrowth.tsx
│       ├── FCFGeneration.tsx
│       ├── OperatingMargin.tsx
│       ├── ROICMetric.tsx
│       ├── BalanceSheet.tsx
│       ├── EPSGrowth.tsx
│       ├── CapExEfficiency.tsx
│       ├── MoatScore.tsx
│       ├── ManagementScore.tsx
│       └── Valuation.tsx      # DCF with interactive sliders
├── hooks/
│   └── useStockData.ts        # Fetches all 4 AV endpoints, aligns by fiscal year, computes metrics
├── types/
│   └── index.ts               # AnnualData, StockAnalysis, StockScores, DCFInputs
├── utils/
│   └── calculations.ts        # All financial math + shared chart constants + formatters
├── App.tsx                    # Layout, watchlist state, retry logic
└── styles.css                 # Dark Bloomberg theme, all component styles
```

---

## Remaining / Future Tasks

### High Priority
- [ ] **Merge PR #1** into `main` on GitHub so Vercel deploys from main (currently deploying from feature branch)
- [ ] **Remove `VITE_AV_KEY` from Vercel env vars** — no baked-in key needed since UI handles it
- [ ] **Upgrade Alpha Vantage plan** or switch to Financial Modeling Prep ($14/mo, 250 req/day free) if 25 req/day becomes limiting

### Features / Improvements
- [ ] **Year range slider** — currently fixed at 10 years, spec called for 5/10/15/20 toggle
- [ ] **Side-by-side comparison** — compare two tickers (doubles API calls, needs caching strategy)
- [ ] **Historical P/E chart** — show current P/E vs 10yr average in the Valuation card
- [ ] **Export to PDF** — print-friendly version of the full analysis
- [ ] **Notes/thesis field** — per-ticker text box for investment thesis (saved in localStorage)
- [ ] **Score history** — track how a stock's score changes over time as new annual data releases
- [ ] **Bundle splitting** — Recharts adds ~500KB; lazy-load metric components to improve initial load

### Data Source Options (if upgrading from AV free)
| Provider | Free | Paid | Notes |
|---|---|---|---|
| Alpha Vantage (current) | 25/day | $50/mo | Fine with caching |
| **Financial Modeling Prep** | 250/day | $14/mo | Best value, same data |
| Tiingo | 500/day | $10/mo | Good alternative |

---

## How to Run Locally

```bash
# Install dependencies
npm install

# Create .env file with your AV key
echo "VITE_AV_KEY=YOUR_KEY_HERE" > .env

# Start dev server
npm run dev
# → http://localhost:5173

# Build for production
npm run build
```

## Deployment

- **Platform**: Vercel (auto-deploy on push)
- **Repo**: https://github.com/vigneshsriram/gotham-stock-picker
- **Live URL**: https://gotham-stock-picker.vercel.app/
- **Open PR**: https://github.com/vigneshsriram/gotham-stock-picker/pull/1

> ⚠️ Remove `VITE_AV_KEY` from Vercel environment variables — the app manages keys via the in-app UI stored in browser localStorage.
