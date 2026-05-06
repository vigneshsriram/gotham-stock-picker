import { useState, useEffect } from 'react';
import type { StockAnalysis, AnnualData, DCFInputs } from '../types';
import {
  fetchOverview, fetchIncomeStatement, fetchBalanceSheet, fetchCashFlow, fetchGlobalQuote,
  safeNum
} from '../api/alphaVantage';
import { cagr, mean, calcROIC, calcDCF, calcAllScores } from '../utils/calculations';

export function useStockData(symbol: string, retryKey = 0): { data: StockAnalysis | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        // Sequential calls — AV free tier is 5 req/min; Promise.all bypasses the per-function delays
        const overview = await fetchOverview(symbol);
        const incomeRaw = await fetchIncomeStatement(symbol);
        const balanceRaw = await fetchBalanceSheet(symbol);
        const cashFlowRaw = await fetchCashFlow(symbol);
        const currentPrice = await fetchGlobalQuote(symbol);

        if (cancelled) return;

        const incomeByYear = new Map<string, Record<string, string>>();
        for (const r of incomeRaw.annualReports) {
          incomeByYear.set(r.fiscalDateEnding.slice(0, 4), r);
        }
        const balanceByYear = new Map<string, Record<string, string>>();
        for (const r of balanceRaw.annualReports) {
          balanceByYear.set(r.fiscalDateEnding.slice(0, 4), r);
        }
        const cashByYear = new Map<string, Record<string, string>>();
        for (const r of cashFlowRaw.annualReports) {
          cashByYear.set(r.fiscalDateEnding.slice(0, 4), r);
        }

        const years = incomeRaw.annualReports
          .slice(0, 10)
          .map(r => r.fiscalDateEnding.slice(0, 4));
        const sortedYears = [...years].reverse();

        const annualData: AnnualData[] = [];

        for (const year of sortedYears) {
          const inc = incomeByYear.get(year);
          const bal = balanceByYear.get(year);
          const cf = cashByYear.get(year);

          if (!inc || !bal || !cf) continue;

          const revenue = safeNum(inc.totalRevenue);
          const grossProfit = safeNum(inc.grossProfit);
          const operatingIncome = safeNum(inc.operatingIncome);
          const netIncome = safeNum(inc.netIncome);
          const incomeTax = safeNum(inc.incomeTaxExpense);
          const incomeBeforeTax = safeNum(inc.incomeBeforeTax);

          const depreciation = safeNum(cf.depreciation);
          let ebitda = safeNum(inc.ebitda);
          if (!Number.isFinite(ebitda) || ebitda === 0) {
            ebitda = Number.isFinite(operatingIncome) && Number.isFinite(depreciation)
              ? operatingIncome + depreciation
              : NaN;
          }

          const totalAssets = safeNum(bal.totalAssets);
          const totalEquity = safeNum(bal.totalShareholderEquity);
          const longTermDebt = safeNum(bal.longTermDebt);
          const shortTermDebt = safeNum(bal.currentLongTermDebt);
          const cash = (() => {
            const v1 = safeNum(bal.cashAndCashEquivalentsAtCarryingValue);
            const v2 = safeNum(bal.cashAndShortTermInvestments);
            return Number.isFinite(v1) ? v1 : v2;
          })();
          const currentLiabilities = safeNum(bal.totalCurrentLiabilities);
          const sharesOutstanding = safeNum(bal.commonStockSharesOutstanding);

          const operatingCashFlow = safeNum(cf.operatingCashflow);
          const capEx = Math.abs(safeNum(cf.capitalExpenditures));
          const fcf = Number.isFinite(operatingCashFlow) && Number.isFinite(capEx)
            ? operatingCashFlow - capEx
            : NaN;

          const grossMargin = Number.isFinite(grossProfit) && Number.isFinite(revenue) && revenue !== 0
            ? grossProfit / revenue : NaN;
          const operatingMargin = Number.isFinite(operatingIncome) && Number.isFinite(revenue) && revenue !== 0
            ? operatingIncome / revenue : NaN;
          const netMargin = Number.isFinite(netIncome) && Number.isFinite(revenue) && revenue !== 0
            ? netIncome / revenue : NaN;
          const fcfMargin = Number.isFinite(fcf) && Number.isFinite(revenue) && revenue !== 0
            ? fcf / revenue : NaN;

          const roic = calcROIC({ operatingIncome, incomeTax, incomeBeforeTax, totalAssets, currentLiabilities, cash });

          const netDebt = Number.isFinite(longTermDebt) && Number.isFinite(shortTermDebt) && Number.isFinite(cash)
            ? longTermDebt + shortTermDebt - cash
            : Number.isFinite(longTermDebt) && Number.isFinite(cash)
              ? longTermDebt - cash
              : NaN;

          const debtToEbitda = Number.isFinite(netDebt) && Number.isFinite(ebitda) && ebitda > 0
            ? netDebt / ebitda : NaN;

          const capExPct = Number.isFinite(capEx) && Number.isFinite(revenue) && revenue !== 0
            ? capEx / revenue : NaN;

          const eps = Number.isFinite(netIncome) && Number.isFinite(sharesOutstanding) && sharesOutstanding > 0
            ? netIncome / sharesOutstanding : NaN;

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

        const marketCap = safeNum(overview.MarketCapitalization);
        const peRatio = safeNum(overview.PERatio);
        const pegRatio = safeNum(overview.PEGRatio);
        const eps = safeNum(overview.EPS);
        const beta = safeNum(overview.Beta);
        const weekHigh52 = safeNum(overview['52WeekHigh']);
        const weekLow52 = safeNum(overview['52WeekLow']);
        const forwardPE = safeNum(overview.ForwardPE);
        const dividendYield = safeNum(overview.DividendYield);

        const scores = calcAllScores(annualData, {
          revenueCAGR, epsCAGR, fcfCAGR,
          avgROIC, avgOperatingMargin, avgFCFMargin,
          intrinsicValue,
          currentPrice: Number.isFinite(currentPrice) ? currentPrice : marketCap / latestShares,
          peRatio,
        });

        const result: StockAnalysis = {
          symbol,
          name: overview.Name || symbol,
          sector: overview.Sector || 'N/A',
          industry: overview.Industry || 'N/A',
          description: overview.Description || '',
          currentPrice: Number.isFinite(currentPrice) ? currentPrice : marketCap / last.sharesOutstanding,
          marketCap,
          peRatio,
          pegRatio,
          eps,
          beta,
          weekHigh52,
          weekLow52,
          forwardPE,
          dividendYield,
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
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [symbol, retryKey]);

  return { data, loading, error };
}
