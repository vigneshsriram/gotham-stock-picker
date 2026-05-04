import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { fetchChart, type ChartResult } from "../api/yahoo";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  TimeScale,
);

const REFRESH_MS = 60_000; // 1 minute

interface Props {
  ticker: string;
}

export default function StockChart({ ticker }: Props) {
  const [data, setData] = useState<ChartResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    let timer: number | undefined;

    async function load() {
      setLoading(true);
      try {
        const next = await fetchChart(ticker);
        if (!aliveRef.current) return;
        setData(next);
        setError(null);
        setLastUpdated(new Date());
      } catch (e) {
        if (!aliveRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    }

    load();
    timer = window.setInterval(load, REFRESH_MS);
    return () => {
      aliveRef.current = false;
      if (timer) window.clearInterval(timer);
    };
  }, [ticker]);

  const chartData = useMemo(() => {
    const points = data?.points ?? [];
    return {
      labels: points.map((p) =>
        new Date(p.t * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      ),
      datasets: [
        {
          label: `${data?.symbol ?? ticker} price`,
          data: points.map((p) => p.price),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          fill: true,
        },
      ],
    };
  }, [data, ticker]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { parsed: { y: number } }) =>
              formatPrice(ctx.parsed.y, data?.currency),
          },
        },
      },
      scales: {
        x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } },
        y: {
          ticks: {
            callback: (v: string | number) =>
              formatPrice(Number(v), data?.currency),
          },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
      },
    }),
    [data?.currency],
  );

  const price = data?.regularMarketPrice ?? data?.points.at(-1)?.price ?? null;
  const change =
    price != null && data?.previousClose != null
      ? price - data.previousClose
      : null;
  const changePct =
    change != null && data?.previousClose
      ? (change / data.previousClose) * 100
      : null;

  return (
    <section className="chart-card">
      <div className="chart-header">
        <div>
          <div className="symbol">{data?.symbol ?? ticker}</div>
          <div className="price">
            {price != null ? formatPrice(price, data?.currency) : "—"}
            {change != null && changePct != null && (
              <span className={change >= 0 ? "delta up" : "delta down"}>
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)} ({changePct.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
        <div className="status">
          {loading && <span>Refreshing…</span>}
          {!loading && lastUpdated && (
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {error ? (
        <div className="error">Couldn't load {ticker}: {error}</div>
      ) : (
        <div className="chart-wrap">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </section>
  );
}

function formatPrice(n: number, currency: string | null | undefined): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}
