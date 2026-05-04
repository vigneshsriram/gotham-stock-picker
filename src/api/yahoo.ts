// Minimal Yahoo Finance client. We hit the v8 chart endpoint, which returns
// both the latest quote and an intraday series we can plot directly.
//
// In dev, requests go through the Vite proxy at /yf -> query1.finance.yahoo.com
// (see vite.config.ts) to dodge CORS. In production you'll need a tiny backend
// or a CORS proxy doing the same rewrite.

export interface ChartPoint {
  t: number; // unix seconds
  price: number;
}

export interface ChartResult {
  symbol: string;
  currency: string | null;
  regularMarketPrice: number | null;
  previousClose: number | null;
  points: ChartPoint[];
}

interface YahooChartResponse {
  chart: {
    result:
      | Array<{
          meta: {
            symbol: string;
            currency?: string;
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
          };
          timestamp?: number[];
          indicators: {
            quote: Array<{
              close?: Array<number | null>;
            }>;
          };
        }>
      | null;
    error: { code: string; description: string } | null;
  };
}

export async function fetchChart(
  ticker: string,
  { interval = "1m", range = "1d" }: { interval?: string; range?: string } = {},
): Promise<ChartResult> {
  const url = `/yf/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?interval=${interval}&range=${range}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Yahoo request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as YahooChartResponse;

  if (json.chart.error) {
    throw new Error(json.chart.error.description || json.chart.error.code);
  }
  const result = json.chart.result?.[0];
  if (!result) throw new Error(`No data for "${ticker}"`);

  const closes = result.indicators.quote[0]?.close ?? [];
  const stamps = result.timestamp ?? [];
  const points: ChartPoint[] = [];
  for (let i = 0; i < stamps.length; i++) {
    const c = closes[i];
    if (typeof c === "number" && Number.isFinite(c)) {
      points.push({ t: stamps[i], price: c });
    }
  }

  return {
    symbol: result.meta.symbol,
    currency: result.meta.currency ?? null,
    regularMarketPrice: result.meta.regularMarketPrice ?? null,
    previousClose:
      result.meta.chartPreviousClose ?? result.meta.previousClose ?? null,
    points,
  };
}
