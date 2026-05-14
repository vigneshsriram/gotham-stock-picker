import { useState, useEffect } from 'react';
import type { StockAnalysis, AnnualData, DCFInputs } from '../types';
import { fetchProfile, fetchIncomeStatements, fetchBalanceSheets, fetchCashFlows, fetchQuote, fetchNextEarnings } from '../api/fmp';
import { safeNum } from '../api/apiClient';
import { cagr, mean, calcROIC, calcDCF, calcAllScores } from '../utils/calculations';
import { loadStockCacheDB, saveStockCacheDB } from '../lib/db';

export function useStockData(symbol: string, retryKey = 0): { data: StockAnalysis | null; loading: boolean; error: string | null; status: string } {
  const [data, setData] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setData(null);
      setStatus('');

      try {
        // ── Check shared DB cache first ──────────────────────────
        setStatus('Checking cache…');
        const cached = await loadStockCacheDB(symbol);
        if (cached && !cancelled) {
          // Fetch live price — it changes constantly
          setStatus('Fetching current price…');
          const quote = await fetchQuote(symbol);
          if (!cancelled) {
            const price = Number.isFinite(quote.price) ? quote.price : cached.currentPrice;
            // Recompute price-dependent fields from live price — cached values may be stale/null
            const peRatio = Number.isFinite(cached.eps) && cached.eps > 0
              ? price / cached.eps : NaN;
            const epsGrowthRate = Number.isFinite(cached.epsCAGR) && cached.epsCAGR > 0
              ? cached.epsCAGR * 100 : NaN;
            const pegRatio = Number.isFinite(peRatio) && Number.isFinite(epsGrowthRate) && epsGrowthRate > 0
              ? peRatio / epsGrowthRate : NaN;
            const dividendYield = Number.isFinite(cached.lastDividend) && cached.lastDividend > 0
              ? cached.lastDividend / price : NaN;
            setData({ ...cached, currentPrice: price, priceChange: quote.change, priceChangePct: quote.changePercentage, peRatio, pegRatio, dividendYield });
          }
          return;
        }

        // ── Cache miss — fetch fresh from FMP ───────────────────
        setStatus('Fetching company profile…');
        const profile = await fetchProfile(symbol);
        setStatus('Fetching income statement…');
        const incomeStatements = await fetchIncomeStatements(symbol);
        setStatus('Fetching balance sheet…');
        const balanceSheets = await fetchBalanceSheets(symbol);
        setStatus('Fetching cash flow…');
        const cashFlows = await fetchCashFlows(symbol);
        setStatus('Fetching current price…');
        const quote = await fetchQuote(symbol);
        const currentPrice = quote.price;

        if (cancelled) return;

        // Align by year (FMP returns newest-first; reverse to oldest-first)
        const incomeByYear = new Map(incomeStatements.map(r => [r.date.slice(0, 4), r]));
        const balanceByYear = new Map(balanceSheets.map(r => [r.date.slice(0, 4), r]));
        const cashByYear = new Map(cashFlows.map(r => [r.date.slice(0, 4), r]));

        const sortedYears = [...incomeStatements]
          .slice(0, 10)
          .map(r => r.date.slice(0, 4))
          .reverse();

        const annualData: AnnualData[] = [];

        for (const year of sortedYears) {
          const inc = incomeByYear.get(year);
          const bal = balanceByYear.get(year);
          const cf = cashByYear.get(year);
          if (!inc || !bal || !cf) continue;

          const revenue = safeNum(inc.revenue);
          const grossProfit = safeNum(inc.grossProfit);
          const operatingIncome = safeNum(inc.operatingIncome);
          const netIncome = safeNum(inc.netIncome);
          const incomeTax = safeNum(inc.incomeTaxExpense);
          const incomeBeforeTax = safeNum(inc.incomeBeforeTax);
          const depreciation = safeNum(cf.depreciationAndAmortization ?? inc.depreciationAndAmortization);

          let ebitda = safeNum(inc.ebitda);
          if (!Number.isFinite(ebitda) || ebitda === 0) {
            ebitda = Number.isFinite(operatingIncome) && Number.isFinite(depreciation)
              ? operatingIncome + depreciation : NaN;
          }

          const totalAssets = safeNum(bal.totalAssets);
          const totalEquity = safeNum(bal.totalStockholdersEquity);
          const longTermDebt = safeNum(bal.longTermDebt);
          const shortTermDebt = safeNum(bal.shortTermDebt);
          const cash = safeNum(bal.cashAndCashEquivalents);
          const currentLiabilities = safeNum(bal.totalCurrentLiabilities);
          const sharesOutstanding = safeNum(inc.weightedAverageShsOut);

          const operatingCashFlow = safeNum(cf.operatingCashFlow);
          // FMP capitalExpenditure is already negative — use freeCashFlow if available
          const capEx = Math.abs(safeNum(cf.capitalExpenditure));
          const fcf = Number.isFinite(cf.freeCashFlow)
            ? safeNum(cf.freeCashFlow)
            : Number.isFinite(operatingCashFlow) && Number.isFinite(capEx)
              ? operatingCashFlow - capEx : NaN;

          const grossMargin = revenue !== 0 ? grossProfit / revenue : NaN;
          const operatingMargin = revenue !== 0 ? operatingIncome / revenue : NaN;
          const netMargin = revenue !== 0 ? netIncome / revenue : NaN;
          const fcfMargin = Number.isFinite(fcf) && revenue !== 0 ? fcf / revenue : NaN;

          const roic = calcROIC({ operatingIncome, incomeTax, incomeBeforeTax, totalAssets, currentLiabilities, cash });

          const netDebt = Number.isFinite(longTermDebt) && Number.isFinite(shortTermDebt) && Number.isFinite(cash)
            ? longTermDebt + shortTermDebt - cash
            : Number.isFinite(longTermDebt) && Number.isFinite(cash) ? longTermDebt - cash : NaN;

          const debtToEbitda = Number.isFinite(netDebt) && Number.isFinite(ebitda) && ebitda > 0
            ? netDebt / ebitda : NaN;

          const capExPct = Number.isFinite(capEx) && revenue !== 0 ? capEx / revenue : NaN;

          // Use FMP's reported EPS (diluted) directly; fall back to computed
          const eps = Number.isFinite(inc.epsDiluted) ? inc.epsDiluted
            : (Number.isFinite(netIncome) && Number.isFinite(sharesOutstanding) && sharesOutstanding > 0
              ? netIncome / sharesOutstanding : NaN);

          annualData.push({
            year,
            revenue, grossProfit, operatingIncome, netIncome, ebitda,
            incomeTax, incomeBeforeTax,
            totalAssets, totalEquity, longTermDebt, shortTermDebt, cash,
            sharesOutstanding, currentLiabilities,
            operatingCashFlow, capEx, depreciation, fcf,
            grossMargin, operatingMargin, netMargin, fcfMargin,
            roic, debtToEbitda, capExPct, eps, netDebt,
          });
        }

        if (annualData.length === 0) {
          throw new Error(`Could not align annual data for ${symbol}`);
        }

        const first = annualData[0];
        const last = annualData[annualData.length - 1];
        const years10 = annualData.length - 1 || 1;

        const revenueCAGR = cagr(first.revenue, last.revenue, years10);
        const epsCAGR = (() => {
          const firstEps = annualData.find(d => Number.isFinite(d.eps) && d.eps > 0)?.eps ?? NaN;
          const lastEps = [...annualData].reverse().find(d => Number.isFinite(d.eps) && d.eps > 0)?.eps ?? NaN;
          return cagr(firstEps, lastEps, years10);
        })();
        const fcfCAGR = (() => {
          const firstFcf = annualData.find(d => Number.isFinite(d.fcf) && d.fcf > 0)?.fcf ?? NaN;
          const lastFcf = [...annualData].reverse().find(d => Number.isFinite(d.fcf) && d.fcf > 0)?.fcf ?? NaN;
          return cagr(firstFcf, lastFcf, years10);
        })();

        const avgROIC = mean(annualData.map(d => d.roic));
        const avgOperatingMargin = mean(annualData.map(d => d.operatingMargin));
        const avgFCFMargin = mean(annualData.map(d => d.fcfMargin));

        const latestFCF = last.fcf;
        const latestShares = last.sharesOutstanding;

        const dcfGrowth = Number.isFinite(fcfCAGR) ? Math.min(fcfCAGR, 0.15) : 0.08;
        const dcfInputs: DCFInputs = {
          growth: Math.max(0.01, dcfGrowth),
          discount: 0.10,
          terminal: 0.03,
        };

        const intrinsicValue = calcDCF(latestFCF, latestShares, dcfInputs);

        // FMP stable /profile only returns: marketCap, beta, price, lastDividend, range
        // pe/eps/sharesOutstanding/dividendYield are NOT in this endpoint — derive below
        const marketCap = safeNum(profile.marketCap);
        const beta = safeNum(profile.beta);
        const [weekLow52, weekHigh52] = (profile.range ?? '').split('-').map(Number);

        const eps = last.eps; // diluted EPS from most recent income statement
        const liveOrProfilePrice = Number.isFinite(currentPrice) ? currentPrice : safeNum(profile.price);
        const peRatio = Number.isFinite(eps) && eps > 0 ? liveOrProfilePrice / eps : NaN;

        const epsGrowthRate = Number.isFinite(epsCAGR) && epsCAGR > 0 ? epsCAGR * 100 : NaN;
        const pegRatio = Number.isFinite(peRatio) && Number.isFinite(epsGrowthRate) && epsGrowthRate > 0
          ? peRatio / epsGrowthRate : NaN;

        const forwardPE = NaN; // not available on FMP free tier

        // lastDividend is annual dividend in dollars; stored so yield can be recomputed with live price
        const lastDividend = safeNum(profile.lastDividend);
        const dividendYield = Number.isFinite(lastDividend) && lastDividend > 0 && liveOrProfilePrice > 0
          ? lastDividend / liveOrProfilePrice : NaN;

        const scores = calcAllScores(annualData, {
          revenueCAGR, epsCAGR, fcfCAGR,
          avgROIC, avgOperatingMargin, avgFCFMargin,
          intrinsicValue,
          currentPrice: liveOrProfilePrice,
          peRatio,
        });

        const result: StockAnalysis = {
          symbol,
          name: profile.companyName || symbol,
          sector: profile.sector || 'N/A',
          industry: profile.industry || 'N/A',
          description: profile.description || '',
          currentPrice: liveOrProfilePrice,
          marketCap,
          peRatio,
          pegRatio,
          eps,
          beta,
          weekHigh52,
          weekLow52,
          forwardPE,
          dividendYield,
          lastDividend,
          priceChange: quote.change,
          priceChangePct: quote.changePercentage,
          nextEarnings: null,
          annualData,
          revenueCAGR,
          epsCAGR,
          fcfCAGR,
          avgROIC,
          avgOperatingMargin,
          avgFCFMargin,
          intrinsicValue,
          dcfInputs,
          scores,
        };

        setData(result);

        // ── Save to shared DB cache (fire-and-forget) ────────────
        // Fetch next earnings date to know when this data expires.
        // Non-blocking: runs after UI has already updated.
        fetchNextEarnings(symbol).then(nextEarnings => {
          if (!cancelled) setData(prev => prev ? { ...prev, nextEarnings } : prev);
          saveStockCacheDB(symbol, { ...result, nextEarnings }, nextEarnings);
        });

      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) { setLoading(false); setStatus(''); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [symbol, retryKey]);

  return { data, loading, error, status };
}
